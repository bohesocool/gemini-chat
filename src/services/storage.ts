/**
 * IndexedDB 存储服务
 * 需求: 4.2, 4.3, 4.4, 5.5, 12.5, 12.6
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { Conversation, AppSettings, ExportData, ExportDataV2, ModelConfig, ChatWindow, SubTopic } from '../types';
import { DEFAULT_APP_SETTINGS, EXPORT_DATA_VERSION, EXPORT_DATA_VERSION_V2, GEMINI_MODELS, DEFAULT_CHAT_WINDOW_CONFIG } from '../types';
import { 
  migrateConversationToChatWindow, 
  needsMigration, 
  setStorageVersion, 
  CURRENT_STORAGE_VERSION
} from './migration';
import { storageLogger } from './logger';

// ============ 数据库 Schema 定义 ============

/**
 * 数据库 Schema 接口
 */
interface GeminiChatDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
    indexes: { 'by-updated': number };
  };
  chatWindows: {
    key: string;
    value: ChatWindow;
    indexes: { 'by-updated': number };
  };
  settings: {
    key: string;
    value: AppSettings;
  };
  modelConfigs: {
    key: string;
    value: ModelConfig[];
  };
}

// ============ 常量定义 ============

/** 数据库名称 */
const DB_NAME = 'gemini-chat-db';

/** 数据库版本 - 升级到 4 以修复版本冲突 */
const DB_VERSION = 4;

/** 设置存储的键名 */
const SETTINGS_KEY = 'app-settings';

/** 模型配置存储的键名 */
const MODEL_CONFIGS_KEY = 'model-configs';

// ============ 数据库初始化 ============

/** 数据库实例缓存 */
let dbInstance: IDBPDatabase<GeminiChatDB> | null = null;

/**
 * 获取数据库实例
 * 使用单例模式确保只创建一个数据库连接
 */
async function getDB(): Promise<IDBPDatabase<GeminiChatDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<GeminiChatDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建对话存储（旧版，保留用于迁移）
      if (!db.objectStoreNames.contains('conversations')) {
        const conversationStore = db.createObjectStore('conversations', {
          keyPath: 'id',
        });
        // 创建按更新时间排序的索引
        conversationStore.createIndex('by-updated', 'updatedAt');
      }

      // 创建聊天窗口存储（新版）
      if (!db.objectStoreNames.contains('chatWindows')) {
        const chatWindowStore = db.createObjectStore('chatWindows', {
          keyPath: 'id',
        });
        // 创建按更新时间排序的索引
        chatWindowStore.createIndex('by-updated', 'updatedAt');
      }

      // 创建设置存储
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings');
      }

      // 创建模型配置存储
      if (!db.objectStoreNames.contains('modelConfigs')) {
        db.createObjectStore('modelConfigs');
      }
    },
  });

  return dbInstance;
}


// ============ 对话操作 ============

/**
 * 保存对话
 * 需求: 4.2, 5.5
 * @param conversation 要保存的对话
 */
export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conversation);
}

/**
 * 获取单个对话
 * 需求: 4.3
 * @param id 对话 ID
 * @returns 对话对象，如果不存在则返回 null
 */
export async function getConversation(id: string): Promise<Conversation | null> {
  const db = await getDB();
  const conversation = await db.get('conversations', id);
  return conversation ?? null;
}

/**
 * 获取所有对话
 * 需求: 4.2
 * @returns 按更新时间降序排列的对话列表
 */
export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const conversations = await db.getAllFromIndex('conversations', 'by-updated');
  // 按更新时间降序排列（最新的在前）
  return conversations.reverse();
}

/**
 * 删除对话
 * 需求: 4.4
 * @param id 要删除的对话 ID
 */
export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conversations', id);
}

// ============ 聊天窗口操作 ============

/**
 * 保存聊天窗口
 * 需求: 12.5
 * @param chatWindow 要保存的聊天窗口
 */
export async function saveChatWindow(chatWindow: ChatWindow): Promise<void> {
  const db = await getDB();
  await db.put('chatWindows', chatWindow);
}

