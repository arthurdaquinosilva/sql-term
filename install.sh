#!/bin/sh
# Installs :sql straight from GitHub — no npm registry package involved:
#
#   curl -fsSL https://raw.githubusercontent.com/arthurdaquinosilva/sql-term/main/install.sh | sh
#
# Environment overrides:
#   SQL_TERM_VERSION   branch or tag to install (default: main), e.g. SQL_TERM_VERSION=v0.5.0
#   SQL_TERM_HOME      where the source lives   (default: ~/.local/lib/sql-term)
#   SQL_TERM_BIN_DIR   where the command goes   (default: ~/.local/bin)
#
# Pass --uninstall to remove it:  curl -fsSL .../install.sh | sh -s -- --uninstall
#
# :sql is built from source with pnpm (the one on PATH, else through corepack or npx). The
# launcher uses `#!/usr/bin/env node`, so it runs on whichever Node is on PATH (22 or newer).

set -eu

REPO="arthurdaquinosilva/sql-term"
VERSION="${SQL_TERM_VERSION:-main}"
HOME_DIR="${SQL_TERM_HOME:-$HOME/.local/lib/sql-term}"
BIN_DIR="${SQL_TERM_BIN_DIR:-$HOME/.local/bin}"
COMMANDS=":sql sql-term"
MIN_NODE="22.0"

say() { printf '%s\n' "$*"; }
err() { printf ':sql install: %s\n' "$*" >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

# Succeeds when version $1 >= version $2 (major.minor only).
version_ge() {
  a_major=${1%%.*}; a_rest=${1#*.}; a_minor=${a_rest%%.*}
  b_major=${2%%.*}; b_minor=${2#*.}
  [ "$a_major" -gt "$b_major" ] || { [ "$a_major" -eq "$b_major" ] && [ "$a_minor" -ge "$b_minor" ]; }
}

uninstall() {
  for cmd in $COMMANDS; do rm -f "$BIN_DIR/$cmd"; done
  rm -rf "$HOME_DIR"
  say "Removed :sql ($HOME_DIR and its commands in $BIN_DIR)."
  say "Your settings, history and aliases (~/.config/sql-term) were left in place."
}

download() {
  if has curl; then curl -fsSL "$1"
  elif has wget; then wget -qO- "$1"
  else err "needs curl or wget to download :sql"
  fi
}

pnpm_run() {
  if has pnpm; then pnpm "$@"
  elif has corepack; then corepack pnpm "$@"
  else npx --yes pnpm@11 "$@"
  fi
}

# :sql used to be called querky: remove that installation, keep its settings (:sql copies them over).
remove_old_install() {
  old_home="$HOME/.local/lib/querky"
  if [ -L "$BIN_DIR/querky" ] && [ "$(readlink "$BIN_DIR/querky")" = "$old_home/dist/index.js" ]; then
    rm -f "$BIN_DIR/querky"
  fi
  if [ -d "$old_home" ]; then
    rm -rf "$old_home"
    say "Removed the old querky installation ($old_home)."
  fi
  if has querky; then
    say "Note: an older querky is still on PATH ($(command -v querky)); if it came from npm: npm uninstall -g @deaquinodev/querky"
  fi
}

main() {
  if [ "${1:-}" = "--uninstall" ]; then uninstall; return; fi

  has node || err "Node.js $MIN_NODE or newer is required (https://nodejs.org or nvm)"
  has pnpm || has corepack || has npx || err "pnpm (or corepack/npx to fetch it) is required to build :sql"
  has tar || err "tar is required"
  node_version=$(node -p 'process.versions.node')
  version_ge "$node_version" "$MIN_NODE" || err "Node $node_version is too old; :sql needs $MIN_NODE or newer"

  case "$VERSION" in
    v[0-9]*) ref="refs/tags/$VERSION" ;;
    *) ref="refs/heads/$VERSION" ;;
  esac
  url="https://github.com/$REPO/archive/$ref.tar.gz"

  tmp=$(mktemp -d)
  trap 'rm -rf "$tmp"' EXIT INT TERM

  say "Downloading :sql ($VERSION)..."
  download "$url" | tar -xz -C "$tmp" --strip-components=1 || err "could not download $url"
  [ -f "$tmp/tsup.config.ts" ] || err "the download does not look like :sql ($url)"

  say "Installing dependencies and building..."
  (cd "$tmp" && pnpm_run install --frozen-lockfile --reporter=silent >/dev/null) ||
    err "pnpm could not install :sql's dependencies"
  (cd "$tmp" && pnpm_run build >/dev/null) || err ":sql did not build"
  (cd "$tmp" && pnpm_run prune --prod --reporter=silent >/dev/null 2>&1) || true

  # Swap the new copy in only once it is complete, so a failed update leaves the old one working.
  mkdir -p "$(dirname "$HOME_DIR")" "$BIN_DIR"
  rm -rf "$HOME_DIR.old"
  [ -d "$HOME_DIR" ] && mv "$HOME_DIR" "$HOME_DIR.old"
  mv "$tmp" "$HOME_DIR"
  rm -rf "$HOME_DIR.old"
  trap - EXIT INT TERM
  chmod +x "$HOME_DIR/dist/index.js"
  for cmd in $COMMANDS; do ln -sf "$HOME_DIR/dist/index.js" "$BIN_DIR/$cmd"; done
  remove_old_install

  installed=$(node -p "require('$HOME_DIR/package.json').version")
  say "Installed :sql $installed to $BIN_DIR/:sql"

  case ":$PATH:" in
    *":$BIN_DIR:"*)
      found=$(command -v :sql)
      [ "$found" = "$BIN_DIR/:sql" ] ||
        say "Note: another :sql comes first on PATH ($found); remove it, or put $BIN_DIR earlier on PATH."
      ;;
    *)
      say ""
      say "$BIN_DIR is not on your PATH. Add it to your shell profile (~/.zshrc or ~/.bashrc):"
      say "  export PATH=\"$BIN_DIR:\$PATH\""
      ;;
  esac
  say "Run ':sql' to start. Re-run this installer to update."
}

main "$@"
