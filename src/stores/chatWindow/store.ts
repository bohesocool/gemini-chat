/**
 * ChatWindow Store 主文件
 * 需求: 2.1 - 组合所有 actions，导出 useChatWindowStore
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { ChatWindowStore } from './types';
import { createWindowActions } from './windowActions';
import { createSubtopicActions } from './subtopicActions';
import { createMessageActions } from './messageActions';

/**
 * 创建聊天窗口 Store
 * 使用 Immer 中间件包装，支持可变风格的 draft 写法更新状态
 */
export const useChatWindowStore = create<ChatWindowStore>()(
  immer((set, get) => ({
  // ============ 初始状态 ============
  windows: [],
  activeWindowId: null,
  isLoading: false,
  isSending: false,
  error: null,
  streamingText: '',
  streamingThought: '',
  initialized: false,
  currentRequestController: null,

  // ============ 窗口操作 ============
  ...createWindowActions(set, get),

  // ============ 子话题操作 ============
  ...createSubtopicActions(set, get),

  // ============ 消息操作 ============
  ...createMessageActions(set, get),

  // ============ 工具方法 ============
  
  // 获取当前活动窗口
  getActiveWindow: () => {
    const state = get();
    if (!state.activeWindowId) {
      return null;
    }
    return state.windows.find((w) => w.id === state.activeWindowId) || null;
  },

  // 获取当前活动子话题
  getActiveSubTopic: () => {
    const state = get();
    const window = state.getActiveWindow();
    if (!window) {
      return null;
    }
    return window.subTopics.find((st) => st.id === window.activeSubTopicId) || null;
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },

  // 清除流式文本
  clearStreamingText: () => {
    set({ streamingText: '' });
  },

  // 清除流式思维链内容 - 需求: 4.1
  clearStreamingThought: () => {
    set({ streamingThought: '' });
  },

  // 获取当前对话的累计 Token 使用量
  // 需求: 7.3 - Property 14: Token 累计计算
  getTotalTokenUsage: (windowId: string, subTopicId: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    // 默认返回零值
    const defaultUsage = {
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    };
    
    if (!window) {
      return defaultUsage;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      return defaultUsage;
    }

    // 累计所有消息的 Token 使用量
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;

    for (const message of subTopic.messages) {
      if (message.tokenUsage) {
        totalPromptTokens += message.tokenUsage.promptTokens || 0;
        totalCompletionTokens += message.tokenUsage.completionTokens || 0;
      }
    }

    return {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens: totalPromptTokens + totalCompletionTokens,
    };
  },
})));
