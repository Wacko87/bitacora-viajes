import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.ts';
import { isValidId } from '../services/security.ts';
import { fetchTripWeather } from '../services/weather.ts';

interface TripBody {
  id: string;
  title: string;
  country_code: string;
  city?: string;
  start_date: string;
  end_date: string;
  cover_image?: string;
  status?: 'active' | 'completed' | 'planned';
  summary?: string;
  total_cost?: number | null;
  cost_currency?: string | null;
  inclusions?: string | null;
  cost_notes?: string | null;
  temp_min?: number | null;
  temp_max?: number | null;
}

export async function tripsRoutes(fastify: FastifyInstance) {
  // Pre-compiled high performance prepared statements
  const listTripsStmt = db.prepare(`
    SELECT 
      t.*,
      (SELECT COUNT(*) FROM artifacts a WHERE a.trip_id = t.id AND a.deleted_at IS NULL) as artifact_count,
      (SELECT COUNT(*) FROM artifacts a WHERE a.trip_id = t.id AND a.category IN ('coin', 'banknote') AND a.deleted_at IS NULL) as currency_count,
      (SELECT COUNT(*) FROM trip_logs l WHERE l.trip_id = t.id AND l.deleted_at IS NULL) as log_count,
      (SELECT COUNT(*) FROM trip_photos p WHERE p.trip_id = t.id AND p.deleted_at IS NULL) as photo_count
    FROM trips t
    WHERE t.deleted_at IS NULL
    ORDER BY t.start_date DESC
  `);

  const activeTripStmt = db.prepare(`
    SELECT * FROM trips 
    WHERE status = 'active' AND deleted_at IS NULL 
    ORDER BY start_date DESC LIMIT 1
  `);

  const tripByIdStmt = db.prepare('SELECT * FROM trips WHERE id = ? AND deleted_at IS NULL');

  const artifactsByTripStmt = db.prepare(`
    SELECT * FROM artifacts 
    WHERE trip_id = ? AND deleted_at IS NULL 
    ORDER BY created_at DESC
  `);

  const logsByTripStmt = db.prepare(`
    SELECT * FROM trip_logs 
    WHERE trip_id = ? AND deleted_at IS NULL 
    ORDER BY day_number ASC, log_date ASC
  `);

  const photosByTripStmt = db.prepare(`
    SELECT * FROM trip_photos 
    WHERE trip_id = ? AND deleted_at IS NULL 
    ORDER BY created_at DESC
  `);

  const upsertTripStmt = db.prepare(`
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

  const deleteTripStmt = db.prepare('UPDATE trips SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?');

  // List all active trips
  fastify.get('/', async (_req: FastifyRequest, reply: FastifyReply) => {
    const trips = listTripsStmt.all();
    return reply.send({ trips });
  });

  // Get active trip (for quick capture in the street)
  fastify.get('/current', async (_req: FastifyRequest, reply: FastifyReply) => {
    const trip = activeTripStmt.get();
    return reply.send({ trip: trip || null });
  });

  // Get single trip details
  fastify.get('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    const trip = tripByIdStmt.get(id);
    if (!trip) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    const artifacts = artifactsByTripStmt.all(id);
    const logs = logsByTripStmt.all(id);
    const photos = photosByTripStmt.all(id);

    return reply.send({ trip, artifacts, logs, photos });
  });

  // Create or Update Trip (Idempotent Upsert with UUIDv7)
  fastify.post('/', {
    schema: {
      body: {
        type: 'object',
        required: ['id', 'title', 'country_code', 'start_date', 'end_date'],
        properties: {
          id: { type: 'string', minLength: 1, maxLength: 64 },
          title: { type: 'string', minLength: 1, maxLength: 200 },
          country_code: { type: 'string', minLength: 2, maxLength: 3 },
          city: { type: ['string', 'null'] },
          start_date: { type: 'string' },
          end_date: { type: 'string' },
          cover_image: { type: ['string', 'null'] },
          status: { type: 'string', enum: ['active', 'completed', 'planned'] },
          summary: { type: ['string', 'null'] },
          total_cost: { type: ['number', 'null'] },
          cost_currency: { type: ['string', 'null'] },
          inclusions: { type: ['string', 'null'] },
          cost_notes: { type: ['string', 'null'] },
          temp_min: { type: ['number', 'null'] },
          temp_max: { type: ['number', 'null'] },
        },
      },
    },
  }, async (req: FastifyRequest<{ Body: TripBody }>, reply: FastifyReply) => {
    const {
      id,
      title,
      country_code,
      city,
      start_date,
      end_date,
      cover_image,
      status,
      summary,
      total_cost,
      cost_currency,
      inclusions,
      cost_notes,
      temp_min,
      temp_max,
    } = req.body || {};

    if (!id || !title || !country_code || !start_date || !end_date) {
      return reply.status(400).send({ error: 'Missing mandatory fields' });
    }

    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    const parsedCost =
      total_cost !== undefined && total_cost !== null && !isNaN(Number(total_cost))
        ? Number(total_cost)
        : null;

    let finalTempMin = temp_min ?? null;
    let finalTempMax = temp_max ?? null;

    // Automatically fetch temperature if not provided
    if (finalTempMin === null || finalTempMax === null) {
      try {
        const weather = await fetchTripWeather(city, country_code, start_date, end_date);
        if (weather && weather.tempMin !== null && weather.tempMax !== null) {
          finalTempMin = weather.tempMin;
          finalTempMax = weather.tempMax;
        }
      } catch (err) {
        fastify.log.warn({ err }, 'Weather auto-fetch failed during trip upsert');
      }
    }

    upsertTripStmt.run(
      id,
      title,
      country_code.toUpperCase(),
      city || null,
      start_date,
      end_date,
      cover_image || null,
      status || 'completed',
      summary || null,
      parsedCost,
      cost_currency || 'EUR',
      inclusions || null,
      cost_notes || null,
      finalTempMin,
      finalTempMax
    );

    const saved = tripByIdStmt.get(id);
    return reply.send({ success: true, trip: saved });
  });

  // Refresh or auto-fetch trip weather on demand
  fastify.post('/:id/weather', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    const trip = tripByIdStmt.get(id) as any;
    if (!trip) {
      return reply.status(404).send({ error: 'Trip not found' });
    }

    const weather = await fetchTripWeather(trip.city, trip.country_code, trip.start_date, trip.end_date);
    if (!weather || weather.tempMin === null || weather.tempMax === null) {
      return reply.status(404).send({ error: 'No se pudieron obtener datos meteorológicos para este destino' });
    }

    db.prepare('UPDATE trips SET temp_min = ?, temp_max = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
      weather.tempMin,
      weather.tempMax,
      id
    );

    const updated = tripByIdStmt.get(id);
    return reply.send({ success: true, trip: updated, weather });
  });

  // Soft delete trip
  fastify.delete('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    deleteTripStmt.run(id);
    return reply.send({ success: true });
  });
}
