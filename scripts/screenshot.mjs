#!/usr/bin/env node
// Record docs/assets/cover.svg (the start screen) and docs/assets/demo.svg (a query) from a real :sql session: it runs in an isolated tmux server against a
// small SQLite database, the screen is captured with its colors, and the ANSI output is converted to
// SVG. Needs tmux and a build (pnpm build).

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const socket = `sql-term-shot-${process.pid}`;
const COLS = 100;
// A fixed, readable folder: the app shows the database's full path.
const home = path.join(fs.realpathSync(os.tmpdir()), 'sql-term-demo');
fs.rmSync(home, { recursive: true, force: true });
fs.mkdirSync(home);
const dbFile = path.join(home, 'shop.db');

const db = new Database(dbFile);
db.exec(`
  CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, plan TEXT NOT NULL);
  CREATE TABLE orders (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), total REAL NOT NULL, placed_at TEXT NOT NULL);
  INSERT INTO users VALUES (1, 'Ada Lovelace', 'ada@example.com', 'pro'), (2, 'Alan Turing', 'alan@example.com', 'free'),
    (3, 'Grace Hopper', 'grace@example.com', 'team'), (4, 'Edsger Dijkstra', 'edsger@example.com', 'pro');
  INSERT INTO orders VALUES (1, 1, 42.5, '2026-11-02'), (2, 1, 18.0, '2026-11-09'), (3, 3, 120.0, '2026-11-11'), (4, 4, 9.9, '2026-11-15');
`);
db.close();

