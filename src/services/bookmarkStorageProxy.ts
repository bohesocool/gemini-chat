/**
 * 书签存储代理 - 根据模式切换 IndexedDB / API
 */

import { isApiMode } from './storageAdapter';
import type { Bookmark } from '../stores/bookmark/types';

import * as idb from './bookmarkStorage';
import * as apiStore from './apiBookmarkStorage';

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  return isApiMode() ? apiStore.saveBookmarks(bookmarks) : idb.saveBookmarks(bookmarks);
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  return isApiMode() ? apiStore.loadBookmarks() : idb.loadBookmarks();
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  return isApiMode() ? apiStore.saveBookmark(bookmark) : idb.saveBookmark(bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  return isApiMode() ? apiStore.deleteBookmark(id) : idb.deleteBookmark(id);
}

export async function getBookmarkByMessageId(messageId: string): Promise<Bookmark | null> {
  return isApiMode() ? apiStore.getBookmarkByMessageId(messageId) : idb.getBookmarkByMessageId(messageId);
}

export async function clearBookmarks(): Promise<void> {
  return isApiMode() ? apiStore.clearBookmarks() : idb.clearBookmarks();
}

export { closeBookmarkDB } from './bookmarkStorage';
