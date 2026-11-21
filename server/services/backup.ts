import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.ts';
import { DATA_DIR } from '../config.ts';

const BACKUP_DIR = path.join(DATA_DIR, 'backups');
const MAX_BACKUPS_TO_KEEP = 7;
const BACKUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface BackupInfo {
  filename: string;
  sizeBytes: number;
  createdAt: string;
}

export function ensureBackupDir(): string {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true, mode: 0o700 });
  }
  return BACKUP_DIR;
}

/**
 * Creates an atomic, non-blocking hot backup of the SQLite database
 * using SQLite's native VACUUM INTO command.
 */
export async function createDatabaseBackup(tag = 'auto'): Promise<BackupInfo> {
  const dir = ensureBackupDir();
  const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `bitacora_${tag}_${dateStr}.db`;
  const targetPath = path.join(dir, filename);

  // Escaping single quotes for SQL safety
  const sanitizedPath = targetPath.replace(/'/g, "''");
  
  // Execute atomic VACUUM INTO
  db.exec(`VACUUM INTO '${sanitizedPath}';`);

  const stat = fs.statSync(targetPath);

  // Prune older backups if exceeding retention count
  await pruneOldBackups();

  return {
    filename,
    sizeBytes: stat.size,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Lists all existing database snapshots sorted by newest first.
 */
export function listDatabaseBackups(): BackupInfo[] {
  const dir = ensureBackupDir();
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.db'));

  const list: BackupInfo[] = files.map((filename) => {
    const fullPath = path.join(dir, filename);
    const stat = fs.statSync(fullPath);
    return {
      filename,
      sizeBytes: stat.size,
      createdAt: stat.mtime.toISOString(),
    };
  });

  return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

/**
 * Retains only the last MAX_BACKUPS_TO_KEEP backups.
 */
export async function pruneOldBackups(): Promise<number> {
  const backups = listDatabaseBackups();
  let prunedCount = 0;

  if (backups.length > MAX_BACKUPS_TO_KEEP) {
    const toRemove = backups.slice(MAX_BACKUPS_TO_KEEP);
    for (const b of toRemove) {
      try {
        fs.unlinkSync(path.join(BACKUP_DIR, b.filename));
        prunedCount++;
      } catch (err) {
        console.warn(`[Backup] Error removing old backup ${b.filename}:`, err);
      }
    }
  }

  return prunedCount;
}

/**
 * Starts automatic 24-hour backup timer.
 */
export function initAutomatedBackups(): void {
  ensureBackupDir();

  const backups = listDatabaseBackups();
  const now = Date.now();
  const shouldRunInitial =
    backups.length === 0 ||
    now - new Date(backups[0].createdAt).getTime() > BACKUP_INTERVAL_MS;

  if (shouldRunInitial) {
    createDatabaseBackup('startup')
      .then((b) => console.log(`[Backup] Hot snapshot created: ${b.filename} (${(b.sizeBytes / 1024).toFixed(1)} KB)`))
      .catch((err) => console.error('[Backup] Startup backup failed:', err));
  }

  setInterval(() => {
    createDatabaseBackup('daily')
      .then((b) => console.log(`[Backup] Daily hot snapshot created: ${b.filename}`))
      .catch((err) => console.error('[Backup] Daily backup failed:', err));
  }, BACKUP_INTERVAL_MS);
}
