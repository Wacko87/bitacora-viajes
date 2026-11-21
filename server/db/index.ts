import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { DATA_DIR } from '../config.ts';

const DB_PATH = path.join(DATA_DIR, 'bitacora.db');
console.log(`[Database] Initializing SQLite WAL at: ${DB_PATH}`);

export const db = new DatabaseSync(DB_PATH);

// High-performance Pragmas tuned for NVMe/SSD homelab & WAL mode
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  PRAGMA synchronous = NORMAL;
  PRAGMA temp_store = MEMORY;
  PRAGMA cache_size = -4000;
  PRAGMA wal_autocheckpoint = 500;
`);

export function closeDb() {
  try {
    console.log('[Database] Performing WAL truncate checkpoint before shutdown...');
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    db.close();
    console.log('[Database] SQLite closed cleanly.');
  } catch (err) {
    console.error('[Database] Error closing SQLite:', err);
  }
}
