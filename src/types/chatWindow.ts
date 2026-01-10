/**
 * 聊天窗口相关类型定义
 * 需求: 12.1, 12.2, 12.3
 */

import type { GenerationConfig, SafetySetting } from './gemini';
import type { Message, ModelAdvancedConfig } from './models';

// ============ 聊天窗口配置 ============

/**
 * 聊天窗口配置
 * 每个聊天窗口独立的配置，包括模型选择、生成参数、系统指令等
 * 需求: 4.1, 4.2, 4.3, 1.6, 2.6
 */
export interface ChatWindowConfig {
  /** 使用的模型 ID */
  model: string;
  /** 生成参数配置 */
  generationConfig: GenerationConfig;
  /** 系统指令（可选） */
  systemInstruction?: string;
  /** 安全设置（可选） */
  safetySettings?: SafetySetting[];
  /** 高级参数配置（思考程度、图片配置等） */
  advancedConfig?: ModelAdvancedConfig;
  /** 对话级别流式响应设置（undefined 表示使用全局设置） */
  streamingEnabled?: boolean;
  /** 是否启用联网搜索（默认 false） */
  webSearchEnabled?: boolean;
  /** 是否启用 URL 上下文（默认 false） */
  urlContextEnabled?: boolean;
}

// ============ 子话题 ============

/**
 * 子话题
 * 聊天窗口内的独立对话线程，共享父窗口的预设配置但保持独立的消息历史
 * 需求: 12.2, 5.1, 5.2, 5.3
 */
export interface SubTopic {
  /** 子话题唯一标识 */
  id: string;
  /** 子话题标题 */
  title: string;
  /** 消息历史记录 */
  messages: Message[];
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

// ============ 聊天窗口 ============

/**
 * 聊天窗口（原 Conversation）
 * 一个独立的对话空间，包含自己的模型配置、系统指令预设，可包含多个子话题
 * 需求: 12.1, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
 */
export interface ChatWindow {
  /** 窗口唯一标识 */
  id: string;
  /** 窗口标题 */
  title: string;
  /** 窗口配置（独立于全局设置） */
  config: ChatWindowConfig;
  /** 子话题列表 */
  subTopics: SubTopic[];
  /** 当前活动的子话题 ID */
  activeSubTopicId: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

// ============ 旧版数据格式（用于迁移） ============

/**
 * 旧版对话格式
 * 用于数据迁移，将旧版 Conversation 转换为新版 ChatWindow
 * 需求: 12.4
 */
export interface LegacyConversation {
  /** 对话唯一标识 */
  id: string;
  /** 对话标题 */
  title: string;
  /** 消息历史 */
  messages: Message[];
  /** 使用的模型 */
  model: string;
  /** 对话级别的系统指令（可选） */
  systemInstruction?: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

// ============ 默认值 ============

/**
 * 默认聊天窗口配置
 */
export const DEFAULT_CHAT_WINDOW_CONFIG: ChatWindowConfig = {
  model: 'gemini-2.5-flash',
  generationConfig: {
    temperature: 1,
    topP: 0.95,
    topK: 40,
  },
  systemInstruction: '',
  safetySettings: [],
  webSearchEnabled: false,
  urlContextEnabled: false,
};

/**
 * 创建默认子话题
 * @param id 子话题 ID
 * @param title 子话题标题
 * @returns 新的子话题对象
 */
export function createDefaultSubTopic(id: string, title: string = '主话题'): SubTopic {
  const now = Date.now();
  return {
    id,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 创建默认聊天窗口
 * @param id 窗口 ID
 * @param title 窗口标题
 * @param config 窗口配置（可选，使用默认配置）
 * @param subTopicId 默认子话题 ID
 * @returns 新的聊天窗口对象
 */
export function createDefaultChatWindow(
  id: string,
  title: string,
  config: Partial<ChatWindowConfig> = {},
  subTopicId: string
): ChatWindow {
  const now = Date.now();
  const defaultSubTopic = createDefaultSubTopic(subTopicId);
  
  return {
    id,
    title,
    config: {
      ...DEFAULT_CHAT_WINDOW_CONFIG,
      ...config,
    },
    subTopics: [defaultSubTopic],
    activeSubTopicId: subTopicId,
    createdAt: now,
    updatedAt: now,
  };
}
