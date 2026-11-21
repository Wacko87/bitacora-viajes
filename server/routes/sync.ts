import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.ts';
import { isValidId } from '../services/security.ts';

interface SyncMutation {
  entity: 'trip' | 'artifact' | 'log';
  action: 'upsert' | 'delete';
  data: Record<string, unknown>;
}

export async function syncRoutes(fastify: FastifyInstance) {
  // Delta sync: fetch all changes since timestamp
  fastify.get('/', async (req: FastifyRequest<{ Querystring: { since?: string } }>, reply: FastifyReply) => {
    const since = req.query.since || '1970-01-01T00:00:00Z';

    const tripsStmt = db.prepare('SELECT * FROM trips WHERE updated_at > ?');
    const artifactsStmt = db.prepare('SELECT * FROM artifacts WHERE updated_at > ?');
    const logsStmt = db.prepare('SELECT * FROM trip_logs WHERE updated_at > ?');

    const trips = tripsStmt.all(since);
    const artifacts = artifactsStmt.all(since);
    const logs = logsStmt.all(since);

    return reply.send({
      server_time: new Date().toISOString(),
      trips,
      artifacts,
      logs,
    });
  });

  // Batch mutation: atomic sync from client offline queue
  fastify.post('/batch', async (req: FastifyRequest<{ Body: { mutations: SyncMutation[] } }>, reply: FastifyReply) => {
    const { mutations } = req.body || {};

    if (!Array.isArray(mutations) || mutations.length === 0) {
      return reply.send({ success: true, processed: 0 });
    }

    let processedCount = 0;

    // Execute within a single SQLite transaction
    db.exec('BEGIN TRANSACTION;');

    try {
      for (const mut of mutations) {
        const mutId = mut.data?.id as string;
        if (!mutId || !isValidId(mutId)) {
          continue; // Ignore corrupted or malicious mutation identifiers
        }

        if (mut.entity === 'trip') {
          if (mut.action === 'delete') {
            db.prepare('UPDATE trips SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(mutId);
          } else {
            const parsedCost =
              mut.data.total_cost !== undefined && mut.data.total_cost !== null && !isNaN(Number(mut.data.total_cost))
                ? Number(mut.data.total_cost)
                : null;

            const stmt = db.prepare(`
              INSERT INTO trips (
                id, title, country_code, city, start_date, end_date, 
                cover_image, status, summary, total_cost, cost_currency, inclusions, cost_notes, temp_min, temp_max, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                title = excluded.title,
                country_code = excluded.country_code,
                city = excluded.city,
                start_date = excluded.start_date,
                end_date = excluded.end_date,
                cover_image = COALESCE(excluded.cover_image, trips.cover_image),
                status = excluded.status,
                summary = excluded.summary,
                total_cost = excluded.total_cost,
                cost_currency = excluded.cost_currency,
                inclusions = excluded.inclusions,
                cost_notes = excluded.cost_notes,
                temp_min = COALESCE(excluded.temp_min, trips.temp_min),
                temp_max = COALESCE(excluded.temp_max, trips.temp_max),
                updated_at = CURRENT_TIMESTAMP
            `);
            stmt.run(
              mutId,
              mut.data.title as string,
              ((mut.data.country_code as string) || 'ES').toUpperCase(),
              (mut.data.city as string) || null,
              mut.data.start_date as string,
              mut.data.end_date as string,
              (mut.data.cover_image as string) || null,
              (mut.data.status as string) || 'completed',
              (mut.data.summary as string) || null,
              parsedCost,
              (mut.data.cost_currency as string) || 'EUR',
              (mut.data.inclusions as string) || null,
              (mut.data.cost_notes as string) || null,
              mut.data.temp_min !== undefined ? Number(mut.data.temp_min) : null,
              mut.data.temp_max !== undefined ? Number(mut.data.temp_max) : null
            );
          }
        } else if (mut.entity === 'artifact') {
          if (mut.action === 'delete') {
            db.prepare('UPDATE artifacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?').run(mutId);
          } else {
            const stmt = db.prepare(`
              INSERT INTO artifacts (
                id, trip_id, collector_profile_id, category, title,
                currency_code, denomination, year, image_front, image_back, story, updated_at
              )
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
              ON CONFLICT(id) DO UPDATE SET
                trip_id = excluded.trip_id,
                collector_profile_id = excluded.collector_profile_id,
                category = excluded.category,
                title = excluded.title,
                currency_code = excluded.currency_code,
                denomination = excluded.denomination,
                year = excluded.year,
                image_front = COALESCE(excluded.image_front, artifacts.image_front),
                image_back = COALESCE(excluded.image_back, artifacts.image_back),
                story = excluded.story,
                updated_at = CURRENT_TIMESTAMP
            `);
            stmt.run(
              mutId,
              (mut.data.trip_id as string) || null,
              (mut.data.collector_profile_id as string) || null,
              mut.data.category as string,
              mut.data.title as string,
              (mut.data.currency_code as string) || null,
              (mut.data.denomination as string) || null,
              mut.data.year ? Number(mut.data.year) : null,
              (mut.data.image_front as string) || '',
              (mut.data.image_back as string) || null,
              (mut.data.story as string) || null
            );
          }
        }
        processedCount++;
      }

      db.exec('COMMIT;');
      return reply.send({ success: true, processed: processedCount, server_time: new Date().toISOString() });
    } catch (err) {
      db.exec('ROLLBACK;');
      fastify.log.error(err, 'Failed to process sync batch');
      return reply.status(500).send({ error: 'Sync transaction failed' });
    }
  });
}
