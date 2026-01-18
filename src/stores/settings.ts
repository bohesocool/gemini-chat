/**
 * 设置状态管理
 * 需求: 1.1, 1.3, 2.1, 2.2, 2.5, 3.1, 3.2, 12.1, 12.2, 12.4
 */

import { create } from 'zustand';
import type { AppSettings, ApiConfig, ThemeMode } from '../types/models';
import type { GenerationConfig, SafetySetting } from '../types/gemini';
import { DEFAULT_APP_SETTINGS } from '../types/models';
import { saveSettings, getSettings } from '../services/storage';
import { testConnection as testApiConnection, normalizeApiEndpoint } from '../services/gemini';
import { storeLogger } from '../services/logger';

// ============ Store 状态接口 ============

/**
 * 设置 Store 状态
 */
interface SettingsState {
  // API 配置
  /** API 端点地址 */
  apiEndpoint: string;
  /** API 密钥 */
  apiKey: string;
  /** 当前选择的模型 */
  currentModel: string;

  // 生成配置
  /** 生成配置参数 */
  generationConfig: GenerationConfig;

  // 安全设置
  /** 安全设置列表 */
  safetySettings: SafetySetting[];

  // 系统指令
  /** 全局系统指令 */
  systemInstruction: string;

  // UI 设置
  /** 主题模式 */
  theme: ThemeMode;
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 是否启用流式输出 - Requirements: 10.5, 10.6 */
  streamingEnabled: boolean;
  /** 是否启用 Files API 上传模式 - Requirements: 1.2, 1.5 */
  filesApiEnabled: boolean;
  /** 自定义主题色 */
  customThemeColor?: string;

  // 状态标志
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 连接测试状态 */
  connectionStatus: 'idle' | 'testing' | 'success' | 'error';
  /** 连接错误信息 */
  connectionError: string | null;
}

// ============ Store 操作接口 ============

/**
 * 设置 Store 操作
 */
interface SettingsActions {
  // 初始化
  /** 从存储加载设置 */
  loadSettings: () => Promise<void>;

  // API 配置操作
  /** 更新 API 配置 */
  updateApiConfig: (config: Partial<ApiConfig>) => void;
  /** 设置 API 端点 */
  setApiEndpoint: (endpoint: string) => void;
  /** 设置 API 密钥 */
  setApiKey: (apiKey: string) => void;
  /** 设置当前模型 */
  setCurrentModel: (model: string) => void;

  // 生成配置操作
  /** 更新生成配置 */
  updateGenerationConfig: (config: Partial<GenerationConfig>) => void;

  // 安全设置操作
  /** 更新安全设置 */
  updateSafetySettings: (settings: SafetySetting[]) => void;

  // 系统指令操作
  /** 更新系统指令 */
  updateSystemInstruction: (instruction: string) => void;

  // UI 设置操作
  /** 设置主题 */
  setTheme: (theme: ThemeMode) => void;
  /** 切换侧边栏折叠状态 */
  toggleSidebar: () => void;
  /** 设置侧边栏折叠状态 */
  setSidebarCollapsed: (collapsed: boolean) => void;
  /** 设置流式输出开关 - Requirements: 10.5 */
  setStreamingEnabled: (enabled: boolean) => void;
  /** 设置 Files API 开关 - Requirements: 1.2, 1.5 */
  setFilesApiEnabled: (enabled: boolean) => void;
  /** 设置自定义主题色 */
  setCustomThemeColor: (color: string) => void;

  // 连接测试
  /** 测试 API 连接，可指定测试模型 */
  testConnection: (modelId?: string) => Promise<boolean>;

  // 工具方法
  /** 获取当前 API 配置 */
  getApiConfig: () => ApiConfig;
  /** 获取完整设置对象 */
  getFullSettings: () => AppSettings;
  /** 重置为默认设置 */
  resetToDefaults: () => void;
}

// ============ Store 类型 ============

export type SettingsStore = SettingsState & SettingsActions;

// ============ 持久化辅助函数 ============

/**
 * 将当前状态保存到存储
 */
