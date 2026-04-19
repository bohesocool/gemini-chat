import { Router } from 'express';
import { prisma } from '../database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const modelConfigsRouter = Router();

const MODEL_CONFIGS_KEY = 'model-configs';

modelConfigsRouter.get('/', asyncHandler(async (_req, res) => {
  const record = await prisma.modelConfigStore.findUnique({ where: { key: MODEL_CONFIGS_KEY } });
  res.json(record?.value ?? null);
}));

modelConfigsRouter.put('/', asyncHandler(async (req, res) => {
  const record = await prisma.modelConfigStore.upsert({
    where: { key: MODEL_CONFIGS_KEY },
    update: { value: req.body },
    create: { key: MODEL_CONFIGS_KEY, value: req.body },
  });
  res.json(record.value);
}));
