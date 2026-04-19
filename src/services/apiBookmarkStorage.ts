/**
 * API 书签存储实现
 */

import { api } from './apiClient';
import type { Bookmark } from '../stores/bookmark/types';

export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  await api.post('/bookmarks/batch', { bookmarks });
}

export async function loadBookmarks(): Promise<Bookmark[]> {
  return api.get<Bookmark[]>('/bookmarks');
}

export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  await api.post('/bookmarks', bookmark);
}

export async function deleteBookmark(id: string): Promise<void> {
  await api.del(`/bookmarks/${id}`);
}

export async function getBookmarkByMessageId(messageId: string): Promise<Bookmark | null> {
  return api.get<Bookmark | null>(`/bookmarks/by-message/${messageId}`);
}

export async function clearBookmarks(): Promise<void> {
  await api.del('/bookmarks');
}
