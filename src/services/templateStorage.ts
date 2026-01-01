/**
 * 模板持久化存储服务
 * 需求: 5.7
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { PromptTemplate } from '../stores/template/types';
import { DEFAULT_TEMPLATES } from '../stores/template/defaults';

// ============ 数据库 Schema 定义 ============

interface TemplateDB extends DBSchema {
  templates: {
    key: string;
    value: PromptTemplate;
    indexes: { 'by-updated': number };
  };
}

// ============ 常量定义 ============

/** 数据库名称 */
const DB_NAME = 'gemini-chat-templates-db';

/** 数据库版本 */
const DB_VERSION = 1;

// ============ 数据库初始化 ============

/** 数据库实例缓存 */
let dbInstance: IDBPDatabase<TemplateDB> | null = null;

/**
 * 获取数据库实例
 */
async function getDB(): Promise<IDBPDatabase<TemplateDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<TemplateDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('templates')) {
        const store = db.createObjectStore('templates', {
          keyPath: 'id',
        });
        store.createIndex('by-updated', 'updatedAt');
      }
    },
  });

  return dbInstance;
}

// ============ 模板操作 ============

/**
 * 保存所有模板
 * 需求: 5.7
 * @param templates 要保存的模板列表
 */
export async function saveTemplates(templates: PromptTemplate[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('templates', 'readwrite');
  
  // 清除现有数据
  await tx.store.clear();
  
  // 保存所有模板
  for (const template of templates) {
    await tx.store.put(template);
  }
  
  await tx.done;
}

/**
 * 加载所有模板
 * 需求: 5.7
 * @returns 模板列表，如果为空则返回默认模板
 */
export async function loadTemplates(): Promise<PromptTemplate[]> {
  const db = await getDB();
  const templates = await db.getAll('templates');
  
  // 如果没有存储的模板，返回默认模板
  if (templates.length === 0) {
    return [...DEFAULT_TEMPLATES];
  }
  
  return templates;
}

/**
 * 保存单个模板
 * @param template 要保存的模板
 */
export async function saveTemplate(template: PromptTemplate): Promise<void> {
  const db = await getDB();
  await db.put('templates', template);
}

/**
 * 删除单个模板
 * @param id 要删除的模板 ID
 */
export async function deleteTemplate(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('templates', id);
}

/**
 * 获取单个模板
 * @param id 模板 ID
 * @returns 模板对象，如果不存在则返回 null
 */
export async function getTemplate(id: string): Promise<PromptTemplate | null> {
  const db = await getDB();
  const template = await db.get('templates', id);
  return template ?? null;
}

/**
 * 清除所有模板数据（用于测试）
 */
export async function clearTemplates(): Promise<void> {
  const db = await getDB();
  await db.clear('templates');
}

/**
 * 关闭数据库连接（用于测试清理）
 */
export function closeTemplateDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}
