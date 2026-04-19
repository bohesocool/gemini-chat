/**
 * IndexedDB → 服务端数据库迁移工具
 * 当用户首次启用 DB 模式时，自动检测本地数据并提示迁移
 */

import { isApiMode } from './storageAdapter';
import { migrateFromIndexedDB } from './apiClient';
import * as idbStorage from './storage';
import * as idbBookmarks from './bookmarkStorage';
import * as idbImages from './imageStorage';
import * as idbTemplates from './templateStorage';

const MIGRATION_DONE_KEY = 'gemini-chat-db-migration-done';

export function isMigrationDone(): boolean {
  return localStorage.getItem(MIGRATION_DONE_KEY) === 'true';
}

export function markMigrationDone(): void {
  localStorage.setItem(MIGRATION_DONE_KEY, 'true');
}

export async function hasLocalData(): Promise<boolean> {
  try {
    const windows = await idbStorage.getAllChatWindows();
    return windows.length > 0;
  } catch {
    return false;
  }
}

export function shouldPromptMigration(): boolean {
  return isApiMode() && !isMigrationDone();
}

export async function performMigrationToServer(): Promise<{ success: boolean; counts: Record<string, number> }> {
  const counts: Record<string, number> = {};

  const chatWindows = await idbStorage.getAllChatWindows();
  counts.chatWindows = chatWindows.length;

  let settings: unknown = null;
  try {
    settings = await idbStorage.getSettings();
  } catch { /* no settings */ }

  let modelConfigs: unknown = null;
  try {
    modelConfigs = await idbStorage.loadModelConfigs();
  } catch { /* no configs */ }

  let bookmarks: unknown[] = [];
  try {
    bookmarks = await idbBookmarks.loadBookmarks();
    counts.bookmarks = bookmarks.length;
  } catch { /* no bookmarks */ }

  let templates: unknown[] = [];
  try {
    templates = await idbTemplates.loadTemplates();
    counts.templates = templates.length;
  } catch { /* no templates */ }

  let images: unknown[] = [];
  try {
    images = await idbImages.loadImages();
    counts.images = images.length;
  } catch { /* no images */ }

  const result = await migrateFromIndexedDB({
    chatWindows: chatWindows.length > 0 ? chatWindows : undefined,
    settings: settings ?? undefined,
    modelConfigs: modelConfigs ?? undefined,
    bookmarks: bookmarks.length > 0 ? bookmarks : undefined,
    templates: templates.length > 0 ? templates : undefined,
    images: images.length > 0 ? images : undefined,
  });

  if (result.success) {
    markMigrationDone();
  }

  return { success: result.success, counts };
}