async function persistSettings(state: SettingsState): Promise<void> {
  const settings: AppSettings = {
    apiEndpoint: state.apiEndpoint,
    apiKey: state.apiKey,
    currentModel: state.currentModel,
    generationConfig: state.generationConfig,
    safetySettings: state.safetySettings,
    systemInstruction: state.systemInstruction,
    theme: state.theme,
    sidebarCollapsed: state.sidebarCollapsed,
    streamingEnabled: state.streamingEnabled,
    filesApiEnabled: state.filesApiEnabled,
    customThemeColor: state.customThemeColor,
  };
  await saveSettings(settings);
}

// ============ Store 创建 ============

/**
 * 创建设置 Store
 */
export const useSettingsStore = create<SettingsStore>((set, get) => ({
  // 初始状态
  apiEndpoint: DEFAULT_APP_SETTINGS.apiEndpoint,
  apiKey: DEFAULT_APP_SETTINGS.apiKey,
  currentModel: DEFAULT_APP_SETTINGS.currentModel,
  generationConfig: { ...DEFAULT_APP_SETTINGS.generationConfig },
  safetySettings: [...DEFAULT_APP_SETTINGS.safetySettings],
  systemInstruction: DEFAULT_APP_SETTINGS.systemInstruction,
  theme: DEFAULT_APP_SETTINGS.theme,
  sidebarCollapsed: DEFAULT_APP_SETTINGS.sidebarCollapsed,
  streamingEnabled: DEFAULT_APP_SETTINGS.streamingEnabled,
  filesApiEnabled: DEFAULT_APP_SETTINGS.filesApiEnabled,
  customThemeColor: DEFAULT_APP_SETTINGS.customThemeColor,
  initialized: false,
  isLoading: false,
  connectionStatus: 'idle',
  connectionError: null,

  // 从存储加载设置
  loadSettings: async () => {
    set({ isLoading: true });
    try {
      const settings = await getSettings();
      set({
        apiEndpoint: settings.apiEndpoint,
        apiKey: settings.apiKey,
        currentModel: settings.currentModel,
        generationConfig: { ...settings.generationConfig },
        safetySettings: [...settings.safetySettings],
        systemInstruction: settings.systemInstruction,
        theme: settings.theme,
        sidebarCollapsed: settings.sidebarCollapsed,
        streamingEnabled: settings.streamingEnabled ?? DEFAULT_APP_SETTINGS.streamingEnabled,
        filesApiEnabled: settings.filesApiEnabled ?? DEFAULT_APP_SETTINGS.filesApiEnabled,
        customThemeColor: settings.customThemeColor,
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
      storeLogger.error('加载设置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      set({ initialized: true, isLoading: false });
    }
  },

  // 更新 API 配置
  updateApiConfig: (config: Partial<ApiConfig>) => {
    const updates: Partial<SettingsState> = {};
    if (config.endpoint !== undefined) {
      updates.apiEndpoint = config.endpoint;
    }
    if (config.apiKey !== undefined) {
      updates.apiKey = config.apiKey;
    }
    if (config.model !== undefined) {
      updates.currentModel = config.model;
    }
    set(updates);
    // 异步持久化
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化 API 配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置 API 端点
  setApiEndpoint: (endpoint: string) => {
    set({ apiEndpoint: endpoint, connectionStatus: 'idle', connectionError: null });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化 API 端点失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置 API 密钥
  setApiKey: (apiKey: string) => {
    set({ apiKey, connectionStatus: 'idle', connectionError: null });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化 API 密钥失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置当前模型
  setCurrentModel: (model: string) => {
    set({ currentModel: model });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化当前模型失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 更新生成配置
  updateGenerationConfig: (config: Partial<GenerationConfig>) => {
    const currentConfig = get().generationConfig;
    const newConfig = { ...currentConfig, ...config };
    set({ generationConfig: newConfig });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化生成配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 更新安全设置
  updateSafetySettings: (settings: SafetySetting[]) => {
    set({ safetySettings: [...settings] });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化安全设置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 更新系统指令
  updateSystemInstruction: (instruction: string) => {
    set({ systemInstruction: instruction });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化系统指令失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置主题
  setTheme: (theme: ThemeMode) => {
    set({ theme });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化主题设置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 切换侧边栏
  toggleSidebar: () => {
    const current = get().sidebarCollapsed;
    set({ sidebarCollapsed: !current });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化侧边栏状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置侧边栏折叠状态
  setSidebarCollapsed: (collapsed: boolean) => {
    set({ sidebarCollapsed: collapsed });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化侧边栏折叠状态失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置流式输出开关
  // Requirements: 10.5 - 流式设置持久化存储
  setStreamingEnabled: (enabled: boolean) => {
    set({ streamingEnabled: enabled });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化流式输出设置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置 Files API 开关
  // Requirements: 1.2, 1.5 - Files API 设置持久化存储
  setFilesApiEnabled: (enabled: boolean) => {
    set({ filesApiEnabled: enabled });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化 Files API 设置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 设置自定义主题色
  setCustomThemeColor: (color: string) => {
    set({ customThemeColor: color });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化自定义主题色失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },

  // 测试连接
  // 需求: 1.4 - 支持指定模型进行测试
  testConnection: async (modelId?: string) => {
    set({ connectionStatus: 'testing', connectionError: null });
    try {
      const config = get().getApiConfig();
      // 需求: 1.5 - 使用规范化后的端点进行测试（支持空端点使用官方地址）
      const normalizedEndpoint = normalizeApiEndpoint(config.endpoint);
      // 如果指定了模型 ID，使用指定的模型进行测试
      const testConfig = modelId
        ? { ...config, endpoint: normalizedEndpoint, model: modelId }
        : { ...config, endpoint: normalizedEndpoint };
      const result = await testApiConnection(testConfig);
      if (result.success) {
        set({ connectionStatus: 'success', connectionError: null });
        return true;
      } else {
        set({ connectionStatus: 'error', connectionError: result.error || '连接失败' });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      set({ connectionStatus: 'error', connectionError: errorMessage });
      return false;
    }
  },

  // 获取 API 配置
  getApiConfig: () => {
    const state = get();
    return {
      endpoint: state.apiEndpoint,
      apiKey: state.apiKey,
      model: state.currentModel,
    };
  },

  // 获取完整设置
  getFullSettings: () => {
    const state = get();
    return {
      apiEndpoint: state.apiEndpoint,
      apiKey: state.apiKey,
      currentModel: state.currentModel,
      generationConfig: { ...state.generationConfig },
      safetySettings: [...state.safetySettings],
      systemInstruction: state.systemInstruction,
      theme: state.theme,
      sidebarCollapsed: state.sidebarCollapsed,
      streamingEnabled: state.streamingEnabled,
      filesApiEnabled: state.filesApiEnabled,
      customThemeColor: state.customThemeColor,
    };
  },

  // 重置为默认设置
  resetToDefaults: () => {
    set({
      apiEndpoint: DEFAULT_APP_SETTINGS.apiEndpoint,
      apiKey: DEFAULT_APP_SETTINGS.apiKey,
      currentModel: DEFAULT_APP_SETTINGS.currentModel,
      generationConfig: { ...DEFAULT_APP_SETTINGS.generationConfig },
      safetySettings: [...DEFAULT_APP_SETTINGS.safetySettings],
      systemInstruction: DEFAULT_APP_SETTINGS.systemInstruction,
      theme: DEFAULT_APP_SETTINGS.theme,
      sidebarCollapsed: DEFAULT_APP_SETTINGS.sidebarCollapsed,
      streamingEnabled: DEFAULT_APP_SETTINGS.streamingEnabled,
      filesApiEnabled: DEFAULT_APP_SETTINGS.filesApiEnabled,
      customThemeColor: DEFAULT_APP_SETTINGS.customThemeColor,
      connectionStatus: 'idle',
      connectionError: null,
    });
    // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
    persistSettings(get()).catch((error) => {
      storeLogger.error('持久化默认设置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    });
  },
}));
