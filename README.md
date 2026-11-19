# :sql

<img src="https://raw.githubusercontent.com/arthurdaquinosilva/sql-term/main/docs/assets/cover.svg?sanitize=true" alt=":sql's start screen: the pixel :SQL wordmark, version and connection info, the input between two rules and the footer" width="820">

<img src="https://raw.githubusercontent.com/arthurdaquinosilva/sql-term/main/docs/assets/demo.svg?sanitize=true" alt=":sql running a query against SQLite: a join with GROUP BY and its result table" width="820">

A terminal SQL client with vim keybindings, schema-aware autocomplete, query aliases, and AI-powered query explanation.

## Features

- **Beautiful tables** — clean, aligned output with automatic expanded mode for wide results
- **Vim mode** — modelled on Claude Code's: counts, motions, operators with text objects, visual mode, undo and `.` repeat
- **Query history** — persisted across sessions, navigate with ↑↓, search with Ctrl+R
- **ER diagrams** — `/erd` draws your schema with crow's-foot relationship lines, right in the terminal
- **AI explanation** — explain any SQL query in plain English via Groq or Ollama
- **Slash commands** — with Tab autocomplete and ↑↓ suggestion navigation
- **Responsive layout** — auto-switches to vertical key=value mode when the table is wider than the terminal
- **Connection wizard** — interactive form on startup if no connection string is provided
- **Multiple drivers** — PostgreSQL, MySQL, and SQLite
- **Credential storage** — passwords saved to OS keychain automatically
- **Schema-aware autocomplete** — Tab-completes table names, column names, and SQL keywords based on context
- **Query aliases** — save queries under short names, scoped per database, with positional and named parameters
- **Pagination** — navigate large result sets with `/next` and `/prev`
- **Export** — save results to CSV or JSON

---

## Requirements

- Node.js 22+
- pnpm (or corepack, which ships with Node, to fetch it)

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/arthurdaquinosilva/sql-term/main/install.sh | sh
```

That downloads :sql from GitHub into `~/.local/lib/sql-term`, builds it, and links the `:sql` command in `~/.local/bin`. To update, run the installer again. Other options:

```bash
curl -fsSL .../install.sh | SQL_TERM_VERSION=v0.5.0 sh      # a specific tag or branch
curl -fsSL .../install.sh | sh -s -- --uninstall          # remove it (settings, history and aliases are kept)
```

:sql isn't on npm; GitHub is the only place it's published.

### Install from source

```bash
git clone https://github.com/arthurdaquinosilva/sql-term.git
cd sql-term
pnpm install
pnpm build
pnpm install -g .
```

---

## Connecting

### With a connection string

```bash
# PostgreSQL
:sql --connection postgresql://user:pass@localhost/mydb
:sql -c postgresql://user:pass@localhost/mydb

# MySQL
:sql -c mysql://user:pass@localhost/mydb

# SQLite
:sql -c sqlite:///path/to/database.db
```

### With the interactive wizard

Run `:sql` with no arguments and fill in the form:

```bash
:sql
```

Use **Tab** or **↑↓** to move between fields, **←→** to cycle the driver, **Enter** to connect. Passwords are saved to the OS keychain after a successful connection and pre-filled on the next run.

---

## AI Setup

:sql can explain your queries using any OpenAI-compatible API.

### Groq (recommended — fast and free)

1. Get a free API key at [console.groq.com](https://console.groq.com)
2. Set the key in your shell:

```bash
# Add to ~/.zshrc or ~/.bashrc
export SQL_TERM_API_KEY=gsk_...
```

3. Connect with Groq:

```bash
:sql -c postgresql://... \
  --ai-url https://api.groq.com/openai/v1 \
  --ai-model llama-3.1-8b-instant
```

### Ollama (local, offline)

```bash
ollama pull llama3.2
ollama serve
```

```bash
:sql -c postgresql://... --ai-model llama3.2
```

Ollama is the default endpoint (`http://localhost:11434/v1`).

---

## Slash Commands

| Command | Description |
|---|---|
| `/explain <SQL>` | Explain a SQL query in plain English |
| `/explain-previous` | Explain the last query you ran |
| `/databases` | List available databases |
| `/tables` | List tables in the current database |
| `/describe <table>` | Show columns, types, and key constraints for a table |
| `/erd [table]` | Draw an entity-relationship diagram (only `table` and its neighbours when given) |
| `/export csv` | Export last result to a CSV file |
| `/export json` | Export last result to a JSON file |
| `/next` | Next page of results |
| `/prev` | Previous page of results |
| `/clear` | Clear the screen and scrollback |
| `/toggle-vim-mode` | Toggle vim keybindings on/off |
| `/save <name>` | Save the last query as an alias |
| `/alias <name> <SQL>` | Define an alias inline |
| `/aliases` | List all aliases for the current database |
| `/unalias <name>` | Remove a saved alias |

