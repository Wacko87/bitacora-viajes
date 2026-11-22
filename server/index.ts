import fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyMultipart from '@fastify/multipart';
import fastifyRateLimit from '@fastify/rate-limit';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';

import { PORT, HOST, SESSION_SECRET, TRUST_PROXY, UPLOADS_DIR, IS_PROD } from './config.ts';
import { initDb } from './db/schema.ts';
import { seedDemoData } from './db/demoSeed.ts';
import { closeDb } from './db/index.ts';

import { authRoutes } from './routes/auth.ts';
import { tripsRoutes } from './routes/trips.ts';
import { artifactsRoutes } from './routes/artifacts.ts';
import { logsRoutes } from './routes/logs.ts';
import { photosRoutes } from './routes/photos.ts';
import { syncRoutes } from './routes/sync.ts';
import { maintenanceRoutes } from './routes/maintenance.ts';
import { initAutomatedBackups } from './services/backup.ts';
import { backfillMissingTripWeather } from './services/weather.ts';

// Initialize SQLite Schema & Hot Backups & Weather Backfill
initDb();
if (process.env.SEED_DEMO === 'true') {
  seedDemoData();
}
initAutomatedBackups();
backfillMissingTripWeather().catch((err) => console.warn('[Weather] Startup backfill error:', err));

const app = fastify({
  logger: {
    level: IS_PROD ? 'info' : 'debug',
  },
  trustProxy: TRUST_PROXY.split(',').map((s) => s.trim()),
});

// 1. Cookies
await app.register(fastifyCookie, {
  secret: SESSION_SECRET,
  hook: 'onRequest',
});

// 2. Strict CORS Whitelist (SEC-07: Prevención de deriva de dominios)
const DEFAULT_ALLOWED_DOMAINS = ['localhost', 'wacko87.es', 'viajes.wacko87.es'];
const ENV_ALLOWED_DOMAINS = (process.env.ALLOWED_DOMAINS || '')
  .split(',')
  .map((d) => d.trim().toLowerCase())
  .filter(Boolean);
const ALLOWED_DOMAINS = Array.from(new Set([...DEFAULT_ALLOWED_DOMAINS, ...ENV_ALLOWED_DOMAINS]));

await app.register(fastifyCors, {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);
    try {
      const parsed = new URL(origin);
      const host = parsed.hostname;
      // Allow localhost or loopback
      if (host === 'localhost' || host === '127.0.0.1') return cb(null, true);
      // Allow internal LAN subnets
      if (/^192\.168\.\d+\.\d+$/.test(host) || /^172\.16\.\d+\.\d+$/.test(host)) return cb(null, true);
      // Allow homelab domains and custom configured domains
      const isAllowedDomain = ALLOWED_DOMAINS.some(
        (domain) => host === domain || host.endsWith(`.${domain}`) || domain === '*'
      );
      if (parsed.protocol === 'https:' && isAllowedDomain) {
        return cb(null, true);
      }
    } catch {
      // Invalid URL format
    }
    return cb(null, false);
  },
  credentials: true,
});

// Global Authentication Barrier for Protected API Endpoints and Uploads
app.addHook('onRequest', async (req, reply) => {
  const url = req.raw.url || '';

  // Whitelisted Public Endpoints
  if (
    url.startsWith('/api/health') ||
    url.startsWith('/api/auth/login') ||
    url.startsWith('/api/auth/profiles')
  ) {
    return;
  }

  // Intercept all other /api/ and /uploads/ routes
  if (url.startsWith('/api/') || url.startsWith('/uploads/')) {
    let isAuthenticated = false;

    // Verify cryptographically signed cookie
    const signedCookie = req.cookies.bitacora_session;
    if (signedCookie) {
      const unsigned = req.unsignCookie(signedCookie);
      if (unsigned.valid && unsigned.value) {
        isAuthenticated = true;
      }
    }

    if (!isAuthenticated) {
      return reply.status(401).send({
        error: 'No autorizado. Se requiere inicio de sesión con PIN.',
      });
    }
  }
});

// Global Defensive Security Headers
app.addHook('onSend', async (_req, reply) => {
  reply.header('X-Frame-Options', 'SAMEORIGIN');
  reply.header('X-Content-Type-Options', 'nosniff');
  reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  reply.header('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(self)');
  reply.header(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://unpkg.com; connect-src 'self'; font-src 'self' data:;"
  );
});

// 3. Rate Limit (protecting PIN brute-force)
await app.register(fastifyRateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// 4. Multipart upload support
await app.register(fastifyMultipart, {
  limits: {
    fileSize: 15 * 1024 * 1024, // 15MB
  },
});

// 5. Serve Uploads folder
await app.register(fastifyStatic, {
  root: UPLOADS_DIR,
  prefix: '/uploads/',
  decorateReply: false,
});

// 6. Register REST API Routes
await app.register(authRoutes, { prefix: '/api/auth' });
await app.register(tripsRoutes, { prefix: '/api/trips' });
await app.register(artifactsRoutes, { prefix: '/api/artifacts' });
await app.register(logsRoutes, { prefix: '/api/logs' });
await app.register(photosRoutes, { prefix: '/api/photos' });
await app.register(syncRoutes, { prefix: '/api/sync' });
await app.register(maintenanceRoutes, { prefix: '/api/maintenance' });

// Health check endpoint for Docker & Uptime Kuma
app.get('/api/health', async () => {
  return { status: 'healthy', uptime: process.uptime(), timestamp: new Date().toISOString() };
});

// 7. Serve Static Frontend in Production & Cache Optimization
const clientDist = path.resolve(process.cwd(), 'dist/client');
if (fs.existsSync(clientDist)) {
  // Ensure aggressive caching for content-hashed Vite bundles, and no-cache for PWA HTML / ServiceWorker
  app.addHook('onSend', async (req, reply) => {
    const url = req.raw.url || '';
    if (url.startsWith('/assets/')) {
      reply.header('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (url === '/' || url.endsWith('.html') || url.includes('sw.js') || url.includes('manifest.json')) {
      reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
      reply.header('Pragma', 'no-cache');
      reply.header('Expires', '0');
    }
  });

  await app.register(fastifyStatic, {
    root: clientDist,
    prefix: '/',
  });

  // SPA fallback for HTML5 History Mode (only for HTML navigation, NOT for missing assets/APIs)
  app.setNotFoundHandler((req, reply) => {
    const url = req.raw.url || '';
    if (url.startsWith('/api') || url.startsWith('/assets') || url.startsWith('/uploads')) {
      return reply.code(404).send({ error: 'Not found', path: url });
    }
    reply.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    reply.sendFile('index.html', clientDist);
  });
}

// 8. Graceful Shutdown on POSIX SIGTERM / SIGINT (Unraid Lifecycle)
const gracefulShutdown = async (signal: string) => {
  app.log.info(`[Server] Received ${signal}. Initiating graceful shutdown...`);
  try {
    await app.close();
    closeDb();
    app.log.info('[Server] Graceful shutdown completed cleanly.');
    process.exit(0);
  } catch (err) {
    app.log.error(err, '[Server] Error during shutdown');
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
try {
  await app.listen({ port: PORT, host: HOST });
  console.log(`\n======================================================`);
  console.log(` ✈️  Bitácora de Viajes en Pareja (Backend)`);
  console.log(` 🌐 Server listening on http://${HOST}:${PORT}`);
  console.log(` 📂 Uploads directory: ${UPLOADS_DIR}`);
  console.log(`======================================================\n`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
