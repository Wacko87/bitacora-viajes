import sharp from 'sharp';
import path from 'node:path';
import fs from 'node:fs/promises';
import { UPLOADS_DIR } from '../config.ts';
import { isValidId } from './security.ts';

// Limit sharp internal concurrency to 1 to protect Homelab Docker memory
sharp.concurrency(1);

export interface ProcessedImageResult {
  displayUrl: string;
  thumbUrl: string;
  mediumUrl?: string;
}

export async function processArtifactImage(
  artifactId: string,
  side: 'front' | 'back',
  imageBuffer: Buffer
): Promise<ProcessedImageResult> {
  // Security: prevent Path Traversal
  if (!isValidId(artifactId)) {
    throw new Error('Invalid artifact identifier');
  }

  const safeUploadsRoot = path.resolve(UPLOADS_DIR);
  const artifactDir = path.resolve(safeUploadsRoot, artifactId);

  // Assert target dir is strictly inside UPLOADS_DIR
  if (!artifactDir.startsWith(safeUploadsRoot)) {
    throw new Error('Path traversal detected');
  }

  await fs.mkdir(artifactDir, { recursive: true });

  const displayFilename = `${side}_display.webp`;
  const thumbFilename = `${side}_thumb.webp`;

  const displayPath = path.join(artifactDir, displayFilename);
  const thumbPath = path.join(artifactDir, thumbFilename);

  // 1. Generate Display Image (Max 1200px, WebP quality 82)
  await sharp(imageBuffer)
    .rotate() // Auto-orient from EXIF
    .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toFile(displayPath);

  // 2. Generate Thumbnail (Max 240px, WebP quality 80)
  await sharp(imageBuffer)
    .rotate()
    .resize(240, 240, { fit: 'cover' })
    .webp({ quality: 80, effort: 3 })
    .toFile(thumbPath);

  return {
    displayUrl: `/uploads/${encodeURIComponent(artifactId)}/${displayFilename}`,
    thumbUrl: `/uploads/${encodeURIComponent(artifactId)}/${thumbFilename}`,
  };
}

export async function processTripPhoto(
  tripId: string,
  photoId: string,
  imageBuffer: Buffer
): Promise<ProcessedImageResult> {
  if (!isValidId(tripId) || !isValidId(photoId)) {
    throw new Error('Invalid identifier');
  }

  const safeUploadsRoot = path.resolve(UPLOADS_DIR);
  const photosDir = path.resolve(safeUploadsRoot, 'trips', tripId, 'photos');

  if (!photosDir.startsWith(safeUploadsRoot)) {
    throw new Error('Path traversal detected');
  }

  await fs.mkdir(photosDir, { recursive: true });

  const displayFilename = `${photoId}_display.webp`;
  const mediumFilename = `${photoId}_medium.webp`;
  const thumbFilename = `${photoId}_thumb.webp`;

  const displayPath = path.join(photosDir, displayFilename);
  const mediumPath = path.join(photosDir, mediumFilename);
  const thumbPath = path.join(photosDir, thumbFilename);

  // 1. Generate High-res Display Image (Max 1600px, WebP quality 84)
  await sharp(imageBuffer)
    .rotate() // Auto-orient from EXIF orientation
    .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toFile(displayPath);

  // 2. Generate Medium Mobile Image (Max 800px, WebP quality 82)
  await sharp(imageBuffer)
    .rotate()
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 3 })
    .toFile(mediumPath);

  // 3. Generate Grid Thumbnail (Max 400px, WebP quality 80)
  await sharp(imageBuffer)
    .rotate()
    .resize(400, 400, { fit: 'cover' })
    .webp({ quality: 80, effort: 3 })
    .toFile(thumbPath);

  return {
    displayUrl: `/uploads/trips/${encodeURIComponent(tripId)}/photos/${displayFilename}`,
    mediumUrl: `/uploads/trips/${encodeURIComponent(tripId)}/photos/${mediumFilename}`,
    thumbUrl: `/uploads/trips/${encodeURIComponent(tripId)}/photos/${thumbFilename}`,
  };
}
