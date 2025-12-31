/**
 * ChatWindow Store 类型定义
 * 需求: 2.1 - 拆分类型定义到独立文件
 */

import type { 
  ChatWindow, 
  ChatWindowConfig, 
  SubTopic 
} from '../../types/chatWindow';
import type { Attachment, ApiConfig, ModelAdvancedConfig, MessageTokenUsage } from '../../types/models';

// ============ Store 状态接口 ============

/**
 * 聊天窗口 Store 状态
 */
export interface ChatWindowState {
  /** 所有聊天窗口 */
  windows: ChatWindow[];
  /** 当前活动窗口 ID */
  activeWindowId: string | null;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 是否正在发送消息 */
  isSending: boolean;
  /** 错误信息 */
  error: string | null;
  /** 流式响应文本 */
  streamingText: string;
  /** 流式思维链内容 - 需求: 4.1 */
  streamingThought: string;
  /** 是否已初始化 */
  initialized: boolean;
  /** 当前请求的 AbortController - 需求: 5.1, 5.2 */
  currentRequestController: AbortController | null;
}

// ============ Store 操作接口 ============

/**
 * 聊天窗口 Store 操作
 */
export interface ChatWindowActions {
  // 窗口操作
  /** 从存储加载所有窗口 */
  loadWindows: () => Promise<void>;
  /** 创建新窗口 */
  createWindow: (config?: Partial<ChatWindowConfig>) => ChatWindow;
  /** 更新窗口 */
  updateWindow: (id: string, updates: Partial<ChatWindow>) => Promise<void>;
  /** 删除窗口 */
  deleteWindow: (id: string) => Promise<void>;
  /** 选择窗口 */
  selectWindow: (id: string) => void;
  
  // 配置操作
  /** 更新窗口配置 */
  updateWindowConfig: (id: string, config: Partial<ChatWindowConfig>) => Promise<void>;
  /** 更新窗口高级配置（思考程度、图片配置等） */
  updateAdvancedConfig: (id: string, advancedConfig: Partial<ModelAdvancedConfig>) => Promise<void>;
  
  // 子话题操作
  /** 创建子话题 */
  createSubTopic: (windowId: string, title?: string) => SubTopic | null;
  /** 更新子话题 */
  updateSubTopic: (windowId: string, subTopicId: string, updates: Partial<SubTopic>) => Promise<void>;
  /** 删除子话题 */
  deleteSubTopic: (windowId: string, subTopicId: string) => Promise<void>;
  /** 选择子话题 */
  selectSubTopic: (windowId: string, subTopicId: string) => void;
  
  // 消息操作
  /** 发送消息 */
  sendMessage: (
    windowId: string,
    subTopicId: string,
    content: string,
    attachments?: Attachment[],
    apiConfig?: ApiConfig,
    advancedConfig?: ModelAdvancedConfig
  ) => Promise<void>;
  
  // 工具方法
  /** 获取当前活动窗口 */
  getActiveWindow: () => ChatWindow | null;
  /** 获取当前活动子话题 */
  getActiveSubTopic: () => SubTopic | null;
  /** 清除错误 */
  clearError: () => void;
  /** 清除流式文本 */
  clearStreamingText: () => void;
  /** 清除流式思维链内容 - 需求: 4.1 */
  clearStreamingThought: () => void;
  
  // 排序操作
  /** 重新排序窗口列表 */
  reorderWindows: (windows: ChatWindow[]) => Promise<void>;
  
  // 请求取消操作
  // 需求: 5.1, 5.2, 5.3, 5.4
  /** 取消当前请求 */
  cancelRequest: () => void;
  
  // 消息编辑和重新生成操作
  // 需求: 3.2, 4.1, 4.3
  /** 编辑消息（删除后续消息并重新发送） */
  editMessage: (
    windowId: string,
    subTopicId: string,
    messageId: string,
    newContent: string
  ) => Promise<void>;
  /** 重新生成 AI 消息 */
  regenerateMessage: (
    windowId: string,
    subTopicId: string,
    messageId: string
  ) => Promise<void>;
  
  // Token 统计操作
  // 需求: 7.3
  /** 获取当前对话的累计 Token 使用量 */
  getTotalTokenUsage: (windowId: string, subTopicId: string) => MessageTokenUsage;
  
  // 消息错误状态操作
  /** 更新消息的错误状态 */
  updateMessageError: (
    windowId: string,
    subTopicId: string,
    messageId: string,
    error: string | null
  ) => Promise<void>;
  
  // 用户消息重试操作
  /** 重试发送失败的用户消息（不创建新消息，直接请求 AI 响应） */
  retryUserMessage: (
    windowId: string,
    subTopicId: string,
    messageId: string
  ) => Promise<void>;
  
  // 消息删除操作
  /** 删除指定消息及其后续所有消息 */
  deleteMessage: (
    windowId: string,
    subTopicId: string,
    messageId: string
  ) => Promise<void>;
}

// ============ Store 类型 ============

export type ChatWindowStore = ChatWindowState & ChatWindowActions;

// ============ Zustand 辅助类型 ============

import type { StoreApi } from 'zustand';

export type SetState = StoreApi<ChatWindowStore>['setState'];
export type GetState = StoreApi<ChatWindowStore>['getState'];
