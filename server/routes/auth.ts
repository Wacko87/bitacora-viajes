import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.ts';
import {
  hashPin,
  verifyPin,
  checkAccountLockout,
  recordFailedAttempt,
  resetFailedAttempts,
} from '../services/security.ts';

interface ProfileRow {
  id: string;
  name: string;
  role: string;
  pin_code: string;
  avatar_color: string;
  created_at: string;
}

export async function authRoutes(fastify: FastifyInstance) {
  // Public: List available profiles for login
  fastify.get('/profiles', async (_req: FastifyRequest, reply: FastifyReply) => {
    const stmt = db.prepare('SELECT id, name, role, avatar_color FROM profiles ORDER BY role ASC');
    const profiles = stmt.all();
    return reply.send({ profiles });
  });

  // Get current authenticated profile (from signed cookie)
  fastify.get('/me', async (req: FastifyRequest, reply: FastifyReply) => {
    let profileId: string | null = null;

    // Check signed session cookie
    const signedCookie = req.cookies.bitacora_session;
    if (signedCookie) {
      const unsigned = req.unsignCookie(signedCookie);
      if (unsigned.valid && unsigned.value) {
        profileId = unsigned.value;
      }
    }

    if (!profileId) {
      return reply.status(401).send({ error: 'No authenticated session' });
    }

    const stmt = db.prepare('SELECT id, name, role, avatar_color FROM profiles WHERE id = ?');
    const profile = stmt.get(profileId);

    if (!profile) {
      reply.clearCookie('bitacora_session', { path: '/' });
      reply.clearCookie('bitacora_profile_id', { path: '/' });
      return reply.status(401).send({ error: 'Profile not found' });
    }

    return reply.send({ profile });
  });

  // Login with PIN
  fastify.post('/login', async (req: FastifyRequest<{ Body: { profile_id: string; pin: string } }>, reply: FastifyReply) => {
    const { profile_id, pin } = req.body || {};

    if (!profile_id || !pin) {
      return reply.status(400).send({ error: 'Profile y PIN son obligatorios' });
    }

    // 1. Check account lockout from brute force attempts
    const lockout = checkAccountLockout(profile_id);
    if (lockout.locked) {
      return reply.status(429).send({
        error: `Demasiados intentos fallidos. Perfil bloqueado durante ${lockout.remainingSec} segundos.`,
      });
    }

    const stmt = db.prepare('SELECT * FROM profiles WHERE id = ?');
    const profile = stmt.get(profile_id) as ProfileRow | undefined;

    if (!profile) {
      return reply.status(404).send({ error: 'Perfil no encontrado' });
    }

    // 2. Timing-safe PIN verification
    const isCorrect = verifyPin(pin, profile.pin_code);

    if (!isCorrect) {
      const attempt = recordFailedAttempt(profile_id);
      // Artificial tarpit delay against timing and automated enumeration
      await new Promise((res) => setTimeout(res, 800));

      if (attempt.locked) {
        return reply.status(429).send({
          error: `Has superado el límite de 5 intentos. Perfil bloqueado durante 5 minutos por seguridad.`,
        });
      }

      return reply.status(401).send({
        error: `PIN incorrecto. Te quedan ${attempt.remainingAttempts} ${attempt.remainingAttempts === 1 ? 'intento' : 'intentos'}.`,
      });
    }

    // 3. Reset failed attempts counter on successful login
    resetFailedAttempts(profile_id);

    // 4. Auto-upgrade legacy plaintext PIN to scrypt cryptographic hash
    if (!profile.pin_code.startsWith('scrypt:')) {
      const hashed = hashPin(pin);
      db.prepare('UPDATE profiles SET pin_code = ? WHERE id = ?').run(hashed, profile.id);
    }

    // 5. Issue cryptographically signed HMAC-SHA256 session cookie
    const isHttps = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https';
    reply.setCookie('bitacora_session', profile.id, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      signed: true,
      maxAge: 365 * 24 * 60 * 60, // 1 year
    });

    // Clear obsolete unsigned cookie if present
    reply.clearCookie('bitacora_profile_id', { path: '/' });

    return reply.send({
      success: true,
      profile: {
        id: profile.id,
        name: profile.name,
        role: profile.role,
        avatar_color: profile.avatar_color,
      },
    });
  });

  // Change PIN endpoint
  fastify.post('/change-pin', async (req: FastifyRequest<{ Body: { current_pin: string; new_pin: string } }>, reply: FastifyReply) => {
    // Verify session
    let profileId: string | null = null;
    const signedCookie = req.cookies.bitacora_session;
    if (signedCookie) {
      const unsigned = req.unsignCookie(signedCookie);
      if (unsigned.valid && unsigned.value) {
        profileId = unsigned.value;
      }
    }

    if (!profileId) {
      return reply.status(401).send({ error: 'Sesión no autenticada' });
    }

    const { current_pin, new_pin } = req.body || {};

    if (!current_pin || !new_pin) {
      return reply.status(400).send({ error: 'PIN actual y nuevo PIN son requeridos' });
    }

    if (!/^\d{4}$/.test(new_pin)) {
      return reply.status(400).send({ error: 'El nuevo PIN debe ser exactamente de 4 dígitos numéricos' });
    }

    const profile = db.prepare('SELECT * FROM profiles WHERE id = ?').get(profileId) as ProfileRow | undefined;
    if (!profile) {
      return reply.status(404).send({ error: 'Perfil no encontrado' });
    }

    if (!verifyPin(current_pin, profile.pin_code)) {
      await new Promise((res) => setTimeout(res, 800));
      return reply.status(401).send({ error: 'El PIN actual no es correcto' });
    }

    // Hash and store new PIN
    const hashed = hashPin(new_pin);
    db.prepare('UPDATE profiles SET pin_code = ? WHERE id = ?').run(hashed, profileId);

    return reply.send({ success: true, message: 'PIN actualizado correctamente con cifrado scrypt' });
  });

  // Logout
  fastify.post('/logout', async (_req: FastifyRequest, reply: FastifyReply) => {
    reply.clearCookie('bitacora_session', { path: '/' });
    reply.clearCookie('bitacora_profile_id', { path: '/' });
    return reply.send({ success: true });
  });
}
