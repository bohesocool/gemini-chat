/**
 * 书签状态管理
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

import { create } from 'zustand';
import type { BookmarkStore, CreateBookmarkInput, Bookmark } from './types';
import { saveBookmarks, loadBookmarks as loadBookmarksFromStorage } from '../../services/bookmarkStorage';
import { storeLogger } from '../../services/logger';

/**
 * 生成唯一的书签 ID
 */
function generateBookmarkId(): string {
  return `bookmark-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建书签 Store
 */
export const useBookmarkStore = create<BookmarkStore>((set, get) => ({
  // 初始状态
  bookmarks: [],
  initialized: false,
  isLoading: false,

  /**
   * 从存储加载书签
   * 需求: 3.2
   */
  loadBookmarks: async () => {
    set({ isLoading: true });
    try {
      const bookmarks = await loadBookmarksFromStorage();
      set({
        bookmarks,
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      storeLogger.error('加载书签失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      set({
        bookmarks: [],
        initialized: true,
        isLoading: false,
      });
    }
  },

  /**
   * 添加书签
   * 需求: 3.2
   */
  addBookmark: async (input: CreateBookmarkInput) => {
    // 检查是否已存在
    const existing = get().bookmarks.find(b => b.messageId === input.messageId);
    if (existing) {
      return existing;
    }

    const newBookmark: Bookmark = {
      ...input,
      id: generateBookmarkId(),
      createdAt: Date.now(),
    };

    const updatedBookmarks = [...get().bookmarks, newBookmark];
    set({ bookmarks: updatedBookmarks });

    // 异步持久化
    try {
      await saveBookmarks(updatedBookmarks);
    } catch (error) {
      storeLogger.error('保存书签失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return newBookmark;
  },

  /**
   * 移除书签
   * 需求: 3.6
   */
  removeBookmark: async (messageId: string) => {
    const currentBookmarks = get().bookmarks;
    const bookmark = currentBookmarks.find(b => b.messageId === messageId);
    
    if (!bookmark) {
      return false;
    }

    const updatedBookmarks = currentBookmarks.filter(b => b.messageId !== messageId);
    set({ bookmarks: updatedBookmarks });

    // 异步持久化
    try {
      await saveBookmarks(updatedBookmarks);
    } catch (error) {
      storeLogger.error('删除书签失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }

    return true;
  },

  /**
   * 检查消息是否已收藏
   * 需求: 3.1
   */
  isBookmarked: (messageId: string) => {
    return get().bookmarks.some(b => b.messageId === messageId);
  },

  /**
   * 根据消息 ID 获取书签
   */
  getBookmarkByMessageId: (messageId: string) => {
    return get().bookmarks.find(b => b.messageId === messageId);
  },

  /**
   * 切换书签状态
   * 需求: 3.2
   */
  toggleBookmark: async (input: CreateBookmarkInput) => {
    const isCurrentlyBookmarked = get().isBookmarked(input.messageId);
    
    if (isCurrentlyBookmarked) {
      await get().removeBookmark(input.messageId);
      return false; // 返回 false 表示已取消收藏
    } else {
      await get().addBookmark(input);
      return true; // 返回 true 表示已收藏
    }
  },
}));
