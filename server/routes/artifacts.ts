import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.ts';
import { processArtifactImage } from '../services/imageProcessor.ts';
import { isValidId, isValidImageBuffer } from '../services/security.ts';

interface ArtifactBody {
  id: string;
  trip_id?: string;
  collector_profile_id?: string;
  category: 'coin' | 'banknote' | 'ticket' | 'postcard' | 'souvenir';
  title: string;
  currency_code?: string;
  denomination?: string;
  year?: number;
  image_front?: string;
  image_back?: string;
  story?: string;
}

export async function artifactsRoutes(fastify: FastifyInstance) {
  // Pre-compiled prepared statements for queries
  const listAllStmt = db.prepare(`
    SELECT a.*, t.title as trip_title, t.country_code
    FROM artifacts a
    LEFT JOIN trips t ON a.trip_id = t.id
    WHERE a.deleted_at IS NULL
    ORDER BY a.created_at DESC
  `);

  const listByTripStmt = db.prepare(`
    SELECT a.*, t.title as trip_title, t.country_code
    FROM artifacts a
    LEFT JOIN trips t ON a.trip_id = t.id
    WHERE a.deleted_at IS NULL AND a.trip_id = ?
    ORDER BY a.created_at DESC
  `);

  const listByCategoryStmt = db.prepare(`
    SELECT a.*, t.title as trip_title, t.country_code
    FROM artifacts a
    LEFT JOIN trips t ON a.trip_id = t.id
    WHERE a.deleted_at IS NULL AND a.category = ?
    ORDER BY a.created_at DESC
  `);

  const listByTripAndCategoryStmt = db.prepare(`
    SELECT a.*, t.title as trip_title, t.country_code
    FROM artifacts a
    LEFT JOIN trips t ON a.trip_id = t.id
    WHERE a.deleted_at IS NULL AND a.trip_id = ? AND a.category = ?
    ORDER BY a.created_at DESC
  `);

  const getArtifactByIdStmt = db.prepare(`
    SELECT a.*, t.title as trip_title, t.country_code
    FROM artifacts a
    LEFT JOIN trips t ON a.trip_id = t.id
    WHERE a.id = ? AND a.deleted_at IS NULL
  `);

  const upsertArtifactStmt = db.prepare(`
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

  const getArtifactRawStmt = db.prepare('SELECT * FROM artifacts WHERE id = ?');
  const updateImageFrontStmt = db.prepare('UPDATE artifacts SET image_front = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const updateImageBackStmt = db.prepare('UPDATE artifacts SET image_back = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
  const deleteArtifactStmt = db.prepare('UPDATE artifacts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?');

  // Query all artifacts with optional filters
  fastify.get('/', async (req: FastifyRequest<{ Querystring: { trip_id?: string; category?: string } }>, reply: FastifyReply) => {
    const { trip_id, category } = req.query;

    let artifacts;
    if (trip_id && category) {
      artifacts = listByTripAndCategoryStmt.all(trip_id, category);
    } else if (trip_id) {
      artifacts = listByTripStmt.all(trip_id);
    } else if (category) {
      artifacts = listByCategoryStmt.all(category);
    } else {
      artifacts = listAllStmt.all();
    }

    return reply.send({ artifacts });
  });

  // Get single artifact
  fastify.get('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador de recuerdo no válido' });
    }
    const artifact = getArtifactByIdStmt.get(id);

    if (!artifact) {
      return reply.status(404).send({ error: 'Artifact not found' });
    }

    return reply.send({ artifact });
  });

  // Upsert artifact metadata (Idempotent UUIDv7)
  fastify.post('/', async (req: FastifyRequest<{ Body: ArtifactBody }>, reply: FastifyReply) => {
    const {
      id,
      trip_id,
      collector_profile_id,
      category,
      title,
      currency_code,
      denomination,
      year,
      image_front,
      image_back,
      story,
    } = req.body || {};

    if (!id || !category || !title) {
      return reply.status(400).send({ error: 'Missing mandatory fields (id, category, title)' });
    }

    upsertArtifactStmt.run(
      id,
      trip_id || null,
      collector_profile_id || null,
      category,
      title,
      currency_code || null,
      denomination || null,
      year ? Number(year) : null,
      image_front || '',
      image_back || null,
      story || null
    );

    const saved = getArtifactRawStmt.get(id);
    return reply.send({ success: true, artifact: saved });
  });

  // Multipart Image Upload endpoint
  fastify.post('/:id/upload', async (req: FastifyRequest<{ Params: { id: string }; Querystring: { side?: 'front' | 'back' } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }
    const side = req.query.side === 'back' ? 'back' : 'front';

    const data = await req.file({
      limits: {
        fileSize: 15 * 1024 * 1024, // 15MB max input before sharp compression
      },
    });

    if (!data) {
      return reply.status(400).send({ error: 'No image uploaded' });
    }

    const buffer = await data.toBuffer();
    if (!isValidImageBuffer(buffer)) {
      return reply.status(400).send({ error: 'Formato de imagen no válido. Solo se admiten JPEG, PNG, WebP y HEIC.' });
    }

    let result;
    try {
      result = await processArtifactImage(id, side, buffer);
    } catch {
      return reply.status(400).send({ error: 'No se pudo procesar la imagen del recuerdo' });
    }

    // Update database record with WebP URL using pre-compiled statement
    if (side === 'front') {
      updateImageFrontStmt.run(result.displayUrl, id);
    } else {
      updateImageBackStmt.run(result.displayUrl, id);
    }

    return reply.send({
      success: true,
      displayUrl: result.displayUrl,
      thumbUrl: result.thumbUrl,
    });
  });

  // Soft delete artifact
  fastify.delete('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }
    deleteArtifactStmt.run(id);
    return reply.send({ success: true });
  });
}
