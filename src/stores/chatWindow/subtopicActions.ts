/**
 * ChatWindow Store 子话题操作
 * 需求: 2.1, 2.4 - 拆分子话题操作到独立文件
 * 使用 Immer draft 写法简化状态更新
 */

import type { SubTopic } from '../../types/chatWindow';
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
  // 使用 Immer draft 写法：直接 push 到 draft 的 subTopics 数组
  createSubTopic: (windowId: string, title?: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    if (!window) {
      return null;
    }

    const subTopicId = generateId();
    const newSubTopic = createDefaultSubTopic(subTopicId, title || `话题 ${window.subTopics.length + 1}`);

    // Immer draft 写法：直接修改 draft 中的窗口对象
    set((state) => {
      const w = state.windows.find((w) => w.id === windowId);
      if (w) {
        w.subTopics.push(newSubTopic);
        w.activeSubTopicId = newSubTopic.id;
        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 .catch(console.error)
    const latestWindow = get().windows.find((w) => w.id === windowId);
    if (latestWindow) {
      saveChatWindow(latestWindow).catch((error) => {
        storeLogger.error('保存新子话题失败', {
          error: error instanceof Error ? error.message : '未知错误',
          windowId,
          subTopicId,
        });
      });
    }

    return newSubTopic;
  },

  // 更新子话题
  // 需求: 5.3
  // 使用 Immer draft 写法：用 find 定位 draft 中的子话题，直接 Object.assign 更新
  updateSubTopic: async (windowId: string, subTopicId: string, updates: Partial<SubTopic>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);
    
    if (!window) {
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      return;
    }

    // Immer draft 写法：直接修改 draft 中的子话题对象
    set((state) => {
      const w = state.windows.find((w) => w.id === windowId);
      if (w) {
        const st = w.subTopics.find((st) => st.id === subTopicId);
        if (st) {
          Object.assign(st, updates);
          st.updatedAt = Date.now();
        }
        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const updatedWindow = get().windows.find((w) => w.id === windowId);
      if (updatedWindow) {
        await saveChatWindow(updatedWindow);
      }
    } catch (error) {
      storeLogger.error('更新子话题失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
    }
  },

  // 删除子话题
  // 使用 Immer draft 写法：用 splice 从 draft 的 subTopics 数组移除
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

    // Immer draft 写法：直接操作 draft 数组
    set((state) => {
      const w = state.windows.find((w) => w.id === windowId);
      if (w) {
        const index = w.subTopics.findIndex((st) => st.id === subTopicId);
        if (index !== -1) {
          w.subTopics.splice(index, 1);
        }

        // 如果删除的是当前活动子话题，切换到第一个
        if (w.activeSubTopicId === subTopicId) {
          const firstSubTopic = w.subTopics[0];
          w.activeSubTopicId = firstSubTopic ? firstSubTopic.id : '';
        }

        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const updatedWindow = get().windows.find((w) => w.id === windowId);
      if (updatedWindow) {
        await saveChatWindow(updatedWindow);
      }
    } catch (error) {
      storeLogger.error('删除子话题失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
    }
  },

  // 选择子话题
  // 使用 Immer draft 写法：直接赋值 draft 窗口的 activeSubTopicId
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

    // Immer draft 写法：直接修改 draft 中的窗口对象
    set((state) => {
      const w = state.windows.find((w) => w.id === windowId);
      if (w) {
        w.activeSubTopicId = subTopicId;
        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 .catch(console.error)
    const latestWindow = get().windows.find((w) => w.id === windowId);
    if (latestWindow) {
      saveChatWindow(latestWindow).catch((error) => {
        storeLogger.error('保存子话题选择失败', {
          error: error instanceof Error ? error.message : '未知错误',
          windowId,
          subTopicId,
        });
      });
    }
  },
});