const tmux = (...args) => execFileSync('tmux', ['-L', socket, '-f', '/dev/null', ...args], { encoding: 'utf8' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(re, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (re.test(tmux('capture-pane', '-p', '-t', 'shot'))) return;
    await sleep(50);
  }
  throw new Error(`timed out waiting for ${re}`);
}

async function type(text) {
  for (const ch of text) {
    tmux('send-keys', '-t', 'shot', '-l', ch);
    await sleep(8);
  }
}

// ── ANSI → SVG ────────────────────────────────────────────────────────────────

const PALETTE16 = ['#000000', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6'];
const BG = '#000000';
const FG = '#c0caf5';

function color256(n) {
  if (n < 8) return PALETTE16[n];
  if (n < 16) return PALETTE16[n - 8];
  if (n >= 232) {
    const v = 8 + (n - 232) * 10;
    return `rgb(${v},${v},${v})`;
  }
  const i = n - 16;
  const steps = [0, 95, 135, 175, 215, 255];
  return `rgb(${steps[Math.floor(i / 36)]},${steps[Math.floor(i / 6) % 6]},${steps[i % 6]})`;
}

const PLAIN = { fg: null, bg: null, bold: false, italic: false, underline: false };

/**
 * Parse one captured line into cells: [{ch, fg, bg, bold, italic, underline}]. tmux writes styles as changes
 * from the previous cell, even across lines, so the style state is carried from line to line.
 */
function parseLine(line, state) {
  const cells = [];
  let st = state.current;
  const re = /\x1b\[([0-9;:]*)m|([\s\S])/gu;
  let m;
  while ((m = re.exec(line))) {
    if (m[2] !== undefined) {
      cells.push({ ch: m[2], ...st });
      if (/[ᄀ-ᅟ⺀-꓏가-힣豈-﫿＀-｠￠-￦]/.test(m[2])) cells.push({ ch: '', ...st });
      continue;
    }
    const p = (m[1] || '0').split(/[;:]/).map(Number);
    for (let i = 0; i < p.length; i++) {
      const c = p[i];
      if (c === 0) st = PLAIN;
      else if (c === 1) st = { ...st, bold: true };
      else if (c === 3) st = { ...st, italic: true };
      else if (c === 4) st = { ...st, underline: true };
      else if (c === 22) st = { ...st, bold: false };
      else if (c === 23) st = { ...st, italic: false };
      else if (c === 24) st = { ...st, underline: false };
      else if (c === 39) st = { ...st, fg: null };
      else if (c === 49) st = { ...st, bg: null };
      else if (c >= 30 && c <= 37) st = { ...st, fg: PALETTE16[c - 30] };
      else if (c >= 90 && c <= 97) st = { ...st, fg: PALETTE16[c - 90] };
      else if (c >= 40 && c <= 47) st = { ...st, bg: PALETTE16[c - 40] };
      else if ((c === 38 || c === 48) && p[i + 1] === 2) {
        const rgb = `rgb(${p[i + 2]},${p[i + 3]},${p[i + 4]})`;
        st = { ...st, [c === 38 ? 'fg' : 'bg']: rgb };
        i += 4;
      } else if ((c === 38 || c === 48) && p[i + 1] === 5) {
        st = { ...st, [c === 38 ? 'fg' : 'bg']: color256(p[i + 2]) };
        i += 2;
      }
    }
  }
  state.current = st;
  return cells;
}

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function toSVG(ansi, title) {
  const state = { current: PLAIN };
  const lines = ansi.replace(/\n+$/, '').split('\n').map((l) => parseLine(l, state));
  while (lines.length && !lines.at(-1).some((c) => c.ch.trim() || c.bg)) lines.pop();
  const cw = 8.43;
  const lh = 19;
  const pad = 18;
  const top = 44;
  const width = Math.ceil(COLS * cw + pad * 2);
  const height = Math.ceil(top + lines.length * lh + pad);
  const out = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(title)}">`,
    `<style>text{font-family:'SF Mono',Menlo,Monaco,'DejaVu Sans Mono',Consolas,monospace;font-size:14px;white-space:pre;fill:${FG}}.b{font-weight:bold}.i{font-style:italic}.u{text-decoration:underline}</style>`,
    `<rect width="${width}" height="${height}" rx="10" fill="${BG}"/>`,
    ...['#ff5f57', '#febc2e', '#28c840'].map((c, i) => `<circle cx="${22 + i * 20}" cy="20" r="6" fill="${c}"/>`),
    `<text x="${width / 2}" y="25" text-anchor="middle" style="fill:#6b6b6b;font-size:12px">${esc(title)}</text>`,
  ];
  lines.forEach((cells, row) => {
    const y = top + row * lh;
    // backgrounds, merged into runs
    for (let i = 0; i < cells.length; ) {
      const bg = cells[i].bg;
      let j = i;
      while (j < cells.length && cells[j].bg === bg) j++;
      if (bg) out.push(`<rect x="${(pad + i * cw).toFixed(1)}" y="${y}" width="${((j - i) * cw + 0.6).toFixed(1)}" height="${lh}" fill="${bg}"/>`);
      i = j;
    }
    // text runs with the same style; each run is placed at its column
    const spans = [];
    for (let i = 0; i < cells.length; ) {
      const c = cells[i];
      let j = i;
      let text = '';
      while (j < cells.length && cells[j].fg === c.fg && cells[j].bold === c.bold && cells[j].italic === c.italic && cells[j].underline === c.underline) {
        text += cells[j].ch;
        j++;
      }
      if (text.trim()) {
        const cls = [c.bold && 'b', c.italic && 'i', c.underline && 'u'].filter(Boolean).join(' ');
        // block characters are drawn as rectangles so the pixel wordmark has no gaps
        if (/^[▀▄█ ]+$/.test(text)) {
          [...text].forEach((ch, k) => {
            const x = (pad + (i + k) * cw).toFixed(1);
            const fill = c.fg ?? FG;
            if (ch === '█') out.push(`<rect x="${x}" y="${y}" width="${(cw + 0.3).toFixed(1)}" height="${lh}" fill="${fill}"/>`);
            if (ch === '▀') out.push(`<rect x="${x}" y="${y}" width="${(cw + 0.3).toFixed(1)}" height="${lh / 2}" fill="${fill}"/>`);
            if (ch === '▄') out.push(`<rect x="${x}" y="${y + lh / 2}" width="${(cw + 0.3).toFixed(1)}" height="${lh / 2}" fill="${fill}"/>`);
          });
        } else {
          spans.push(`<tspan x="${(pad + i * cw).toFixed(1)}"${c.fg ? ` style="fill:${c.fg}"` : ''}${cls ? ` class="${cls}"` : ''}>${esc(text)}</tspan>`);
        }
      }
      i = j;
    }
    if (spans.length) out.push(`<text y="${y + 14}">${spans.join('')}</text>`);
  });
  out.push('</svg>');
  return out.join('\n') + '\n';
}

// ── the session ──────────────────────────────────────────────────────────────

async function main() {
  if (spawnSync('tmux', ['-V']).status !== 0) throw new Error('tmux is needed to record screenshots');
  const entry = path.join(root, 'dist', 'index.js');
  if (!fs.existsSync(entry)) throw new Error('build first: pnpm build');
  const env = ['-e', `HOME=${home}`, '-e', 'COLORTERM=truecolor'];
  const cmd = `/bin/sh -c 'cd "${home}" && "${process.execPath}" "${entry}" -c "sqlite://./shop.db"; sleep 30'`;

  const assets = path.join(root, 'docs', 'assets');
  fs.mkdirSync(assets, { recursive: true });

  // cover: the start screen
  tmux('new-session', '-d', '-s', 'shot', '-x', String(COLS), '-y', '20', ...env, cmd);
  await waitFor(/Type a SQL query/);
  await sleep(500);
  fs.writeFileSync(path.join(assets, 'cover.svg'), toSVG(tmux('capture-pane', '-p', '-e', '-N', '-t', 'shot'), ':sql'));
  tmux('kill-server');

  // demo: a query and its table
  tmux('new-session', '-d', '-s', 'shot', '-x', String(COLS), '-y', '24', ...env, cmd);
  await waitFor(/Type a SQL query/);
  await sleep(300);
  await type('SELECT u.name, u.plan, count(o.id) AS orders, sum(o.total) AS spent FROM users u LEFT JOIN orders o ON o.user_id = u.id GROUP BY u.id ORDER BY spent DESC;');
  tmux('send-keys', '-t', 'shot', 'Enter');
  await waitFor(/Edsger/);
  await sleep(500);
  fs.writeFileSync(path.join(assets, 'demo.svg'), toSVG(tmux('capture-pane', '-p', '-e', '-N', '-t', 'shot'), ':sql — shop.db'));
  tmux('kill-server');
  console.log('wrote docs/assets/cover.svg and docs/assets/demo.svg');
}

main().catch((e) => {
  spawnSync('tmux', ['-L', socket, 'kill-server']);
  console.error(e.message);
  process.exit(1);
});
