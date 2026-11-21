import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.ts';
import { isValidId } from '../services/security.ts';

interface LogBody {
  id: string;
  trip_id: string;
  day_number?: number;
  log_date: string;
  title?: string;
  notes_partner_1?: string;
  notes_partner_2?: string;
  photos?: string[];
}

export async function logsRoutes(fastify: FastifyInstance) {
  // Pre-compiled prepared statements for optimal performance
  const listLogsByTripStmt = db.prepare(`
    SELECT * FROM trip_logs 
    WHERE trip_id = ? AND deleted_at IS NULL 
    ORDER BY day_number ASC, log_date ASC
  `);

  const upsertLogStmt = db.prepare(`
    INSERT INTO trip_logs (
      id, trip_id, day_number, log_date, title, 
      notes_partner_1, notes_partner_2, photos, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      day_number = excluded.day_number,
      log_date = excluded.log_date,
      title = excluded.title,
      notes_partner_1 = COALESCE(excluded.notes_partner_1, trip_logs.notes_partner_1),
      notes_partner_2 = COALESCE(excluded.notes_partner_2, trip_logs.notes_partner_2),
      photos = COALESCE(excluded.photos, trip_logs.photos),
      updated_at = CURRENT_TIMESTAMP
  `);

  const getLogByIdStmt = db.prepare('SELECT * FROM trip_logs WHERE id = ?');
  const deleteLogStmt = db.prepare('UPDATE trip_logs SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?');

  // Get logs for trip
  fastify.get('/', async (req: FastifyRequest<{ Querystring: { trip_id: string } }>, reply: FastifyReply) => {
    const { trip_id } = req.query;
    if (!trip_id || !isValidId(trip_id)) {
      return reply.status(400).send({ error: 'trip_id no válido o requerido' });
    }

    const logs = listLogsByTripStmt.all(trip_id);
    return reply.send({ logs });
  });

  // Upsert daily log entry
  fastify.post('/', async (req: FastifyRequest<{ Body: LogBody }>, reply: FastifyReply) => {
    const { id, trip_id, day_number, log_date, title, notes_partner_1, notes_partner_2, photos } = req.body || {};

    if (!id || !trip_id || !log_date) {
      return reply.status(400).send({ error: 'Missing mandatory fields (id, trip_id, log_date)' });
    }

    const photosJson = photos ? JSON.stringify(photos) : null;

    upsertLogStmt.run(
      id,
      trip_id,
      day_number ? Number(day_number) : null,
      log_date,
      title || null,
      notes_partner_1 || null,
      notes_partner_2 || null,
      photosJson
    );

    const saved = getLogByIdStmt.get(id);
    return reply.send({ success: true, log: saved });
  });

  // Soft delete log
  fastify.delete('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }
    deleteLogStmt.run(id);
    return reply.send({ success: true });
  });
}
