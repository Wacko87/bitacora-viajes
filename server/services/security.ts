import crypto from 'node:crypto';

// In-memory failed attempt tracking (locks out for 5 minutes after 5 failed attempts)
interface AttemptRecord {
  count: number;
  lockedUntil?: number;
}
const failedAttempts = new Map<string, AttemptRecord>();

const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

export function hashPin(pin: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(pin, salt, 64).toString('hex');
  return `scrypt:${salt}:${hash}`;
}

export function verifyPin(pin: string, storedHash: string): boolean {
  if (!storedHash) return false;

  // Support legacy plain text PIN during migration
  if (!storedHash.startsWith('scrypt:')) {
    return pin === storedHash;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, hash] = parts;

  try {
    const computed = crypto.scryptSync(pin, salt, 64).toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const compBuf = Buffer.from(computed, 'hex');
    if (hashBuf.length !== compBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, compBuf);
  } catch {
    return false;
  }
}

// Strict UUIDv4 / UUIDv7 check to prevent Path Traversal
const UUID_REGEX = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
const ALPHANUMERIC_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidId(id: string): boolean {
  if (!id || typeof id !== 'string') return false;
  if (id.includes('..') || id.includes('/') || id.includes('\\')) return false;
  return UUID_REGEX.test(id) || ALPHANUMERIC_ID_REGEX.test(id);
}

/**
 * Valida los magic bytes iniciales para asegurar que el buffer es una imagen real
 * (JPEG, PNG, WebP, GIF, HEIC/AVIF) antes de pasarlo a los procesadores Sharp.
 */
export function isValidImageBuffer(buf: Buffer): boolean {
  if (!buf || buf.length < 12) return false;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return true;
  }

  // WebP: RIFF .... WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return true;
  }

  // GIF: GIF87a o GIF89a
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return true;
  }

  // HEIC / AVIF / ISO-BMFF: ftyp box at bytes 4-7
  if (
    buf[4] === 0x66 &&
    buf[5] === 0x74 &&
    buf[6] === 0x79 &&
    buf[7] === 0x70
  ) {
    return true;
  }

  return false;
}

// Rate limiting & Account Lockout
export function checkAccountLockout(profileId: string): { locked: boolean; remainingSec: number } {
  const record = failedAttempts.get(profileId);
  if (!record || !record.lockedUntil) {
    return { locked: false, remainingSec: 0 };
  }

  const now = Date.now();
  if (now < record.lockedUntil) {
    const remainingSec = Math.ceil((record.lockedUntil - now) / 1000);
    return { locked: true, remainingSec };
  }

  // Lockout expired
  failedAttempts.delete(profileId);
  return { locked: false, remainingSec: 0 };
}

export function recordFailedAttempt(profileId: string): { locked: boolean; remainingAttempts: number; remainingSec: number } {
  const now = Date.now();
  const record = failedAttempts.get(profileId) || { count: 0 };

  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_DURATION_MS;
    failedAttempts.set(profileId, record);
    return { locked: true, remainingAttempts: 0, remainingSec: Math.ceil(LOCKOUT_DURATION_MS / 1000) };
  }

  failedAttempts.set(profileId, record);
  return { locked: false, remainingAttempts: MAX_FAILED_ATTEMPTS - record.count, remainingSec: 0 };
}

export function resetFailedAttempts(profileId: string): void {
  failedAttempts.delete(profileId);
}
