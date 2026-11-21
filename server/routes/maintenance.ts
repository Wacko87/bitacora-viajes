import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createDatabaseBackup, listDatabaseBackups } from '../services/backup.ts';
import { runGarbageCollection } from '../services/cleaner.ts';

export async function maintenanceRoutes(fastify: FastifyInstance) {
  // 1. Trigger manual hot backup
  fastify.post('/backup', async (_req: FastifyRequest, reply: FastifyReply) => {
    try {
      const backup = await createDatabaseBackup('manual');
      return reply.send({ success: true, backup });
    } catch (err: any) {
      fastify.log.error(err, 'Manual backup failed');
      return reply.status(500).send({ error: err.message || 'Error al crear la copia de seguridad' });
    }
  });

  // 2. List available backups
  fastify.get('/backups', async (_req: FastifyRequest, reply: FastifyReply) => {
    const backups = listDatabaseBackups();
    return reply.send({ backups });
  });

  // 3. Trigger garbage collection
  fastify.post('/gc', async (req: FastifyRequest<{ Body: { retention_days?: number } }>, reply: FastifyReply) => {
    try {
      const days = req.body?.retention_days ?? 30;
      const report = await runGarbageCollection(days);
      return reply.send({ success: true, report });
    } catch (err: any) {
      fastify.log.error(err, 'Garbage collection failed');
      return reply.status(500).send({ error: err.message || 'Error al ejecutar limpieza de huérfanos' });
    }
  });
}
