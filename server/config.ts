import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

export const PORT = Number(process.env.PORT || 3040);
export const HOST = process.env.HOST || '0.0.0.0';
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const IS_PROD = NODE_ENV === 'production';

// Persisted data directory
export const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'data');
export const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');

// Ensure storage directories exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Returns the environment SESSION_SECRET or loads/generates a cryptographically
 * secure 256-bit random key persisted in DATA_DIR to prevent signature forgery.
 */
function getOrGenerateSessionSecret(): string {
  if (
    process.env.SESSION_SECRET &&
    process.env.SESSION_SECRET !== 'bitacora-super-secret-key-32-chars-minimum!' &&
    process.env.SESSION_SECRET.length >= 32
  ) {
    return process.env.SESSION_SECRET;
  }

  const secretFile = path.join(DATA_DIR, 'session_secret.key');
  try {
    if (fs.existsSync(secretFile)) {
      const saved = fs.readFileSync(secretFile, 'utf8').trim();
      if (saved.length >= 32) return saved;
    }

    const generated = crypto.randomBytes(32).toString('hex');
    fs.writeFileSync(secretFile, generated, { encoding: 'utf8', mode: 0o600 });
    return generated;
  } catch (err) {
    // Si no se puede persistir el archivo en disco, generar clave criptográfica efímera en memoria
    // NUNCA utilizar una clave estática predecible o hardcodeada (CWE-798 / SEC-05)
    console.warn('[Config] ADVERTENCIA: No se pudo persistir session_secret.key en disco. Generando secreto efímero en memoria:', err);
    return crypto.randomBytes(32).toString('hex');
  }
}

export const SESSION_SECRET = getOrGenerateSessionSecret();
export const TRUST_PROXY = process.env.TRUST_PROXY || '127.0.0.1,172.16.0.0/12,192.168.0.0/16';
