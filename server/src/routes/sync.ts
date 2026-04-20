import { Router } from 'express';
import { prisma } from '../database.js';
import {
  importFromWebDAV,
  collectExportData,
  triggerManualSync,
  reloadSyncScheduler,
} from '../services/syncScheduler.js';
import { listBackups, testConnection } from '../services/webdav.js';
import { getPublicConfig, updateConfig } from '../services/webdavConfigStore.js';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { validateBody } from '../middleware/validate.js';
import {
  migrateFromIndexedDBSchema,
  webdavConfigSchema,
  webdavTestSchema,
  type MigrateFromIndexedDB,
  type WebDAVConfigInput,
  type WebDAVTestInput,
} from '../schemas.js';

export const syncRouter = Router();

async function isWebDAVEnabledFromDB(): Promise<boolean> {
  const cfg = await getPublicConfig();
  return cfg.enabled && cfg.url.length > 0;
}

syncRouter.get('/status', asyncHandler(async (_req, res) => {
  const state = await prisma.syncState.findUnique({ where: { id: 'webdav-sync' } });
  const cfg = await getPublicConfig();
  res.json({
    webdavEnabled: cfg.enabled && cfg.url.length > 0,
    lastSyncAt: state ? Number(state.lastSyncAt) : null,
    lastSyncStatus: state?.lastSyncStatus ?? null,
    lastError: state?.lastError ?? null,
    syncInterval: cfg.syncInterval,
  });
}));

syncRouter.get('/config', asyncHandler(async (_req, res) => {
  const cfg = await getPublicConfig();
  res.json(cfg);
}));

syncRouter.put(
  '/config',
  validateBody(webdavConfigSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as WebDAVConfigInput;
    await updateConfig(body);
    // 配置变更：重启调度器以应用新间隔 / 启停
    await reloadSyncScheduler();
    const cfg = await getPublicConfig();
    res.json(cfg);
  })
);

syncRouter.post(
  '/test-connection',
  validateBody(webdavTestSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as WebDAVTestInput;
    const result = await testConnection({
      url: body.url,
      username: body.username,
      password: body.password,
      encryptionKey: body.encryptionKey,
    });
    if (!result.ok) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }
    res.json({ success: true });
  })
);

syncRouter.get('/dump', asyncHandler(async (_req, res) => {
  const data = await collectExportData();
  res.setHeader('Content-Type', 'application/json');
  res.send(data);
}));

syncRouter.post('/export', asyncHandler(async (_req, res) => {
  if (!(await isWebDAVEnabledFromDB())) {
    throw new HttpError(400, 'WebDAV is not enabled or not configured');
  }
  const result = await triggerManualSync();
  if (!result.success) {
    throw new HttpError(500, result.error ?? 'Failed to export to WebDAV');
  }
  res.json({ success: true, path: result.path });
}));

syncRouter.post('/import', asyncHandler(async (_req, res) => {
  if (!(await isWebDAVEnabledFromDB())) {
    throw new HttpError(400, 'WebDAV is not enabled or not configured');
  }
  const success = await importFromWebDAV();
  res.json({ success });
}));

syncRouter.get('/backups', asyncHandler(async (_req, res) => {
  if (!(await isWebDAVEnabledFromDB())) {
    throw new HttpError(400, 'WebDAV is not enabled or not configured');
  }
  const backups = await listBackups();
  res.json(backups);
}));

