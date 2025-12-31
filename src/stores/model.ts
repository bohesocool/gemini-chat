/**
 * 模型状态管理
 * 需求: 1.1, 2.1, 2.2, 2.3, 2.4, 3.1, 3.5
 */

import { create } from 'zustand';
import type { ModelConfig, ModelAdvancedConfig, ModelCapabilities } from '../types/models';
import { GEMINI_MODELS } from '../types/models';
import {
  saveModelConfigs,
  loadModelConfigs,
  resetModelConfigs,
} from '../services/storage';
import {
  fetchModels,
  mergeModels,
  getEffectiveConfig,
  getEffectiveCapabilities,
  detectModelCapabilities,
  setNewModelsDisabled,
} from '../services/model';
import { storeLogger } from '../services/logger';

// ============ Store 状态接口 ============

/**
 * 模型 Store 状态
 */
interface ModelState {
  /** 所有模型配置（预设 + 自定义） */
  models: ModelConfig[];
  /** 是否正在加载模型列表 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 是否已初始化 */
  initialized: boolean;
}

// ============ Store 操作接口 ============

/**
 * 模型 Store 操作
 */
interface ModelActions {
  // 初始化
  /** 从存储加载模型配置 */
  loadModels: () => Promise<void>;

  // 模型获取
  /** 从 API 获取模型列表 */
  fetchModels: (endpoint: string, apiKey: string) => Promise<void>;

  // CRUD 操作
  /** 添加自定义模型 */
  addModel: (model: ModelConfig) => Promise<void>;
  /** 更新模型配置 */
  updateModel: (modelId: string, updates: Partial<ModelConfig>) => Promise<void>;
  /** 删除模型 */
  deleteModel: (modelId: string) => Promise<void>;

  // 重定向操作
  /** 设置模型重定向 */
  setRedirect: (modelId: string, targetId: string) => Promise<void>;
  /** 清除模型重定向 */
  clearRedirect: (modelId: string) => Promise<void>;

  // 工具方法
  /** 获取模型的有效配置（处理重定向） */
  getEffectiveConfig: (modelId: string) => ModelAdvancedConfig;
  /** 获取模型的有效能力（处理重定向） */
  getEffectiveCapabilities: (modelId: string) => ModelCapabilities;
  /** 根据 ID 获取模型 */
  getModelById: (modelId: string) => ModelConfig | undefined;
  /** 重置为默认模型列表 */
  resetModels: () => Promise<void>;
  /** 清除错误 */
  clearError: () => void;
}

// ============ Store 类型 ============

export type ModelStore = ModelState & ModelActions;

// ============ 辅助函数 ============

/**
 * 将预设模型转换为 ModelConfig 格式
 */
function getDefaultModels(): ModelConfig[] {
  return GEMINI_MODELS.map(model => ({
    ...model,
    isCustom: false,
    provider: 'gemini' as const,
    capabilities: detectModelCapabilities(model.id),
  }));
}

// ============ Store 创建 ============

/**
 * 创建模型 Store
 */
