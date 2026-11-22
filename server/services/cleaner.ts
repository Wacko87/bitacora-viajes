import fs from 'node:fs';
import path from 'node:path';
import { db } from '../db/index.ts';
import { UPLOADS_DIR } from '../config.ts';

export interface MaintenanceReport {
  purgedPhotosCount: number;
  purgedArtifactsCount: number;
  purgedTripsCount: number;
  freedBytesEstimate: number;
  executedAt: string;
}

/**
 * Safely removes a file from disk if it exists.
 */
function safeDeleteFile(relativePathOrUrl: string): number {
  if (!relativePathOrUrl || !relativePathOrUrl.startsWith('/uploads/')) return 0;
  try {
    const cleanRelative = decodeURIComponent(relativePathOrUrl.replace('/uploads/', ''));
    const fullPath = path.resolve(UPLOADS_DIR, cleanRelative);

    // Assert strictly inside uploads dir
    if (!fullPath.startsWith(path.resolve(UPLOADS_DIR))) return 0;

    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      fs.unlinkSync(fullPath);
      return stat.size;
    }
  } catch (err) {
    console.warn(`[Cleaner] Could not remove file ${relativePathOrUrl}:`, err);
  }
  return 0;
}

/**
 * Safely removes a directory and its contents recursively.
 */
function safeDeleteDirectory(fullDir: string): number {
  let freed = 0;
  try {
    if (!fullDir.startsWith(path.resolve(UPLOADS_DIR))) return 0;
    if (fs.existsSync(fullDir)) {
      const files = fs.readdirSync(fullDir);
      for (const f of files) {
        const p = path.join(fullDir, f);
        const stat = fs.statSync(p);
        if (stat.isDirectory()) {
          freed += safeDeleteDirectory(p);
        } else {
          fs.unlinkSync(p);
          freed += stat.size;
        }
      }
      fs.rmdirSync(fullDir);
    }
  } catch (err) {
    console.warn(`[Cleaner] Could not remove directory ${fullDir}:`, err);
  }
  return freed;
}

/**
 * Runs garbage collection to purge physical files and database rows
 * for items soft-deleted more than `retentionDays` ago (default 30 days).
 */
export async function runGarbageCollection(retentionDays = 30): Promise<MaintenanceReport> {
  // Asegurar rango seguro (1 a 365 días) para prevenir ejecuciones destructivas
  const safeDays = Math.max(1, Math.min(365, Math.floor(Number(retentionDays) || 30)));
  const cutoffSql = `-${safeDays} days`;
  let freedBytes = 0;

  // 1. Purge Old Soft-deleted Photos
  const oldPhotosStmt = db.prepare(`
    SELECT id, image_url, medium_url, thumb_url 
    FROM trip_photos 
    WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)
  `);
  const oldPhotos = oldPhotosStmt.all(cutoffSql) as Array<{
    id: string;
    image_url: string;
    medium_url?: string;
    thumb_url?: string;
  }>;

  for (const p of oldPhotos) {
    if (p.image_url) freedBytes += safeDeleteFile(p.image_url);
    if (p.medium_url) freedBytes += safeDeleteFile(p.medium_url);
    if (p.thumb_url) freedBytes += safeDeleteFile(p.thumb_url);
  }

  const deletePhotosStmt = db.prepare(`
    DELETE FROM trip_photos 
    WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)
  `);
  deletePhotosStmt.run(cutoffSql);

  // 2. Purge Old Soft-deleted Artifacts
  const oldArtifactsStmt = db.prepare(`
    SELECT id, image_front, image_back 
    FROM artifacts 
    WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)
  `);
  const oldArtifacts = oldArtifactsStmt.all(cutoffSql) as Array<{
    id: string;
    image_front?: string;
    image_back?: string;
  }>;

  for (const a of oldArtifacts) {
    const artifactFolder = path.join(UPLOADS_DIR, a.id);
    freedBytes += safeDeleteDirectory(artifactFolder);
  }

  const deleteArtifactsStmt = db.prepare(`
    DELETE FROM artifacts 
    WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)
  `);
  deleteArtifactsStmt.run(cutoffSql);

  // 3. Purge Old Soft-deleted Trips
  const oldTripsStmt = db.prepare(`
    SELECT id 
    FROM trips 
    WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)
  `);
  const oldTrips = oldTripsStmt.all(cutoffSql) as Array<{ id: string }>;

  for (const t of oldTrips) {
    const tripFolder = path.join(UPLOADS_DIR, 'trips', t.id);
    freedBytes += safeDeleteDirectory(tripFolder);
  }

  const deleteTripsStmt = db.prepare(`
    DELETE FROM trips 
    WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', ?)
  `);
  deleteTripsStmt.run(cutoffSql);

  return {
    purgedPhotosCount: oldPhotos.length,
    purgedArtifactsCount: oldArtifacts.length,
    purgedTripsCount: oldTrips.length,
    freedBytesEstimate: freedBytes,
    executedAt: new Date().toISOString(),
  };
}
