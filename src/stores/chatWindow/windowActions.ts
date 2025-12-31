/**
 * ChatWindow Store 窗口操作
 * 需求: 2.1, 2.4 - 拆分窗口操作到独立文件
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
  createWindow: (config?: Partial<ChatWindowConfig>) => {
    const windowId = generateId();
    const subTopicId = generateId();
    
    // 合并默认配置和传入的配置
    const windowConfig: ChatWindowConfig = {
      ...DEFAULT_CHAT_WINDOW_CONFIG,
      ...config,
    };
    
    const newWindow = createDefaultChatWindow(
      windowId,
      '新对话',
      windowConfig,
      subTopicId
    );

    set((state) => ({
      windows: [newWindow, ...state.windows],
      activeWindowId: newWindow.id,
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 .catch(console.error)
    saveChatWindow(newWindow).catch((error) => {
      storeLogger.error('保存新窗口失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
      });
    });

    return newWindow;
  },

  // 更新窗口
  // 需求: 4.5
  updateWindow: async (id: string, updates: Partial<ChatWindow>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    
    if (!window) {
      return;
    }

    const updatedWindow: ChatWindow = {
      ...window,
      ...updates,
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? updatedWindow : w
      ),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('更新聊天窗口失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 删除窗口
  deleteWindow: async (id: string) => {
    const state = get();
    
    // 从列表中移除
    const newWindows = state.windows.filter((w) => w.id !== id);
    
    // 如果删除的是当前窗口，切换到第一个窗口或清空
    let newActiveId = state.activeWindowId;
    if (state.activeWindowId === id) {
      const firstWindow = newWindows[0];
      newActiveId = firstWindow ? firstWindow.id : null;
    }

    set({
      windows: newWindows,
      activeWindowId: newActiveId,
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
  selectWindow: (id: string) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    if (window) {
      set({ activeWindowId: id, error: null });
    }
  },

  // 更新窗口配置
  // 需求: 4.1, 4.2, 4.3, 4.5, 4.6, 1.6, 2.6
  updateWindowConfig: async (id: string, config: Partial<ChatWindowConfig>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    
    if (!window) {
      return;
    }

    // 深度合并 advancedConfig，确保思考程度和图片配置正确持久化
    // 需求: 1.6, 2.6
    const mergedAdvancedConfig: ModelAdvancedConfig | undefined = config.advancedConfig !== undefined
      ? {
          ...window.config.advancedConfig,
          ...config.advancedConfig,
          // 深度合并 imageConfig
          imageConfig: config.advancedConfig?.imageConfig !== undefined
            ? {
                ...window.config.advancedConfig?.imageConfig,
                ...config.advancedConfig.imageConfig,
              }
            : window.config.advancedConfig?.imageConfig,
        }
      : window.config.advancedConfig;

    const updatedWindow: ChatWindow = {
      ...window,
      config: {
        ...window.config,
        ...config,
        generationConfig: {
          ...window.config.generationConfig,
          ...(config.generationConfig || {}),
        },
        advancedConfig: mergedAdvancedConfig,
      },
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? updatedWindow : w
      ),
    }));

    // 异步保存到存储
    // 需求: 4.6 - 配置持久化
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('更新窗口配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 更新窗口高级配置
  // 需求: 1.6, 2.6, 4.5 - 思考程度和图片配置持久化
  updateAdvancedConfig: async (id: string, advancedConfig: Partial<ModelAdvancedConfig>) => {
    const state = get();
    const window = state.windows.find((w) => w.id === id);
    
    if (!window) {
      return;
    }

    // 深度合并 advancedConfig
    const mergedAdvancedConfig: ModelAdvancedConfig = {
      ...window.config.advancedConfig,
      ...advancedConfig,
      // 深度合并 imageConfig
      imageConfig: advancedConfig.imageConfig !== undefined
        ? {
            ...window.config.advancedConfig?.imageConfig,
            ...advancedConfig.imageConfig,
          }
        : window.config.advancedConfig?.imageConfig,
    };

    const updatedWindow: ChatWindow = {
      ...window,
      config: {
        ...window.config,
        advancedConfig: mergedAdvancedConfig,
      },
      updatedAt: Date.now(),
    };

    set((state) => ({
      windows: state.windows.map((w) =>
        w.id === id ? updatedWindow : w
      ),
    }));

    // 异步保存到存储，实时保存配置修改
    // 需求: 4.5 - 实时保存并应用
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('更新高级配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId: id,
      });
    }
  },

  // 重新排序窗口列表
  // 需求: 7.5
  reorderWindows: async (windows: ChatWindow[]) => {
    set({ windows });
    
    // 异步保存所有窗口到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      const { saveAllChatWindows } = await import('../../services/storage');
      await saveAllChatWindows(windows);
    } catch (error) {
      storeLogger.error('保存窗口排序失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowCount: windows.length,
      });
    }
  },
});