/**
 * 获取单个聊天窗口
 * 需求: 12.5
 * @param id 聊天窗口 ID
 * @returns 聊天窗口对象，如果不存在则返回 null
 */
export async function getChatWindow(id: string): Promise<ChatWindow | null> {
  const db = await getDB();
  const chatWindow = await db.get('chatWindows', id);
  return chatWindow ?? null;
}

/**
 * 获取所有聊天窗口
 * 需求: 12.5
 * @returns 按更新时间降序排列的聊天窗口列表
 */
export async function getAllChatWindows(): Promise<ChatWindow[]> {
  const db = await getDB();
  const chatWindows = await db.getAllFromIndex('chatWindows', 'by-updated');
  // 按更新时间降序排列（最新的在前）
  return chatWindows.reverse();
}

/**
 * 删除聊天窗口
 * 需求: 12.5
 * @param id 要删除的聊天窗口 ID
 */
export async function deleteChatWindow(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('chatWindows', id);
}

/**
 * 批量保存聊天窗口
 * 需求: 12.5
 * @param chatWindows 要保存的聊天窗口列表
 */
export async function saveAllChatWindows(chatWindows: ChatWindow[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('chatWindows', 'readwrite');
  for (const chatWindow of chatWindows) {
    await tx.store.put(chatWindow);
  }
  await tx.done;
}

// ============ 子话题操作 ============

/**
 * 添加子话题到聊天窗口
 * 需求: 12.5
 * @param windowId 聊天窗口 ID
 * @param subTopic 要添加的子话题
 * @returns 更新后的聊天窗口，如果窗口不存在则返回 null
 */
export async function addSubTopic(windowId: string, subTopic: SubTopic): Promise<ChatWindow | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) {
    return null;
  }

  chatWindow.subTopics.push(subTopic);
  chatWindow.updatedAt = Date.now();
  await saveChatWindow(chatWindow);
  return chatWindow;
}

/**
 * 更新子话题
 * 需求: 12.5
 * @param windowId 聊天窗口 ID
 * @param subTopicId 子话题 ID
 * @param updates 要更新的字段
 * @returns 更新后的聊天窗口，如果窗口或子话题不存在则返回 null
 */
export async function updateSubTopic(
  windowId: string,
  subTopicId: string,
  updates: Partial<SubTopic>
): Promise<ChatWindow | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) {
    return null;
  }

  const existingSubTopic = chatWindow.subTopics.find(st => st.id === subTopicId);
  if (!existingSubTopic) {
    return null;
  }

  const subTopicIndex = chatWindow.subTopics.findIndex(st => st.id === subTopicId);
  chatWindow.subTopics[subTopicIndex] = {
    id: existingSubTopic.id,
    title: updates.title ?? existingSubTopic.title,
    messages: updates.messages ?? existingSubTopic.messages,
    createdAt: existingSubTopic.createdAt,
    updatedAt: Date.now(),
  };
  chatWindow.updatedAt = Date.now();
  await saveChatWindow(chatWindow);
  return chatWindow;
}

/**
 * 删除子话题
 * 需求: 12.5
 * @param windowId 聊天窗口 ID
 * @param subTopicId 要删除的子话题 ID
 * @returns 更新后的聊天窗口，如果窗口不存在则返回 null
 */
export async function deleteSubTopic(windowId: string, subTopicId: string): Promise<ChatWindow | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) {
    return null;
  }

  chatWindow.subTopics = chatWindow.subTopics.filter(st => st.id !== subTopicId);
  
  // 如果删除的是当前活动子话题，切换到第一个子话题
  if (chatWindow.activeSubTopicId === subTopicId && chatWindow.subTopics.length > 0) {
    const firstSubTopic = chatWindow.subTopics[0];
    if (firstSubTopic) {
      chatWindow.activeSubTopicId = firstSubTopic.id;
    }
  }
  
  chatWindow.updatedAt = Date.now();
  await saveChatWindow(chatWindow);
  return chatWindow;
}

