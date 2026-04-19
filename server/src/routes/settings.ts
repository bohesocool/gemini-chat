import { Router } from 'express';
import { prisma } from '../database.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export const settingsRouter = Router();

const SETTINGS_KEY = 'app-settings';

settingsRouter.get('/', asyncHandler(async (_req, res) => {
  const record = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  res.json(record?.value ?? null);
}));

settingsRouter.put('/', asyncHandler(async (req, res) => {
  const record = await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    update: { value: req.body },
    create: { key: SETTINGS_KEY, value: req.body },
  });
  res.json(record.value);
}));
