import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { config } from './config.js';
import { initDatabase, prisma } from './database.js';
import { chatWindowsRouter } from './routes/chatWindows.js';
import { settingsRouter } from './routes/settings.js';
import { modelConfigsRouter } from './routes/modelConfigs.js';
import { bookmarksRouter } from './routes/bookmarks.js';
import { templatesRouter } from './routes/templates.js';
import { imagesRouter } from './routes/images.js';
import { syncRouter } from './routes/sync.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { startSyncScheduler, stopSyncScheduler } from './services/syncScheduler.js';
import { requireAuth } from './middleware/auth.js';
import { markDirty } from './services/syncScheduler.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.disable('x-powered-by');

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

if (config.corsOrigins === '*') {
  app.use(cors());
} else if (config.corsOrigins) {
  const allowList = config.corsOrigins.split(',').map(s => s.trim()).filter(Boolean);
  app.use(cors({ origin: allowList, credentials: true }));
}

app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

app.use('/api/v1', express.json({ limit: '1mb' }));
app.use('/api/v1/images', express.json({ limit: '20mb' }));
app.use('/api/v1/sync/migrate-from-indexeddb', express.json({ limit: '50mb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many login attempts, try again later' },
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/api/v1/auth/login', loginLimiter);
app.use('/api/v1', apiLimiter);

app.use('/api/v1/health', healthRouter);
app.use('/api/v1/auth', authRouter);

function markDirtyOnWrite(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return next();
  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      markDirty();
    }
  });
  next();
}

app.use('/api/v1', requireAuth);
app.use('/api/v1', markDirtyOnWrite);

app.use('/api/v1/chat-windows', chatWindowsRouter);
app.use('/api/v1/settings', settingsRouter);
app.use('/api/v1/model-configs', modelConfigsRouter);
app.use('/api/v1/bookmarks', bookmarksRouter);
app.use('/api/v1/templates', templatesRouter);
app.use('/api/v1/images', imagesRouter);
app.use('/api/v1/sync', syncRouter);

if (fs.existsSync(config.staticDir)) {
  app.use(express.static(config.staticDir));
  app.get(/^\/(?!api\/).*/, (_req, res) => {
    res.sendFile(path.join(config.staticDir, 'index.html'));
  });
}

app.use(errorHandler);

async function start() {
  console.log('=== Gemini Chat Server ===');
  console.log(`DB_ENABLED: ${config.dbEnabled}`);
  console.log(`DB_PROVIDER: ${config.dbProvider}`);
  console.log(`WEBDAV_ENABLED: ${config.webdavEnabled}`);

  if (config.dbEnabled) {
    await initDatabase();
    console.log('Database connected successfully');
  }

  if (config.webdavEnabled && config.dbEnabled) {
    startSyncScheduler();
    console.log(`WebDAV sync started (interval: ${config.webdavSyncInterval}s)`);
  }

  app.listen(config.port, () => {
    console.log(`Server listening on port ${config.port}`);
  });
}

process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  stopSyncScheduler();
  if (config.dbEnabled) await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('Shutting down...');
  stopSyncScheduler();
  if (config.dbEnabled) await prisma.$disconnect();
  process.exit(0);
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
