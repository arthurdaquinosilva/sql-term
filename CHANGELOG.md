# Changelog

## Unreleased

- **Renamed: querky is now `:sql`** (repository and package `sql-term`). The command is `:sql`, with `sql-term` as a plain alias for scripts and Makefiles. Settings, aliases and history move from `~/.config/querky` to `~/.config/sql-term` automatically on first start (the old folder is kept), passwords saved in the keychain under the old name are still found, and the installer removes the old querky installation. The AI key is read from `SQL_TERM_API_KEY` (the old `QUERKY_API_KEY` and `Q_CLI_API_KEY` still work; the README named one while the code read the other), and the start screen reads `:SQL`.

