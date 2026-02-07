/**
 * ChatWindow Store 窗口操作
 * 需求: 2.1, 2.4 - 拆分窗口操作到独立文件
 * 使用 Immer draft 写法简化状态更新
 */

import type { ChatWindow, ChatWindowConfig } from '../../types/chatWindow';
import type { ModelAdvancedConfig } from '../../types/models';
import { 
  DEFAULT_CHAT_WINDOW_CONFIG, 
  createDefaultChatWindow, 
} from '../../types/chatWindow';
import {
  saveChatWindow,
  getAllChatWindows,
  deleteChatWindow as deleteChatWindowFromStorage,
} from '../../services/storage';
import { storeLogger } from '../../services/logger';
import { generateId } from './utils';
import type { SetState, GetState } from './types';

/**
 * 创建窗口操作
 */
export const createWindowActions = (set: SetState, get: GetState) => ({
  // 从存储加载所有窗口
  // 需求: 4.6
  loadWindows: async () => {
    storeLogger.info('开始加载聊天窗口');
    set({ isLoading: true, error: null });
    try {
      const windows = await getAllChatWindows();
      storeLogger.info('聊天窗口加载完成', { count: windows.length });
      set({
        windows,
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      // 需求: 2.4 - 输出错误日志
      storeLogger.error('加载聊天窗口失败', { error: error instanceof Error ? error.message : '未知错误' });
      set({
        error: error instanceof Error ? error.message : '加载聊天窗口失败',
        initialized: true,
        isLoading: false,
      });
    }
  },

  // 创建新窗口
  // 需求: 4.4 - 新窗口继承全局默认配置
  // 使用 Immer draft 写法：直接 unshift 到 draft 的 windows 数组
  createWindow: (config?: Partial<ChatWindowConfig>, title?: string, subTopicTitle?: string) => {
    const windowId = generateId();
    const subTopicId = generateId();
    
    // 合并默认配置和传入的配置
    const windowConfig: ChatWindowConfig = {
      ...DEFAULT_CHAT_WINDOW_CONFIG,
      ...config,
    };
    
    const newWindow = createDefaultChatWindow(
      windowId,
      title || '新对话',
      windowConfig,
      subTopicId,
      subTopicTitle
    );

    // Immer draft 写法：直接 unshift 到 windows 数组，直接赋值 activeWindowId
    set((state) => {
      state.windows.unshift(newWindow);
      state.activeWindowId = newWindow.id;
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 .catch(console.error)
    const latestWindow = get().windows.find((w) => w.id === windowId);
    if (latestWindow) {
      saveChatWindow(latestWindow).catch((error) => {
        storeLogger.error('保存新窗口失败', {
          error: error instanceof Error ? error.message : '未知错误',
          windowId,
        });
      });
    }

    return newWindow;
  },

  // 更新窗口
  // 需求: 4.5
  // 使用 Immer draft 写法：用 find 定位 draft 中的窗口，直接 Object.assign 更新属性
  updateWindow: async (id: string, updates: Partial<ChatWindow>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    
    if (!window) {
      return;
    }

    // Immer draft 写法：直接修改 draft 中的窗口对象
    set((state) => {
      const w = state.windows.find((w) => w.id === id);
      if (w) {
        Object.assign(w, updates);
        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const updatedWindow = get().windows.find((w) => w.id === id);
      if (updatedWindow) {
        await saveChatWindow(updatedWindow);
      }
    } catch (error) {
      storeLogger.error('更新聊天窗口失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 删除窗口
  // 使用 Immer draft 写法：用 splice 从 draft 的 windows 数组移除
  deleteWindow: async (id: string) => {
    // Immer draft 写法：直接操作 draft 数组
    set((state) => {
      const index = state.windows.findIndex((w) => w.id === id);
      if (index !== -1) {
        state.windows.splice(index, 1);
      }

      // 如果删除的是当前窗口，切换到第一个窗口或清空
      if (state.activeWindowId === id) {
        const firstWindow = state.windows[0];
        state.activeWindowId = firstWindow ? firstWindow.id : null;
      }
    });

    // 异步从存储删除
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await deleteChatWindowFromStorage(id);
    } catch (error) {
      storeLogger.error('删除聊天窗口失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 选择窗口
  // 使用 Immer draft 写法：直接赋值 state.activeWindowId
  selectWindow: (id: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    if (window) {
      set((state) => {
        state.activeWindowId = id;
        state.error = null;
      });
    }
  },

  // 更新窗口配置
  // 需求: 4.1, 4.2, 4.3, 4.5, 4.6, 1.6, 2.6
  // 使用 Immer draft 写法：直接赋值 draft 窗口的 config 属性，替代多层展开运算符
  updateWindowConfig: async (id: string, config: Partial<ChatWindowConfig>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    
    if (!window) {
      return;
    }

    // Immer draft 写法：直接修改 draft 中窗口的 config 属性
    set((state) => {
      const w = state.windows.find((w) => w.id === id);
      if (w) {
        // 深度合并 generationConfig
        if (config.generationConfig) {
          w.config.generationConfig = {
            ...w.config.generationConfig,
            ...config.generationConfig,
          };
        }

        // 深度合并 advancedConfig，确保思考程度和图片配置正确持久化
        // 需求: 1.6, 2.6
        if (config.advancedConfig !== undefined) {
          w.config.advancedConfig = {
            ...w.config.advancedConfig,
            ...config.advancedConfig,
            // 深度合并 imageConfig
            imageConfig: config.advancedConfig?.imageConfig !== undefined
              ? {
                  ...w.config.advancedConfig?.imageConfig,
                  ...config.advancedConfig.imageConfig,
                }
              : w.config.advancedConfig?.imageConfig,
          };
        }

        // 合并其他顶层 config 属性（排除已单独处理的 generationConfig 和 advancedConfig）
        const { generationConfig: _gc, advancedConfig: _ac, ...restConfig } = config;
        Object.assign(w.config, restConfig);

        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储
    // 需求: 4.6 - 配置持久化
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const updatedWindow = get().windows.find((w) => w.id === id);
      if (updatedWindow) {
        await saveChatWindow(updatedWindow);
      }
    } catch (error) {
      storeLogger.error('更新窗口配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 更新窗口高级配置
  // 需求: 1.6, 2.6, 4.5 - 思考程度和图片配置持久化
  // 使用 Immer draft 写法：直接赋值 draft 窗口的 config.advancedConfig 属性
  updateAdvancedConfig: async (id: string, advancedConfig: Partial<ModelAdvancedConfig>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    
    if (!window) {
      return;
    }

    // Immer draft 写法：直接赋值 config.advancedConfig
    set((state) => {
      const w = state.windows.find((w) => w.id === id);
      if (w) {
        // 深度合并 advancedConfig
        w.config.advancedConfig = {
          ...w.config.advancedConfig,
          ...advancedConfig,
          // 深度合并 imageConfig
          imageConfig: advancedConfig.imageConfig !== undefined
            ? {
                ...w.config.advancedConfig?.imageConfig,
                ...advancedConfig.imageConfig,
              }
            : w.config.advancedConfig?.imageConfig,
        };
        w.updatedAt = Date.now();
      }
    });

    // 从 get() 获取最新状态后异步保存到存储，实时保存配置修改
    // 需求: 4.5 - 实时保存并应用
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const updatedWindow = get().windows.find((w) => w.id === id);
      if (updatedWindow) {
        await saveChatWindow(updatedWindow);
      }
    } catch (error) {
      storeLogger.error('更新高级配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 重新排序窗口列表
  // 需求: 7.5
  // 使用 Immer draft 写法：直接赋值 state.windows
  reorderWindows: async (windows: ChatWindow[]) => {
    set((state) => {
      state.windows = windows;
    });
    
    // 异步保存所有窗口到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const { saveAllChatWindows } = await import('../../services/storage');
      const latestWindows = get().windows;
      await saveAllChatWindows(latestWindows);
    } catch (error) {
      storeLogger.error('保存窗口排序失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowCount: windows.length,
      });
    }
  },
});