Type `/` and use **Tab** or **↑↓** to navigate and complete commands.

---

## Schema-aware Autocomplete

:sql fetches your schema on connect and completes as you type. Press **Tab** to cycle through suggestions, **Enter** to accept.

| Context | Completes |
|---|---|
| After `FROM`, `JOIN`, `INTO` | Table names |
| After `SELECT`, `WHERE`, `ON` | Column names + tables |
| After `table.` | Columns for that specific table |
| Anywhere else | SQL keywords + tables + columns |

Works with PostgreSQL, MySQL, and SQLite. Suggestions appear after 1 character.

---

## Query Aliases

Save any query under a short name, scoped to the current database.

```bash
# Save the last executed query
/save get_all_users

# Or define one inline
/alias get_user SELECT * FROM users WHERE id = $1
/alias add_user INSERT INTO users(name, email) VALUES (:name, :email)
```

Then invoke them like any other command:

```bash
/get_all_users
/get_user 42
/add_user name="Alice" email="alice@example.com"
```

**Positional params** use `$1, $2, …` — pass values in order.
**Named params** use `:param` — pass `key=value` pairs (quote values with spaces).

Aliases are stored in `~/.config/sql-term/aliases.json` and are Tab-completable.

---

## psql Aliases

Users coming from `psql` can use familiar meta-commands:

| Command | Equivalent |
|---|---|
| `\l` | List databases |
| `\d` or `\dt` | List tables |
| `\d <table>` | Show columns for a table |
| `\du` | List users |
| `\c` | Show current database |
| `\c <dbname>` | Switch to a different database |

---

## Vim Mode

:sql starts in INSERT mode; the footer under the prompt shows `-- INSERT --`. Press `Escape` for NORMAL mode. The bindings follow Claude Code's vim mode.

| Keys | Action |
|---|---|
| `i` `a` `I` `A` `o` `O` | Enter INSERT mode |
| `h` `j` `k` `l` · `w` `e` `b` · `0` `^` `$` · `gg` `G` | Move (with counts: `3w`, `2j`) |
| `f` `F` `t` `T` + char · `;` `,` | Find a character on the line, repeat |
| `d` `c` `y` + motion · `dd` `cc` `yy` · `D` `C` `Y` | Delete / change / yank |
| `iw` `aw` `i"` `a'` `i(` `a[` `i{` … | Text objects (`diw`, `ci"`, `ya(`) |
| `x` `X` `r` `s` `S` `~` `J` `>>` `<<` | Edit characters and lines |
| `p` `P` | Paste after / before |
| `v` `V` | Visual / visual line mode |
| `u` · `Ctrl+R` · `.` | Undo · redo · repeat the last change |
| `/` | Search history (like Ctrl+R) |

`j`/`k` (and ↑↓) move between lines and step through history at the first and last line. **Ctrl+R** searches history, **Ctrl+G** opens the input in `$EDITOR`, and `\` + Enter, Shift+Enter or Option+Enter add a new line. Press `?` on an empty prompt to see the shortcuts.

To leave INSERT mode with `jj` (or another two-key sequence), add to `~/.config/sql-term/settings.json`:

```json
{ "vimInsertModeRemaps": { "jj": "<Esc>" } }
```

Disable vim mode with `/toggle-vim-mode`.

---

## Shell Mode

Prefix any command with `!` to run it in your shell without leaving :sql:

```
! ls -la
! pg_dump mydb > backup.sql
! cat results.csv | wc -l
```

Output appears inline. ANSI colors and pipes are preserved.

---

## All Flags

| Flag | Default | Description |
|---|---|---|
| `--connection`, `-c` | — | Connection string (optional — wizard shown if omitted) |
| `--ai-url` | `http://localhost:11434/v1` | OpenAI-compatible API base URL |
| `--ai-model` | `llama3.2` | Model name |
| `--api-key` | `$SQL_TERM_API_KEY` | API key for remote endpoints |

---

## Development

```bash
pnpm dev --connection postgresql://user:pass@localhost/mydb
pnpm test
pnpm lint
pnpm build
```
