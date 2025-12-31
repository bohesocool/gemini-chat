/**
 * ChatWindow Store 子话题操作
 * 需求: 2.1, 2.4 - 拆分子话题操作到独立文件
 */

import type { ChatWindow, SubTopic } from '../../types/chatWindow';
import { createDefaultSubTopic } from '../../types/chatWindow';
import { saveChatWindow } from '../../services/storage';
import { storeLogger } from '../../services/logger';
import { generateId } from './utils';
import type { SetState, GetState } from './types';

/**
 * 创建子话题操作
 */
export const createSubtopicActions = (set: SetState, get: GetState) => ({
  // 创建子话题
  // 需求: 5.1, 5.2
  createSubTopic: (windowId: string, title?: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    if (!window) {
      return null;
    }

    const subTopicId = generateId();
    const newSubTopic = createDefaultSubTopic(subTopicId, title || `话题 ${window.subTopics.length + 1}`);

    const updatedWindow: ChatWindow = {
      ...window,
      subTopics: [...window.subTopics, newSubTopic],
      activeSubTopicId: newSubTopic.id,
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? updatedWindow : w
      ),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 .catch(console.error)
    saveChatWindow(updatedWindow).catch((error) => {
      storeLogger.error('保存新子话题失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
    });

    return newSubTopic;
  },

  // 更新子话题
  // 需求: 5.3
  updateSubTopic: async (windowId: string, subTopicId: string, updates: Partial<SubTopic>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    if (!window) {
      return;
    }

    const subTopicIndex = window.subTopics.findIndex((st) => st.id === subTopicId);
    if (subTopicIndex === -1) {
      return;
    }

    const existingSubTopic = window.subTopics[subTopicIndex];
    if (!existingSubTopic) {
      return;
    }

    const updatedSubTopic: SubTopic = {
      ...existingSubTopic,
      ...updates,
      updatedAt: Date.now(),
    };

    const updatedSubTopics = [...window.subTopics];
    updatedSubTopics[subTopicIndex] = updatedSubTopic;

    const updatedWindow: ChatWindow = {
      ...window,
      subTopics: updatedSubTopics,
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? updatedWindow : w
      ),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('更新子话题失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
    }
  },

  // 删除子话题
  deleteSubTopic: async (windowId: string, subTopicId: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    if (!window) {
      return;
    }

    // 不能删除最后一个子话题
    if (window.subTopics.length <= 1) {
      set({ error: '至少需要保留一个子话题' });
      return;
    }

    const newSubTopics = window.subTopics.filter((st) => st.id !== subTopicId);
    
    // 如果删除的是当前活动子话题，切换到第一个
    let newActiveSubTopicId = window.activeSubTopicId;
    if (window.activeSubTopicId === subTopicId) {
      const firstSubTopic = newSubTopics[0];
      newActiveSubTopicId = firstSubTopic ? firstSubTopic.id : '';
    }

    const updatedWindow: ChatWindow = {
      ...window,
      subTopics: newSubTopics,
      activeSubTopicId: newActiveSubTopicId,
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? updatedWindow : w
      ),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('删除子话题失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
    }
  },

  // 选择子话题
  selectSubTopic: (windowId: string, subTopicId: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    if (!window) {
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      return;
    }

    const updatedWindow: ChatWindow = {
      ...window,
      activeSubTopicId: subTopicId,
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === windowId ? updatedWindow : w
      ),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 .catch(console.error)
    saveChatWindow(updatedWindow).catch((error) => {
      storeLogger.error('保存子话题选择失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
    });
  },
});
