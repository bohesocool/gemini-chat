import { Router } from 'express';
import { prisma } from '../database.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  imageCreateSchema,
  imageBatchDeleteSchema,
  type ImageCreate,
} from '../schemas.js';

export const imagesRouter = Router();

function serializeImage<T extends { createdAt: bigint; updatedAt: bigint }>(img: T) {
  return { ...img, createdAt: Number(img.createdAt), updatedAt: Number(img.updatedAt) };
}

imagesRouter.get('/', asyncHandler(async (_req, res) => {
  const images = await prisma.imageRecord.findMany({
    orderBy: { createdAt: 'desc' },
  });
  res.json(images.map(serializeImage));
}));

imagesRouter.get('/:id', asyncHandler(async (req, res) => {
  const image = await prisma.imageRecord.findUnique({ where: { id: String(req.params.id) } });
  if (!image) throw new HttpError(404, 'Not found');
  res.json(serializeImage(image));
}));

imagesRouter.post('/', validateBody(imageCreateSchema), asyncHandler(async (req, res) => {
  const body = req.body as ImageCreate;
  const image = await prisma.imageRecord.create({
    data: {
      id: body.id,
      data: body.data as never,
      createdAt: BigInt(body.createdAt),
      updatedAt: BigInt(body.updatedAt ?? body.createdAt),
    },
  });
  res.status(201).json(serializeImage(image));
}));

imagesRouter.delete('/:id', asyncHandler(async (req, res) => {
  await prisma.imageRecord.delete({ where: { id: String(req.params.id) } });
  res.json({ success: true });
}));

imagesRouter.post('/batch-delete', validateBody(imageBatchDeleteSchema), asyncHandler(async (req, res) => {
  const { ids } = req.body as { ids: string[] };
  await prisma.imageRecord.deleteMany({ where: { id: { in: ids } } });
  res.json({ success: true });
}));

imagesRouter.delete('/', asyncHandler(async (_req, res) => {
  await prisma.imageRecord.deleteMany({});
  res.json({ success: true });
}));
