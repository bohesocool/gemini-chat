/**
 * 浏览器端 WebDAV 同步编排
 *
 * 负责：
 *   - 从各个 IndexedDB store 收集数据（chatWindows、settings、modelConfigs、bookmarks、templates、images）
 *   - 打包成与服务端 `collectExportData()` 完全一致的 JSON 结构（两端备份互通）
 *   - 调用协议层完成上传 / 下载
 *   - 下载回来时反向写入 IndexedDB
 */

import * as idbStorage from '../storage';
import * as idbBookmarks from '../bookmarkStorage';
import * as idbImages from '../imageStorage';
import * as idbTemplates from '../templateStorage';
import type { Bookmark } from '../../stores/bookmark/types';
import type { PromptTemplate } from '../../stores/template/types';
import type { GeneratedImage, ChatWindow } from '../../types';
import {
  uploadBackup as protoUpload,
  downloadLatestBackup as protoDownload,
  cleanupOldBackups as protoCleanup,
  type WebDAVRuntimeConfig,
} from './protocol';
import { getFullConfig } from './configStorage';

const BACKUP_VERSION = '2.0';

interface BackupPayload {
  version: string;
  exportedAt: number;
  chatWindows: ChatWindow[];
  settings: unknown;
  modelConfigs: unknown;
  bookmarks: Bookmark[];
  templates: PromptTemplate[];
  images: GeneratedImage[];
}

export async function collectExportDataFromIndexedDB(): Promise<string> {
  const chatWindows = await idbStorage.getAllChatWindows().catch(() => [] as ChatWindow[]);
  let settings: unknown = null;
  try {
    settings = await idbStorage.getSettings();
  } catch { /* ignore */ }
  let modelConfigs: unknown = null;
  try {
    modelConfigs = await idbStorage.loadModelConfigs();
  } catch { /* ignore */ }

  const bookmarks = await idbBookmarks.loadBookmarks().catch(() => [] as Bookmark[]);
  const templates = await idbTemplates.loadTemplates().catch(() => [] as PromptTemplate[]);
  const images = await idbImages.loadImages().catch(() => [] as GeneratedImage[]);

  const payload: BackupPayload = {
    version: BACKUP_VERSION,
    exportedAt: Date.now(),
    chatWindows,
    settings,
    modelConfigs,
    bookmarks,
    templates,
    images,
  };
  return JSON.stringify(payload, null, 2);
}

export async function importBackupToIndexedDB(jsonData: string): Promise<void> {
  const data = JSON.parse(jsonData) as Partial<BackupPayload>;

  if (Array.isArray(data.chatWindows)) {
    await idbStorage.saveAllChatWindows(data.chatWindows as ChatWindow[]);
  }

  if (data.settings && typeof data.settings === 'object') {
    try {
      await idbStorage.saveSettings(data.settings as never);
    } catch { /* ignore invalid settings */ }
  }

  if (Array.isArray(data.modelConfigs)) {
    await idbStorage.saveModelConfigs(data.modelConfigs as never);
  }

  if (Array.isArray(data.bookmarks)) {
    await idbBookmarks.saveBookmarks(data.bookmarks as Bookmark[]);
  }

  if (Array.isArray(data.templates)) {
    await idbTemplates.saveTemplates(data.templates as PromptTemplate[]);
  }

  if (Array.isArray(data.images)) {
    for (const img of data.images as GeneratedImage[]) {
      try {
        await idbImages.saveImage(img);
      } catch { /* ignore single-image errors */ }
    }
  }
}

export async function buildRuntimeConfig(): Promise<WebDAVRuntimeConfig | null> {
  const cfg = await getFullConfig();
  if (!cfg.enabled || !cfg.url) return null;
  return {
    url: cfg.url,
    username: cfg.username,
    password: cfg.password,
    encryptionKey: cfg.encryptionKey || undefined,
    maxBackups: cfg.maxBackups,
  };
}

export interface SyncResult {
  success: boolean;
  path?: string;
  error?: string;
}

export async function runBrowserSyncOnce(): Promise<SyncResult> {
  const runtime = await buildRuntimeConfig();
  if (!runtime) {
    return { success: false, error: 'WebDAV is disabled or URL is empty' };
  }
  try {
    const json = await collectExportDataFromIndexedDB();
    const path = await protoUpload(runtime, json);
    await protoCleanup(runtime).catch(() => 0);
    await writeSyncState({ success: true });
    return { success: true, path };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    await writeSyncState({ success: false, error });
    return { success: false, error };
  }
}

export async function runBrowserImportOnce(): Promise<SyncResult> {
  const runtime = await buildRuntimeConfig();
  if (!runtime) {
    return { success: false, error: 'WebDAV is disabled or URL is empty' };
  }
  try {
    const json = await protoDownload(runtime);
    if (!json) return { success: false, error: 'No backup found on remote' };
    await importBackupToIndexedDB(json);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ==================== 本地同步状态（存 localStorage） ====================

const SYNC_STATE_KEY = 'gemini-chat-webdav-sync-state';

export interface SyncStateSnapshot {
  lastSyncAt: number | null;
  lastSyncStatus: 'success' | 'error' | null;
  lastError: string | null;
}

export function readSyncState(): SyncStateSnapshot {
  try {
    const raw = localStorage.getItem(SYNC_STATE_KEY);
    if (!raw) return { lastSyncAt: null, lastSyncStatus: null, lastError: null };
    const parsed = JSON.parse(raw) as SyncStateSnapshot;
    return parsed;
  } catch {
    return { lastSyncAt: null, lastSyncStatus: null, lastError: null };
  }
}

async function writeSyncState(res: { success: boolean; error?: string }): Promise<void> {
  const state: SyncStateSnapshot = {
    lastSyncAt: Date.now(),
    lastSyncStatus: res.success ? 'success' : 'error',
    lastError: res.success ? null : res.error ?? null,
  };
  try {
    localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(state));
  } catch { /* storage quota etc */ }
}
