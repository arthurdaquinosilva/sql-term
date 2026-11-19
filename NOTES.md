# querky — notes for later

Snapshot from 2026-11-18 (v0.5.0). This is a working list toward a "production grade" 1.0, most important first.

## State

- A TypeScript, Ink and React terminal SQL client (PostgreSQL, MySQL, SQLite) with vim mode, ERD, aliases and AI query explanation (Groq or Ollama). The longest history in the family (120 commits). About 5,600 lines in `src/` and about 550 lines of tests (vitest, 5 test files).
- It has ESLint, Prettier and a strict TypeScript config, the most tooling of the family. But **there's no CI at all** (no `.github/` directory).
- **No CHANGELOG.md**, unlike its siblings.
- Install: `install.sh` downloads from GitHub and builds with pnpm. Native modules (`better-sqlite3`, `keytar`) compile at install time, which is the main source of install failures.
- Tests weren't run in this review (no `node_modules` locally). Run `pnpm install && pnpm test && pnpm lint` to get a baseline.

## 1. Basics the siblings already have

- [ ] **CI**: GitHub Actions on Ubuntu and macOS with Node 22 and 24: `pnpm install --frozen-lockfile`, `pnpm lint`, `tsc --noEmit`, `pnpm test`, `pnpm build`, plus `sh -n install.sh` and shellcheck.
- [ ] **CHANGELOG.md**, rebuilt from the git history (the conventional commits make that easy).
- [ ] `package.json` is still named `@deaquinodev/querky` (from the npm days) and has empty `keywords`. Rename it to plain `querky` (or `querky-sql`), and add `repository`, `homepage`, `bugs` and `engines` (`node >= 22`).
- [ ] Docs from the framework template are unfilled: `docs/deployment.md`, `docs/decisions.md` and `docs/test-plan.md` are still template comments. Fill them in or delete them. Add user-facing `docs/features.md` and `docs/configuration.md` like the other tools, and `docs/releasing.md`.
- [ ] Check that `AGENTS.md` and `CLAUDE.md` still match the code.

## 2. Security (it handles database credentials and talks to AI APIs)

- [ ] **keytar is archived and no longer maintained**, and failures are skipped silently (`src/config/keychain.ts`: "keytar unavailable — silently skip"). Replace it with a maintained option (for example `@napi-rs/keyring`), and **tell the user** when a password couldn't be stored securely instead of quietly not saving it.
- [ ] Check that connection strings containing passwords never reach history files, aliases, logs or error messages. Redact them.
- [ ] AI features: make it explicit what is sent to Groq (the query text? schema? result rows?). Require opt-in before the first remote call, and keep Ollama (local) clearly separate. Document this in the README and SECURITY.md.
- [ ] Guard against destructive statements: confirm before `DROP`, `TRUNCATE`, or `DELETE` / `UPDATE` without a `WHERE`. Add a read-only connection mode.

## 3. Tests

- [ ] About 10% test-to-source ratio. Add integration tests against real databases: SQLite in-process, and Postgres and MySQL as CI service containers. Cover the query client, schema introspection, pagination and export.
- [ ] Component tests for the Ink UI with `ink-testing-library`.
- [ ] Coverage with a threshold in `vitest.config.ts`.

## 4. Robustness

- [ ] Long-running queries: cancel with Ctrl+C (`pg_cancel_backend` / `KILL QUERY`), stream big result sets, never load millions of rows into memory.
- [ ] Reconnect on a dropped connection. Clear errors for SSL/TLS settings (`sslmode`), SSH tunnels (or document them as unsupported).
- [ ] Add `--debug` logging (redacted) and `querky --doctor` (Node version, native modules loaded, keychain available, drivers).

## 5. Releases and distribution

- [ ] Prebuilt release tarballs (built `dist/` plus a lockfile) attached to GitHub releases, so installs don't need pnpm and a compiler. Better still, look at a single-file binary (Node SEA or bun compile), though the native modules make this harder.
- [ ] `install.sh` should default to the latest tag, with checksums.
- [ ] Add Dependabot for pnpm and Actions.

## 6. Project hygiene

- [ ] Add CONTRIBUTING.md, SECURITY.md, issue and PR templates. Move `querky-cover.png` into `docs/assets/` as the siblings do.

## Shared with the family

querky's look (ruled input, one-line footer, `⎿` output) was adopted by ember, shtick and flare, and the pitch palette is copied into every repo. Keep a written spec of the shared UI conventions somewhere so the projects don't drift apart.
