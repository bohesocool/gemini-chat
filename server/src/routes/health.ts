import { Router } from 'express';
import { config } from '../config.js';
import { prisma } from '../database.js';
import { requireAuth } from '../middleware/auth.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  if (!config.dbEnabled) {
    return res.json({ status: 'ok' });
  }
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'degraded' });
  }
});

healthRouter.get('/detail', requireAuth, async (_req, res) => {
  const status: Record<string, unknown> = {
    status: 'ok',
    dbEnabled: config.dbEnabled,
    webdavEnabled: config.webdavEnabled,
  };

  if (config.dbEnabled) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      status.dbStatus = 'connected';
    } catch {
      status.dbStatus = 'disconnected';
      status.status = 'degraded';
    }
  }

  res.json(status);
});