syncRouter.post(
  '/migrate-from-indexeddb',
  validateBody(migrateFromIndexedDBSchema),
  asyncHandler(async (req, res) => {
    const body = req.body as MigrateFromIndexedDB;

    await prisma.$transaction(async (tx) => {
      if (body.chatWindows && body.chatWindows.length > 0) {
        for (const cw of body.chatWindows) {
          await tx.subTopic.deleteMany({ where: { chatWindowId: cw.id } });
          await tx.chatWindow.upsert({
            where: { id: cw.id },
            update: {
              title: cw.title,
              config: cw.config as never,
              activeSubTopicId: cw.activeSubTopicId,
              titleGenerated: cw.titleGenerated ?? false,
              updatedAt: BigInt(cw.updatedAt),
              subTopics: {
                create: (cw.subTopics ?? []).map(st => ({
                  id: st.id,
                  title: st.title,
                  messages: st.messages as never,
                  createdAt: BigInt(st.createdAt),
                  updatedAt: BigInt(st.updatedAt),
                })),
              },
            },
            create: {
              id: cw.id,
              title: cw.title,
              config: cw.config as never,
              activeSubTopicId: cw.activeSubTopicId,
              titleGenerated: cw.titleGenerated ?? false,
              createdAt: BigInt(cw.createdAt),
              updatedAt: BigInt(cw.updatedAt),
              subTopics: {
                create: (cw.subTopics ?? []).map(st => ({
                  id: st.id,
                  title: st.title,
                  messages: st.messages as never,
                  createdAt: BigInt(st.createdAt),
                  updatedAt: BigInt(st.updatedAt),
                })),
              },
            },
          });
        }
      }

      if (body.settings !== undefined) {
        await tx.appSetting.upsert({
          where: { key: 'app-settings' },
          update: { value: body.settings as never },
          create: { key: 'app-settings', value: body.settings as never },
        });
      }

      if (body.modelConfigs !== undefined) {
        await tx.modelConfigStore.upsert({
          where: { key: 'model-configs' },
          update: { value: body.modelConfigs as never },
          create: { key: 'model-configs', value: body.modelConfigs as never },
        });
      }

      if (body.bookmarks && body.bookmarks.length > 0) {
        for (const b of body.bookmarks) {
          await tx.bookmark.upsert({
            where: { id: b.id },
            update: {
              messageId: b.messageId,
              windowId: b.windowId,
              subTopicId: b.subTopicId,
              messagePreview: b.messagePreview,
              messageRole: b.messageRole,
              windowTitle: b.windowTitle,
              createdAt: BigInt(b.createdAt),
            },
            create: {
              id: b.id,
              messageId: b.messageId,
              windowId: b.windowId,
              subTopicId: b.subTopicId,
              messagePreview: b.messagePreview,
              messageRole: b.messageRole,
              windowTitle: b.windowTitle,
              createdAt: BigInt(b.createdAt),
            },
          });
        }
      }

      if (body.templates && body.templates.length > 0) {
        for (const t of body.templates) {
          await tx.template.upsert({
            where: { id: t.id },
            update: {
              name: t.name,
              description: t.description,
              systemInstruction: t.systemInstruction,
              isBuiltIn: t.isBuiltIn ?? false,
              updatedAt: BigInt(t.updatedAt),
            },
            create: {
              id: t.id,
              name: t.name,
              description: t.description,
              systemInstruction: t.systemInstruction,
              isBuiltIn: t.isBuiltIn ?? false,
              createdAt: BigInt(t.createdAt),
              updatedAt: BigInt(t.updatedAt),
            },
          });
        }
      }

      if (body.images && body.images.length > 0) {
        for (const img of body.images) {
          await tx.imageRecord.upsert({
            where: { id: img.id },
            update: {
              data: img.data as never,
              updatedAt: BigInt(img.updatedAt ?? img.createdAt),
            },
            create: {
              id: img.id,
              data: img.data as never,
              createdAt: BigInt(img.createdAt),
              updatedAt: BigInt(img.updatedAt ?? img.createdAt),
            },
          });
        }
      }
    });

    res.json({ success: true });
  })
);

syncRouter.delete('/all', asyncHandler(async (_req, res) => {
  await prisma.$transaction(async (tx) => {
    await tx.subTopic.deleteMany({});
    await tx.chatWindow.deleteMany({});
    await tx.bookmark.deleteMany({});
    await tx.template.deleteMany({});
    await tx.imageRecord.deleteMany({});
    await tx.appSetting.deleteMany({});
    await tx.modelConfigStore.deleteMany({});
  });
  res.json({ success: true });
}));
