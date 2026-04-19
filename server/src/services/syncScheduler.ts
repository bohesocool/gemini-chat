import { config } from '../config.js';
import { prisma } from '../database.js';
import {
  uploadBackup,
  downloadLatestBackup,
  cleanupOldBackups,
} from './webdav.js';

let syncTimer: ReturnType<typeof setInterval> | null = null;
let isDirty = false;
let syncInFlight: Promise<void> | null = null;

export function markDirty(): void {
  isDirty = true;
}

export async function collectExportData(): Promise<string> {
  const chatWindows = await prisma.chatWindow.findMany({
    include: { subTopics: true },
    orderBy: { updatedAt: 'desc' },
  });

  const settings = await prisma.appSetting.findUnique({ where: { key: 'app-settings' } });
  const modelConfigs = await prisma.modelConfigStore.findUnique({ where: { key: 'model-configs' } });
  const bookmarks = await prisma.bookmark.findMany();
  const templates = await prisma.template.findMany();
  const images = await prisma.imageRecord.findMany();

  const data = {
    version: '2.0',
    exportedAt: Date.now(),
    chatWindows: chatWindows.map(w => ({
      ...w,
      createdAt: Number(w.createdAt),
      updatedAt: Number(w.updatedAt),
      subTopics: w.subTopics.map(st => ({
        ...st,
        createdAt: Number(st.createdAt),
        updatedAt: Number(st.updatedAt),
        chatWindowId: undefined,
      })),
    })),
    settings: settings?.value ?? null,
    modelConfigs: modelConfigs?.value ?? null,
    bookmarks: bookmarks.map(b => ({ ...b, createdAt: Number(b.createdAt) })),
    templates: templates.map(t => ({
      ...t,
      createdAt: Number(t.createdAt),
      updatedAt: Number(t.updatedAt),
    })),
    images: images.map(img => ({
      ...img,
      createdAt: Number(img.createdAt),
      updatedAt: Number(img.updatedAt),
    })),
  };

  return JSON.stringify(data, null, 2);
}

interface SyncResult {
  success: boolean;
  path?: string;
  error?: string;
}

async function recordSyncResult(result: SyncResult): Promise<void> {
  const now = BigInt(Date.now());
  await prisma.syncState.upsert({
    where: { id: 'webdav-sync' },
    update: {
      lastSyncAt: now,
      lastSyncStatus: result.success ? 'success' : 'error',
      lastError: result.success ? null : result.error ?? null,
    },
    create: {
      id: 'webdav-sync',
      lastSyncAt: now,
      lastSyncStatus: result.success ? 'success' : 'error',
      lastError: result.success ? null : result.error ?? null,
    },
  });
}

async function performSyncInternal(manual: boolean): Promise<SyncResult> {
  if (!manual && !isDirty) {
    return { success: true };
  }
  try {
    const exportData = await collectExportData();
    const path = await uploadBackup(exportData);
    await cleanupOldBackups();
    isDirty = false;
    await recordSyncResult({ success: true, path });
    console.log(`[WebDAV] ${manual ? 'Manual' : 'Scheduled'} sync completed at ${new Date().toISOString()}`);
    return { success: true, path };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error('[WebDAV] Sync failed:', error);
    await recordSyncResult({ success: false, error });
    return { success: false, error };
  }
}

async function runSyncWithLock(manual: boolean): Promise<SyncResult> {
  if (syncInFlight) {
    await syncInFlight.catch(() => void 0);
  }
  let result: SyncResult = { success: false };
  const task = (async () => {
    result = await performSyncInternal(manual);
  })();
  syncInFlight = task.finally(() => {
    syncInFlight = null;
  });
  await syncInFlight;
  return result;
}

export async function triggerManualSync(): Promise<SyncResult> {
  return runSyncWithLock(true);
}

export async function importFromWebDAV(): Promise<boolean> {
  const data = await downloadLatestBackup();
  if (!data) return false;

  const parsed = JSON.parse(data);

  await prisma.$transaction(async (tx) => {
    if (Array.isArray(parsed.chatWindows)) {
      for (const cw of parsed.chatWindows) {
        await tx.subTopic.deleteMany({ where: { chatWindowId: cw.id } });
        await tx.chatWindow.upsert({
          where: { id: cw.id },
          update: {
            title: cw.title,
            config: cw.config,
            activeSubTopicId: cw.activeSubTopicId,
            titleGenerated: cw.titleGenerated ?? false,
            updatedAt: BigInt(cw.updatedAt),
            subTopics: {
              create: (cw.subTopics ?? []).map((st: Record<string, unknown>) => ({
                id: st.id as string,
                title: st.title as string,
                messages: st.messages,
                createdAt: BigInt(st.createdAt as number),
                updatedAt: BigInt(st.updatedAt as number),
              })),
            },
          },
          create: {
            id: cw.id,
            title: cw.title,
            config: cw.config,
            activeSubTopicId: cw.activeSubTopicId,
            titleGenerated: cw.titleGenerated ?? false,
            createdAt: BigInt(cw.createdAt),
            updatedAt: BigInt(cw.updatedAt),
            subTopics: {
              create: (cw.subTopics ?? []).map((st: Record<string, unknown>) => ({
                id: st.id as string,
                title: st.title as string,
                messages: st.messages,
                createdAt: BigInt(st.createdAt as number),
                updatedAt: BigInt(st.updatedAt as number),
              })),
            },
          },
        });
      }
    }

    if (parsed.settings !== undefined && parsed.settings !== null) {
      await tx.appSetting.upsert({
        where: { key: 'app-settings' },
        update: { value: parsed.settings },
        create: { key: 'app-settings', value: parsed.settings },
      });
    }

    if (parsed.modelConfigs !== undefined && parsed.modelConfigs !== null) {
      await tx.modelConfigStore.upsert({
        where: { key: 'model-configs' },
        update: { value: parsed.modelConfigs },
        create: { key: 'model-configs', value: parsed.modelConfigs },
      });
    }

    if (Array.isArray(parsed.bookmarks)) {
      for (const b of parsed.bookmarks) {
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

    if (Array.isArray(parsed.templates)) {
      for (const t of parsed.templates) {
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

    if (Array.isArray(parsed.images)) {
      for (const img of parsed.images) {
        await tx.imageRecord.upsert({
          where: { id: img.id },
          update: {
            data: img.data,
            updatedAt: BigInt(img.updatedAt ?? img.createdAt),
          },
          create: {
            id: img.id,
            data: img.data,
            createdAt: BigInt(img.createdAt),
            updatedAt: BigInt(img.updatedAt ?? img.createdAt),
          },
        });
      }
    }
  });

  return true;
}

export function startSyncScheduler(): void {
  if (syncTimer) return;
  isDirty = true;
  syncTimer = setInterval(() => {
    runSyncWithLock(false).catch(err => console.error('[WebDAV] Scheduler error:', err));
  }, config.webdavSyncInterval * 1000);

  runSyncWithLock(false).catch(err => console.error('[WebDAV] Initial sync error:', err));
}

export function stopSyncScheduler(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