export const useModelStore = create<ModelStore>((set, get) => ({
  // 初始状态
  models: getDefaultModels(),
  isLoading: false,
  error: null,
  initialized: false,

  // 从存储加载模型配置
  // 需求: 5.2
  loadModels: async () => {
    set({ isLoading: true, error: null });
    try {
      const configs = await loadModelConfigs();
      set({
        models: configs,
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
      storeLogger.error('加载模型配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      set({
        error: error instanceof Error ? error.message : '加载模型配置失败',
        initialized: true,
        isLoading: false,
      });
    }
  },

  // 从 API 获取模型列表
  // 需求: 1.1, 1.4, 4.3, 4.4
  fetchModels: async (endpoint: string, apiKey: string) => {
    set({ isLoading: true, error: null });
    try {
      const remoteModels = await fetchModels(endpoint, apiKey);
      const currentModels = get().models;
      
      // 获取当前已有的模型 ID 集合
      const existingModelIds = new Set(currentModels.map(m => m.id));
      
      // 需求 4.4: 新获取的模型默认禁用
      const remoteModelsWithEnabled = setNewModelsDisabled(remoteModels, existingModelIds);
      
      // 合并远程和本地模型
      const mergedModels = mergeModels(remoteModelsWithEnabled, currentModels);
      
      set({
        models: mergedModels,
        isLoading: false,
      });

      // 持久化保存
      await saveModelConfigs(mergedModels);
    } catch (error) {
      // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
      storeLogger.error('获取模型列表失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      // 需求 1.5: 获取失败时显示错误信息并保留现有模型列表
      set({
        error: error instanceof Error ? error.message : '获取模型列表失败',
        isLoading: false,
      });
    }
  },

  // 添加自定义模型
  // 需求: 2.1, 2.2
  addModel: async (model: ModelConfig) => {
    const currentModels = get().models;
    
    // 检查模型 ID 是否已存在
    const existingIndex = currentModels.findIndex(m => m.id === model.id);
    
    let newModels: ModelConfig[];
    if (existingIndex >= 0) {
      // 如果已存在，更新现有模型
      newModels = [...currentModels];
      newModels[existingIndex] = {
        ...model,
        isCustom: true,
        capabilities: model.capabilities || detectModelCapabilities(model.id),
      };
    } else {
      // 添加新模型
      const newModel: ModelConfig = {
        ...model,
        isCustom: true,
        capabilities: model.capabilities || detectModelCapabilities(model.id),
      };
      newModels = [...currentModels, newModel];
    }

    set({ models: newModels });

    // 需求 2.5: 立即持久化
    await saveModelConfigs(newModels);
  },

  // 更新模型配置
  // 需求: 2.3
  updateModel: async (modelId: string, updates: Partial<ModelConfig>) => {
    const currentModels = get().models;
    const modelIndex = currentModels.findIndex(m => m.id === modelId);

    if (modelIndex === -1) {
      set({ error: `模型 ${modelId} 不存在` });
      return;
    }

    const newModels = [...currentModels];
    const existingModel = newModels[modelIndex];
    if (existingModel) {
      newModels[modelIndex] = {
        ...existingModel,
        ...updates,
      };
    }

    set({ models: newModels });

    // 需求 2.5: 立即持久化
    await saveModelConfigs(newModels);
  },

  // 删除模型
  // 需求: 2.4
  deleteModel: async (modelId: string) => {
    const currentModels = get().models;
    const newModels = currentModels.filter(m => m.id !== modelId);

    // 同时清除指向该模型的重定向
    const cleanedModels = newModels.map(m => {
      if (m.redirectTo === modelId) {
        const { redirectTo, ...rest } = m;
        return rest;
      }
      return m;
    });

    set({ models: cleanedModels });

    // 需求 2.5: 立即持久化
    await saveModelConfigs(cleanedModels);
  },

  // 设置模型重定向
  // 需求: 3.1
  setRedirect: async (modelId: string, targetId: string) => {
    const currentModels = get().models;
    const modelIndex = currentModels.findIndex(m => m.id === modelId);

    if (modelIndex === -1) {
      set({ error: `模型 ${modelId} 不存在` });
      return;
    }

    // 检查目标模型是否存在
    const targetExists = currentModels.some(m => m.id === targetId);
    if (!targetExists) {
      set({ error: `目标模型 ${targetId} 不存在` });
      return;
    }

    // 检查是否会造成循环重定向
    const visited = new Set<string>();
    let currentId: string | undefined = targetId;
    while (currentId) {
      if (currentId === modelId) {
        set({ error: '检测到循环重定向' });
        return;
      }
      if (visited.has(currentId)) {
        break;
      }
      visited.add(currentId);
      const current = currentModels.find(m => m.id === currentId);
      currentId = current?.redirectTo;
    }

    const newModels = [...currentModels];
    const existingModel = newModels[modelIndex];
    if (existingModel) {
      newModels[modelIndex] = {
        ...existingModel,
        redirectTo: targetId,
      };
    }

    set({ models: newModels });

    // 需求 2.5: 立即持久化
    await saveModelConfigs(newModels);
  },

  // 清除模型重定向
  // 需求: 3.5
  clearRedirect: async (modelId: string) => {
    const currentModels = get().models;
    const modelIndex = currentModels.findIndex(m => m.id === modelId);

    if (modelIndex === -1) {
      set({ error: `模型 ${modelId} 不存在` });
      return;
    }

    const newModels = [...currentModels];
    const existingModel = newModels[modelIndex];
    if (existingModel) {
      const { redirectTo, ...rest } = existingModel;
      newModels[modelIndex] = rest as ModelConfig;
    }

    set({ models: newModels });

    // 需求 2.5: 立即持久化
    await saveModelConfigs(newModels);
  },

  // 获取模型的有效配置（处理重定向）
  // 需求: 3.2, 3.3, 3.4
  getEffectiveConfig: (modelId: string) => {
    const models = get().models;
    return getEffectiveConfig(modelId, models);
  },

  // 获取模型的有效能力（处理重定向）
  // 需求: 3.1
  getEffectiveCapabilities: (modelId: string) => {
    const models = get().models;
    return getEffectiveCapabilities(modelId, models);
  },

  // 根据 ID 获取模型
  getModelById: (modelId: string) => {
    return get().models.find(m => m.id === modelId);
  },

  // 重置为默认模型列表
  // 需求: 5.4
  resetModels: async () => {
    set({ isLoading: true, error: null });
    try {
      const defaultModels = await resetModelConfigs();
      set({
        models: defaultModels,
        isLoading: false,
      });
    } catch (error) {
      // 需求: 7.1, 7.3 - 使用 storeLogger 替代 console.error
      storeLogger.error('重置模型配置失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      set({
        error: error instanceof Error ? error.message : '重置模型配置失败',
        isLoading: false,
      });
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
