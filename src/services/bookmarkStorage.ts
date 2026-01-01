/**
 * 书签持久化存储服务
 * 需求: 3.2
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Bookmark } from '../stores/bookmark/types';

// ============ 数据库 Schema 定义 ============

interface BookmarkDB extends DBSchema {
  bookmarks: {
    key: string;
    value: Bookmark;
    indexes: { 
      'by-created': number;
      'by-message': string;
    };
  };
}

// ============ 常量定义 ============

/** 数据库名称 */
const DB_NAME = 'gemini-chat-bookmarks-db';

/** 数据库版本 */
const DB_VERSION = 1;

// ============ 数据库初始化 ============

/** 数据库实例缓存 */
let dbInstance: IDBPDatabase<BookmarkDB> | null = null;

/**
 * 获取数据库实例
 */
async function getDB(): Promise<IDBPDatabase<BookmarkDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<BookmarkDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('bookmarks')) {
        const store = db.createObjectStore('bookmarks', {
          keyPath: 'id',
        });
        store.createIndex('by-created', 'createdAt');
        store.createIndex('by-message', 'messageId');
      }
    },
  });

  return dbInstance;
}

// ============ 书签操作 ============

/**
 * 保存所有书签
 * 需求: 3.2
 * @param bookmarks 要保存的书签列表
 */
export async function saveBookmarks(bookmarks: Bookmark[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('bookmarks', 'readwrite');
  
  // 清除现有数据
  await tx.store.clear();
  
  // 保存所有书签
  for (const bookmark of bookmarks) {
    await tx.store.put(bookmark);
  }
  
  await tx.done;
}

/**
 * 加载所有书签
 * 需求: 3.2
 * @returns 书签列表，按创建时间降序排列
 */
export async function loadBookmarks(): Promise<Bookmark[]> {
  const db = await getDB();
  const bookmarks = await db.getAllFromIndex('bookmarks', 'by-created');
  // 按创建时间降序排列（最新的在前）
  return bookmarks.reverse();
}

/**
 * 保存单个书签
 * @param bookmark 要保存的书签
 */
export async function saveBookmark(bookmark: Bookmark): Promise<void> {
  const db = await getDB();
  await db.put('bookmarks', bookmark);
}

/**
 * 删除单个书签
 * @param id 要删除的书签 ID
 */
export async function deleteBookmark(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('bookmarks', id);
}

/**
 * 根据消息 ID 获取书签
 * @param messageId 消息 ID
 * @returns 书签对象，如果不存在则返回 null
 */
export async function getBookmarkByMessageId(messageId: string): Promise<Bookmark | null> {
  const db = await getDB();
  const bookmark = await db.getFromIndex('bookmarks', 'by-message', messageId);
  return bookmark ?? null;
}

/**
 * 清除所有书签数据（用于测试）
 */
export async function clearBookmarks(): Promise<void> {
  const db = await getDB();
  await db.clear('bookmarks');
}

/**
 * 关闭数据库连接（用于测试清理）
 */
export function closeBookmarkDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
