import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../db/index.ts';
import { processTripPhoto } from '../services/imageProcessor.ts';
import { isValidId, isValidImageBuffer } from '../services/security.ts';
import crypto from 'node:crypto';

export async function photosRoutes(fastify: FastifyInstance) {
  // Pre-compiled prepared statements
  const listPhotosByTripStmt = db.prepare(`
    SELECT * FROM trip_photos 
    WHERE trip_id = ? AND deleted_at IS NULL 
    ORDER BY created_at DESC
  `);

  const photoByIdStmt = db.prepare(`
    SELECT * FROM trip_photos 
    WHERE id = ? AND deleted_at IS NULL
  `);

  const insertPhotoStmt = db.prepare(`
    INSERT INTO trip_photos (id, trip_id, image_url, medium_url, thumb_url, caption, location, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `);

  const updatePhotoStmt = db.prepare(`
    UPDATE trip_photos 
    SET caption = ?, location = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ? AND deleted_at IS NULL
  `);

  const deletePhotoStmt = db.prepare(`
    UPDATE trip_photos 
    SET deleted_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  const setTripCoverStmt = db.prepare(`
    UPDATE trips 
    SET cover_image = (SELECT image_url FROM trip_photos WHERE id = ?), updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `);

  // 1. Get all photos for a trip
  fastify.get('/', async (req: FastifyRequest<{ Querystring: { trip_id: string } }>, reply: FastifyReply) => {
    const { trip_id } = req.query;
    if (!trip_id || !isValidId(trip_id)) {
      return reply.status(400).send({ error: 'trip_id no válido o requerido' });
    }

    const photos = listPhotosByTripStmt.all(trip_id);
    return reply.send({ photos });
  });

  // 2. Upload photo (Multipart)
  fastify.post('/upload', async (req: FastifyRequest, reply: FastifyReply) => {
    const parts = req.parts();
    let tripId = '';
    let caption = '';
    let location = '';
    let fileBuffer: Buffer | null = null;

    for await (const part of parts) {
      if (part.type === 'file' && part.fieldname === 'file') {
        fileBuffer = await part.toBuffer();
      } else if (part.type === 'field') {
        if (part.fieldname === 'trip_id') tripId = String(part.value);
        if (part.fieldname === 'caption') caption = String(part.value);
        if (part.fieldname === 'location') location = String(part.value);
      }
    }

    if (!tripId || !isValidId(tripId)) {
      return reply.status(400).send({ error: 'trip_id no válido o requerido' });
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return reply.status(400).send({ error: 'No se ha proporcionado ninguna imagen' });
    }

    if (!isValidImageBuffer(fileBuffer)) {
      return reply.status(400).send({ error: 'Formato de imagen no soportado. Debe ser JPEG, PNG, WebP o HEIC.' });
    }

    const photoId = crypto.randomUUID();
    let result;
    try {
      result = await processTripPhoto(tripId, photoId, fileBuffer);
    } catch {
      return reply.status(400).send({ error: 'No se pudo procesar la fotografía' });
    }

    insertPhotoStmt.run(
      photoId,
      tripId,
      result.displayUrl,
      result.mediumUrl || null,
      result.thumbUrl,
      caption.trim() || null,
      location.trim() || null
    );

    const saved = photoByIdStmt.get(photoId);
    return reply.send({ success: true, photo: saved });
  });

  // 3. Update caption / location
  fastify.put('/:id', async (req: FastifyRequest<{ Params: { id: string }; Body: { caption?: string; location?: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    const { caption, location } = req.body || {};
    updatePhotoStmt.run(caption || null, location || null, id);

    const updated = photoByIdStmt.get(id);
    return reply.send({ success: true, photo: updated });
  });

  // 4. Set photo as trip cover image
  fastify.post('/:id/cover', async (req: FastifyRequest<{ Params: { id: string }; Body: { trip_id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    const { trip_id } = req.body || {};

    if (!isValidId(id) || !isValidId(trip_id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    setTripCoverStmt.run(id, trip_id);
    return reply.send({ success: true });
  });

  // 5. Soft delete photo
  fastify.delete('/:id', async (req: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = req.params;
    if (!isValidId(id)) {
      return reply.status(400).send({ error: 'Identificador no válido' });
    }

    deletePhotoStmt.run(id);
    return reply.send({ success: true });
  });
}
