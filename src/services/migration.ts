/**
 * 数据迁移服务
 * 将旧版 Conversation 数据迁移到新版 ChatWindow 格式
 * 需求: 12.4
 */

import type { ChatWindow, ChatWindowConfig, SubTopic, LegacyConversation } from '../types/chatWindow';
import { DEFAULT_CHAT_WINDOW_CONFIG } from '../types/chatWindow';
import type { Conversation } from '../types/models';
import { storageLogger } from './logger';

// ============ 常量定义 ============

/** 存储版本键名 */
const STORAGE_VERSION_KEY = 'gemini-chat-storage-version';

/** 当前存储版本 */
export const CURRENT_STORAGE_VERSION = 2;

/** 旧版存储版本（Conversation 格式） */
export const LEGACY_STORAGE_VERSION = 1;

// ============ 版本检测 ============

/**
 * 获取当前存储版本
 * @returns 存储版本号，如果不存在则返回 1（旧版）
 */
export function getStorageVersion(): number {
  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  if (version === null) {
    return LEGACY_STORAGE_VERSION;
  }
  return parseInt(version, 10) || LEGACY_STORAGE_VERSION;
}

/**
 * 设置存储版本
 * @param version 版本号
 */
export function setStorageVersion(version: number): void {
  localStorage.setItem(STORAGE_VERSION_KEY, version.toString());
}

/**
 * 检查是否需要迁移
 * @returns 是否需要迁移
 */
export function needsMigration(): boolean {
  return getStorageVersion() < CURRENT_STORAGE_VERSION;
}

// ============ ID 生成 ============

/**
 * 生成唯一 ID
 * @returns 唯一标识符
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

// ============ 数据迁移函数 ============

/**
 * 将旧版 Conversation 迁移到新版 ChatWindow
 * 
 * 迁移规则：
 * 1. 保留原有的 id、title、createdAt
 * 2. 将 model 和 systemInstruction 迁移到 config
 * 3. 将 messages 迁移到默认子话题
 * 4. 使用默认配置填充缺失的配置项
 * 
 * @param conversation 旧版对话数据
 * @param defaultConfig 默认配置（可选）
 * @returns 新版聊天窗口数据
 */
export function migrateConversationToChatWindow(
  conversation: LegacyConversation | Conversation,
  defaultConfig: Partial<ChatWindowConfig> = {}
): ChatWindow {
  const now = Date.now();
  const subTopicId = generateId();

  // 创建默认子话题，包含原有消息
  const defaultSubTopic: SubTopic = {
    id: subTopicId,
    title: '主话题',
    messages: conversation.messages || [],
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  };

  // 合并配置
  const config: ChatWindowConfig = {
    model: conversation.model || DEFAULT_CHAT_WINDOW_CONFIG.model,
    generationConfig: {
      ...DEFAULT_CHAT_WINDOW_CONFIG.generationConfig,
      ...defaultConfig.generationConfig,
    },
    systemInstruction: conversation.systemInstruction || defaultConfig.systemInstruction || '',
    safetySettings: defaultConfig.safetySettings || DEFAULT_CHAT_WINDOW_CONFIG.safetySettings,
  };

  return {
    id: conversation.id,
    title: conversation.title,
    config,
    subTopics: [defaultSubTopic],
    activeSubTopicId: subTopicId,
    createdAt: conversation.createdAt,
    updatedAt: now,
  };
}

/**
 * 批量迁移对话数据
 * @param conversations 旧版对话列表
 * @param defaultConfig 默认配置（可选）
 * @returns 新版聊天窗口列表
 */
export function migrateConversationsToChatWindows(
  conversations: (LegacyConversation | Conversation)[],
  defaultConfig: Partial<ChatWindowConfig> = {}
): ChatWindow[] {
  return conversations.map(conv => migrateConversationToChatWindow(conv, defaultConfig));
}

// ============ 数据验证 ============

/**
 * 验证是否为旧版 Conversation 格式
 * @param data 要验证的数据
 * @returns 是否为旧版格式
 */
export function isLegacyConversation(data: unknown): data is LegacyConversation {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 旧版格式：直接包含 messages 数组，没有 subTopics
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    Array.isArray(obj.messages) &&
    typeof obj.model === 'string' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number' &&
    !('subTopics' in obj) &&
    !('config' in obj)
  );
}

/**
 * 验证是否为新版 ChatWindow 格式
 * @param data 要验证的数据
 * @returns 是否为新版格式
 */
export function isChatWindow(data: unknown): data is ChatWindow {
  if (typeof data !== 'object' || data === null) {
    return false;
  }

  const obj = data as Record<string, unknown>;

  // 新版格式：包含 config 和 subTopics
  return (
    typeof obj.id === 'string' &&
    typeof obj.title === 'string' &&
    typeof obj.config === 'object' &&
    obj.config !== null &&
    Array.isArray(obj.subTopics) &&
    typeof obj.activeSubTopicId === 'string' &&
    typeof obj.createdAt === 'number' &&
    typeof obj.updatedAt === 'number'
  );
}

// ============ 迁移执行 ============

/**
 * 执行数据迁移（如果需要）
 * 
 * 此函数会检查存储版本，如果需要迁移则执行迁移操作
 * 迁移完成后会更新存储版本号
 * 
 * @param loadLegacyData 加载旧版数据的函数
 * @param saveNewData 保存新版数据的函数
 * @param defaultConfig 默认配置（可选）
 * @returns 迁移是否执行
 */
export async function performMigrationIfNeeded(
  loadLegacyData: () => Promise<(LegacyConversation | Conversation)[]>,
  saveNewData: (windows: ChatWindow[]) => Promise<void>,
  defaultConfig: Partial<ChatWindowConfig> = {}
): Promise<boolean> {
  // 检查是否需要迁移
  if (!needsMigration()) {
    return false;
  }

  try {
    // 加载旧版数据
    const legacyData = await loadLegacyData();

    // 如果没有数据，直接更新版本号
    if (legacyData.length === 0) {
      setStorageVersion(CURRENT_STORAGE_VERSION);
      return true;
    }

    // 执行迁移
    const chatWindows = migrateConversationsToChatWindows(legacyData, defaultConfig);

    // 保存新版数据
    await saveNewData(chatWindows);

    // 更新存储版本
    setStorageVersion(CURRENT_STORAGE_VERSION);

    return true;
  } catch (error) {
    storageLogger.error('数据迁移失败:', error);
    throw new Error(`数据迁移失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 重置存储版本（用于测试）
 */
export function resetStorageVersion(): void {
  localStorage.removeItem(STORAGE_VERSION_KEY);
}
