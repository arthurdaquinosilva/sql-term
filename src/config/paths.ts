import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

/** Where :sql keeps its settings, aliases and history. */
export const CONFIG_DIR = join(homedir(), '.config', 'sql-term');

// :sql used to be called querky: copy its folder over once, unless the new one already has something
// in it. The old folder is left alone.
function migrate(oldDir: string, newDir: string): void {
  try {
    if (!statSync(oldDir).isDirectory()) return;
    if (existsSync(newDir) && readdirSync(newDir).length) return;
    cpSync(oldDir, newDir, { recursive: true, verbatimSymlinks: true });
  } catch {
    // nothing to migrate, or it can't be read: start fresh
  }
}

migrate(join(homedir(), '.config', 'querky'), CONFIG_DIR);