/**
 * 获取子话题
 * 需求: 12.5
 * @param windowId 聊天窗口 ID
 * @param subTopicId 子话题 ID
 * @returns 子话题对象，如果不存在则返回 null
 */
export async function getSubTopic(windowId: string, subTopicId: string): Promise<SubTopic | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) {
    return null;
  }

  const subTopic = chatWindow.subTopics.find(st => st.id === subTopicId);
  return subTopic ?? null;
}

// ============ 数据迁移 ============

/**
 * 执行数据迁移（从旧版 Conversation 到新版 ChatWindow）
 * 需求: 12.5
 * @returns 是否执行了迁移
 */
export async function performDataMigration(): Promise<boolean> {
  if (!needsMigration()) {
    return false;
  }

  try {
    // 加载旧版对话数据
    const conversations = await getAllConversations();

    // 如果没有数据，直接更新版本号
    if (conversations.length === 0) {
      setStorageVersion(CURRENT_STORAGE_VERSION);
      return true;
    }

    // 迁移每个对话到聊天窗口
    const chatWindows: ChatWindow[] = conversations.map(conv => 
      migrateConversationToChatWindow(conv, DEFAULT_CHAT_WINDOW_CONFIG)
    );

    // 保存新版数据
    await saveAllChatWindows(chatWindows);

    // 更新存储版本
    setStorageVersion(CURRENT_STORAGE_VERSION);

    return true;
  } catch (error) {
    storageLogger.error('数据迁移失败:', error);
    throw new Error(`数据迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

// ============ 设置操作 ============

/**
 * 保存设置
 * 需求: 1.3, 2.2
 * @param settings 要保存的设置
 */
export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDB();
  await db.put('settings', settings, SETTINGS_KEY);
}

/**
 * 获取设置
 * @returns 设置对象，如果不存在则返回默认设置
 */
export async function getSettings(): Promise<AppSettings> {
  const db = await getDB();
  const settings = await db.get('settings', SETTINGS_KEY);
  return settings ?? { ...DEFAULT_APP_SETTINGS };
}

// ============ 模型配置操作 ============

/**
 * 保存模型配置列表
 * 需求: 2.5, 5.1
 * @param configs 要保存的模型配置列表
 */
export async function saveModelConfigs(configs: ModelConfig[]): Promise<void> {
  const db = await getDB();
  await db.put('modelConfigs', configs, MODEL_CONFIGS_KEY);
}

/**
 * 加载模型配置列表
 * 需求: 5.2, 5.3
 * @returns 模型配置列表，如果不存在则返回预设模型列表
 */
export async function loadModelConfigs(): Promise<ModelConfig[]> {
  const db = await getDB();
  const configs = await db.get('modelConfigs', MODEL_CONFIGS_KEY);
  if (configs && configs.length > 0) {
    // 创建预设模型的 ID 到描述翻译键的映射
    const presetDescriptions = new Map(
      GEMINI_MODELS.map(m => [m.id, m.description])
    );
    
    // 同步预设模型的描述为翻译键（处理旧版本数据迁移）
    const updatedConfigs = configs.map((config: ModelConfig) => {
      // 如果是预设模型且描述不是翻译键格式，则更新为翻译键
      const presetDesc = presetDescriptions.get(config.id);
      if (presetDesc && !config.isCustom && config.description !== presetDesc) {
        return { ...config, description: presetDesc };
      }
      return config;
    });
    
    // 如果有更新，保存到数据库
    const hasUpdates = updatedConfigs.some(
      (config: ModelConfig, index: number) => config.description !== configs[index]?.description
    );
    if (hasUpdates) {
      await db.put('modelConfigs', updatedConfigs, MODEL_CONFIGS_KEY);
    }
    
    return updatedConfigs;
  }
  // 返回预设模型列表（转换为 ModelConfig 格式）
  return GEMINI_MODELS.map(model => ({
    ...model,
    isCustom: false,
    provider: 'gemini' as const,
  }));
}

/**
 * 重置模型配置到默认值
 * 需求: 5.4
 * @returns 重置后的默认模型配置列表
 */
export async function resetModelConfigs(): Promise<ModelConfig[]> {
  const db = await getDB();
  await db.delete('modelConfigs', MODEL_CONFIGS_KEY);
  // 返回预设模型列表（转换为 ModelConfig 格式）
  return GEMINI_MODELS.map(model => ({
    ...model,
    isCustom: false,
    provider: 'gemini' as const,
  }));
}

// ============ 存储配置描述符 ============

/**
 * 存储版本配置描述符
 * 将 v1/v2 之间的差异（字段名、store 名、版本号、条目验证器、数据获取函数）抽象为配置对象
 * 需求: 1.1, 1.4
 */
interface StorageConfig<T> {
  /** 导出数据版本号 */
  version: string;
  /** 导出 JSON 中的数据字段名（'conversations' | 'chatWindows'） */
  dataKey: string;
  /** IndexedDB object store 名称 */
  storeName: 'conversations' | 'chatWindows';
  /** 单条数据的验证函数 */
  validateItem: (data: unknown) => data is T;
  /** 获取所有数据的函数 */
  fetchAll: () => Promise<T[]>;
}

/**
 * v1 配置：使用 Conversation 类型，对应旧版导出格式
 * 需求: 1.2
 */
const v1Config: StorageConfig<Conversation> = {
  version: EXPORT_DATA_VERSION,
  dataKey: 'conversations',
  storeName: 'conversations',
  validateItem: validateConversation,
  fetchAll: getAllConversations,
};

/**
 * v2 配置：使用 ChatWindow 类型，对应新版导出格式
 * 需求: 1.3
 */
const v2Config: StorageConfig<ChatWindow> = {
  version: EXPORT_DATA_VERSION_V2,
  dataKey: 'chatWindows',
  storeName: 'chatWindows',
  validateItem: validateChatWindow,
  fetchAll: getAllChatWindows,
};

/**
 * 通用验证函数：根据 StorageConfig 验证导入数据的结构
 * 内部函数，不导出
 * 需求: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6
 * @param data 待验证的数据
 * @param config 存储配置描述符
 * @returns 验证结果，true 表示数据结构合法
 */
function validateImportWithConfig<T>(
  data: unknown,
  config: StorageConfig<T>
): boolean {
  // 1. 检查 data 是非空对象
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 2. 检查 version 字段为字符串
  if (typeof obj.version !== 'string') {
    return false;
  }

  // 2. 检查 exportedAt 字段为数字
  if (typeof obj.exportedAt !== 'number') {
    return false;
  }

  // 3. 检查 config.dataKey 对应的字段是数组
  if (!Array.isArray(obj[config.dataKey])) {
    return false;
  }

  // 4. 检查 settings 是非空对象
  if (typeof obj.settings !== 'object' || obj.settings === null) {
    return false;
  }

  // 5. 遍历数组，用 config.validateItem 验证每个条目
  const items = obj[config.dataKey] as unknown[];
  for (const item of items) {
    if (!config.validateItem(item)) {
      return false;
    }
  }

  // 6. 用 validateSettings 验证设置
  if (!validateSettings(obj.settings)) {
    return false;
  }

  return true;
}


// ============ 导入导出功能 ============

/**
 * 通用导出函数：根据 StorageConfig 从 IndexedDB 获取数据并返回 JSON 字符串
 * 内部函数，不导出
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 * @param config 存储配置描述符
 * @returns JSON 格式的导出数据字符串
 */
async function exportWithConfig<T>(
  config: StorageConfig<T>
): Promise<string> {
  // 1. 调用 config.fetchAll() 获取数据
  const items = await config.fetchAll();

  // 2. 调用 getSettings() 获取设置
  const settings = await getSettings();

  // 3. 构建导出对象，使用 config.version 和 config.dataKey
  const exportData: Record<string, unknown> = {
    version: config.version,
    exportedAt: Date.now(),
    [config.dataKey]: items,
    settings,
  };

  // 4. JSON.stringify 带 2 空格缩进
  return JSON.stringify(exportData, null, 2);
}

/**
 * 通用导入函数：根据 StorageConfig 解析 JSON 并写入 IndexedDB
 * 内部函数，不导出
 * 需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * @param jsonString JSON 格式的导入数据字符串
 * @param config 存储配置描述符
 * @throws 如果 JSON 解析失败抛出"无效的 JSON 格式"
 * @throws 如果数据验证失败抛出"导入数据格式无效"
 */
async function importWithConfig<T>(
  jsonString: string,
  config: StorageConfig<T>
): Promise<void> {
  // 1. JSON.parse，失败抛出"无效的 JSON 格式"
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('无效的 JSON 格式');
  }

  // 2. validateImportWithConfig 验证，失败抛出"导入数据格式无效"
  if (!validateImportWithConfig(data, config)) {
    throw new Error('导入数据格式无效');
  }

  const obj = data as Record<string, unknown>;
  const items = obj[config.dataKey] as T[];

  // 3. 开启事务 [config.storeName, 'settings']
  const db = await getDB();
  const tx = db.transaction([config.storeName, 'settings'] as const, 'readwrite');

  // 4. 清除 config.storeName store
  await tx.objectStore(config.storeName).clear();

  // 5. 遍历 data[config.dataKey] 写入条目
  const store = tx.objectStore(config.storeName);
  for (const item of items) {
    await store.put(item as Conversation & ChatWindow);
  }

  // 6. 写入 settings
  await tx.objectStore('settings').put(obj.settings as AppSettings, SETTINGS_KEY);

  // 7. 等待事务完成
  await tx.done;
}

/**
 * 导出所有数据（旧版格式，用于兼容）
 * 薄包装器，委托给 exportWithConfig
 * 需求: 5.1
 * @returns JSON 格式的导出数据字符串
 */
export async function exportAllData(): Promise<string> {
  return exportWithConfig(v1Config);
}

/**
 * 导出所有数据（新版格式，使用 ChatWindow）
 * 薄包装器，委托给 exportWithConfig
 * 需求: 5.2
 * @returns JSON 格式的导出数据字符串
 */
export async function exportAllDataV2(): Promise<string> {
  return exportWithConfig(v2Config);
}

/**
 * 验证导入数据的结构（旧版格式）
 * 薄包装器，委托给 validateImportWithConfig
 * 需求: 5.3
 * @param data 要验证的数据
 * @returns 验证结果
 */
export function validateImportData(data: unknown): data is ExportData {
  return validateImportWithConfig(data, v1Config);
}

/**
 * 验证导入数据的结构（新版格式）
 * 薄包装器，委托给 validateImportWithConfig
 * 需求: 5.4
 * @param data 要验证的数据
 * @returns 验证结果
 */
export function validateImportDataV2(data: unknown): data is ExportDataV2 {
  return validateImportWithConfig(data, v2Config);
}

/**
 * 验证聊天窗口数据结构
 * 需求: 12.6
 */
function validateChatWindow(data: unknown): data is ChatWindow {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const window = data as Record<string, unknown>;

  // 检查基本字段
  if (typeof window.id !== 'string' ||
      typeof window.title !== 'string' ||
      typeof window.activeSubTopicId !== 'string' ||
      typeof window.createdAt !== 'number' ||
      typeof window.updatedAt !== 'number') {
    return false;
  }

  // 检查 config
  if (typeof window.config !== 'object' || window.config === null) {
    return false;
  }

  const config = window.config as Record<string, unknown>;
  if (typeof config.model !== 'string' ||
      typeof config.generationConfig !== 'object') {
    return false;
  }

  // 检查 subTopics
  if (!Array.isArray(window.subTopics)) {
    return false;
  }

  for (const subTopic of window.subTopics) {
    if (!validateSubTopic(subTopic)) {
      return false;
    }
  }

  // 检查可选字段 titleGenerated（如果存在，必须是布尔值）
  if (window.titleGenerated !== undefined && typeof window.titleGenerated !== 'boolean') {
    return false;
  }

  return true;
}

/**
 * 验证子话题数据结构
 * 需求: 12.6
 */
function validateSubTopic(data: unknown): data is SubTopic {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const subTopic = data as Record<string, unknown>;

  return (
    typeof subTopic.id === 'string' &&
    typeof subTopic.title === 'string' &&
    Array.isArray(subTopic.messages) &&
    typeof subTopic.createdAt === 'number' &&
    typeof subTopic.updatedAt === 'number'
  );
}

/**
 * 验证对话数据结构
 */
function validateConversation(data: unknown): data is Conversation {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const conv = data as Record<string, unknown>;

  return (
    typeof conv.id === 'string' &&
    typeof conv.title === 'string' &&
    Array.isArray(conv.messages) &&
    typeof conv.model === 'string' &&
    typeof conv.createdAt === 'number' &&
    typeof conv.updatedAt === 'number'
  );
}

/**
 * 验证设置数据结构
 */
function validateSettings(data: unknown): data is AppSettings {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const settings = data as Record<string, unknown>;

  return (
    typeof settings.apiEndpoint === 'string' &&
    typeof settings.apiKey === 'string' &&
    typeof settings.currentModel === 'string' &&
    typeof settings.generationConfig === 'object' &&
    Array.isArray(settings.safetySettings) &&
    typeof settings.systemInstruction === 'string' &&
    typeof settings.theme === 'string' &&
    typeof settings.sidebarCollapsed === 'boolean'
  );
}

/**
 * 导入数据（旧版格式）
 * 薄包装器，委托给 importWithConfig
 * 需求: 5.3
 * @param jsonString JSON 格式的导入数据字符串
 * @throws 如果数据格式无效则抛出错误
 */
export async function importData(jsonString: string): Promise<void> {
  return importWithConfig(jsonString, v1Config);
}

/**
 * 导入数据（新版格式，使用 ChatWindow）
 * 薄包装器，委托给 importWithConfig
 * 需求: 5.4
 * @param jsonString JSON 格式的导入数据字符串
 * @throws 如果数据格式无效则抛出错误
 */
export async function importDataV2(jsonString: string): Promise<void> {
  return importWithConfig(jsonString, v2Config);
}

/**
 * 智能导入数据（自动检测新旧格式）
 * 需求: 12.6
 * @param jsonString JSON 格式的导入数据字符串
 * @throws 如果数据格式无效则抛出错误
 */
export async function importDataAuto(jsonString: string): Promise<void> {
  // 解析 JSON
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('无效的 JSON 格式');
  }

  // 检测数据格式
  if (typeof data === 'object' && data !== null) {
    const obj = data as Record<string, unknown>;
    
    // 新版格式：包含 chatWindows 字段
    if ('chatWindows' in obj && Array.isArray(obj.chatWindows)) {
      if (!validateImportDataV2(data)) {
        throw new Error('导入数据格式无效（新版格式）');
      }
      await importDataV2(jsonString);
      return;
    }
    
    // 旧版格式：包含 conversations 字段
    if ('conversations' in obj && Array.isArray(obj.conversations)) {
      if (!validateImportData(data)) {
        throw new Error('导入数据格式无效（旧版格式）');
      }
      
      // 导入旧版数据后，自动迁移到新版格式
      await importData(jsonString);
      
      // 执行迁移
      await performDataMigration();
      return;
    }
  }

  throw new Error('无法识别的导入数据格式');
}

// ============ 工具函数 ============

/**
 * 清除所有数据（用于测试）
 */
export async function clearAllData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['conversations', 'chatWindows', 'settings', 'modelConfigs'], 'readwrite');
  await tx.objectStore('conversations').clear();
  await tx.objectStore('chatWindows').clear();
  await tx.objectStore('settings').clear();
  await tx.objectStore('modelConfigs').clear();
  await tx.done;
}

/**
 * 关闭数据库连接（用于测试清理）
 */
export function closeDB(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * 删除整个数据库（用于测试清理）
 */
export async function deleteDatabase(): Promise<void> {
  closeDB();
  // 使用 indexedDB.deleteDatabase 删除整个数据库
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(DB_NAME);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve(); // 如果被阻塞也继续
  });
}
