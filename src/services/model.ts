/**
 * 模型管理服务
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.5, 5.3
 */

import type {
  ApiProvider,
  ModelCapabilities,
  ModelAdvancedConfig,
} from '../types/models';

// ============ API 提供商检测 ============

/**
 * 检测 API 提供商类型
 * 需求: 1.2, 1.3
 * 
 * 根据 URL 特征识别 API 提供商：
 * - 包含 generativelanguage.googleapis.com 的返回 'gemini'
 * - 其他返回 'openai'（OpenAI 兼容格式）
 * 
 * @param endpoint - API 端点 URL
 * @returns API 提供商类型
 */
export function detectApiProvider(endpoint: string): ApiProvider {
  // 空字符串或无效输入默认返回 openai
  if (!endpoint || typeof endpoint !== 'string') {
    return 'openai';
  }

  const normalizedEndpoint = endpoint.toLowerCase().trim();
  
  // 检测 Gemini API 端点
  if (normalizedEndpoint.includes('generativelanguage.googleapis.com')) {
    return 'gemini';
  }

  // 默认返回 OpenAI 兼容格式
  return 'openai';
}


// ============ 模型能力映射表 ============

/**
 * 预设模型能力映射表
 * 需求: 4.1, 4.2, 4.5, 2.1, 3.1, 3.2, 3.3, 5.4
 * 
 * 根据模型 ID 定义其支持的能力
 * 注意：此处的配置应与 types/models.ts 中的 MODEL_CAPABILITIES 保持一致
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  // Gemini 3 系列 - 支持 thinking level
  'gemini-3-pro-preview': {
    supportsThinking: true,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    // 思考配置 - 需求: 2.1, 5.4, 1.1
    thinkingConfigType: 'level',
    supportedThinkingLevels: ['low', 'high'],  // 需求: 1.1 - 只支持 low/high 两个等级
    supportsThoughtSummary: true,
  },
  'gemini-3-flash-preview': {
    supportsThinking: true,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    // 思考配置 - 支持 minimal/low/medium/high 四个等级 - 需求: 1.2
    thinkingConfigType: 'level',
    supportedThinkingLevels: ['minimal', 'low', 'medium', 'high'],  // 需求: 1.2 - 支持全部四个等级
    supportsThoughtSummary: true,
  },
  'gemini-3-pro-image-preview': {
    supportsThinking: false,
    supportsMediaResolution: false,
    supportsImageGeneration: true,
    supportsImageSize: true,  // 需求: 3.4 - 支持分辨率设置
    maxInputTokens: 65536,
    maxOutputTokens: 32768,
    // 思考配置 - 需求: 5.4
    thinkingConfigType: 'none',
    supportsThoughtSummary: true,
  },
  
  // Gemini 2.5 系列 - 支持 thinking budget
  'gemini-2.5-pro': {
    supportsThinking: true,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    // 思考配置 - 需求: 3.1, 5.4
    thinkingConfigType: 'budget',
    thinkingBudgetConfig: {
      min: 128,
      max: 32768,
      defaultValue: -1,
      canDisable: false,
    },
    supportsThoughtSummary: true,
  },
  'gemini-2.5-flash': {
    supportsThinking: true,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    // 思考配置 - 需求: 3.2, 5.4
    thinkingConfigType: 'budget',
    thinkingBudgetConfig: {
      min: 0,
      max: 24576,
      defaultValue: -1,
      canDisable: true,
    },
    supportsThoughtSummary: true,
  },
  'gemini-2.5-flash-lite': {
    supportsThinking: false,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 65536,
    // 思考配置 - 需求: 3.3
    thinkingConfigType: 'budget',
    thinkingBudgetConfig: {
      min: 0,
      max: 24576,
      defaultValue: 0,
      canDisable: true,
    },
    supportsThoughtSummary: false,
  },
  'gemini-2.5-flash-image': {
    supportsThinking: false,
    supportsMediaResolution: false,
    supportsImageGeneration: true,
    supportsImageSize: false,  // 需求: 3.1 - 不支持分辨率设置
    maxInputTokens: 65536,
    maxOutputTokens: 32768,
    // 思考配置
    thinkingConfigType: 'none',
    supportsThoughtSummary: false,
  },
  
  // Gemini 2.0 系列 - 不支持 thinking
  'gemini-2.0-flash': {
    supportsThinking: false,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    // 思考配置
    thinkingConfigType: 'none',
    supportsThoughtSummary: false,
  },
  'gemini-2.0-flash-lite': {
    supportsThinking: false,
    supportsMediaResolution: true,
    maxInputTokens: 1048576,
    maxOutputTokens: 8192,
    // 思考配置
    thinkingConfigType: 'none',
    supportsThoughtSummary: false,
  },
};

// ============ 模型能力检测 ============

/**
 * 检测模型支持的能力
 * 需求: 4.1, 4.2, 4.5, 2.1, 3.1, 3.2, 3.3
 * 
 * 根据模型 ID 识别其支持的能力：
 * - Gemini 3 系列支持 thinking level
 * - Gemini 2.5 系列支持 thinking budget
 * - 支持图像/视频输入的模型支持 media_resolution
 * - 带 -image 后缀的模型支持图像生成
 * 
 * @param modelId - 模型 ID
 * @returns 模型能力对象
 */
export function detectModelCapabilities(modelId: string): ModelCapabilities {
  // 空字符串或无效输入返回空能力
  if (!modelId || typeof modelId !== 'string') {
    return {};
  }

  const normalizedId = modelId.toLowerCase().trim();

  // 首先检查精确匹配
  if (MODEL_CAPABILITIES[normalizedId]) {
    return { ...MODEL_CAPABILITIES[normalizedId] };
  }

  // 基于前缀的能力检测
  const capabilities: ModelCapabilities = {};

  // Gemini 3 系列 - 支持 thinking level
  if (normalizedId.startsWith('gemini-3')) {
    capabilities.supportsMediaResolution = true;
    
    // 检测图像生成能力
    if (normalizedId.includes('-image')) {
      capabilities.supportsImageGeneration = true;
      capabilities.supportsThinking = false;
      capabilities.thinkingConfigType = 'none';
      capabilities.supportsThoughtSummary = true;
    } else {
      capabilities.supportsThinking = true;
      capabilities.thinkingConfigType = 'level';
      capabilities.supportsThoughtSummary = true;
    }
    
    return capabilities;
  }

  // Gemini 2.5 系列 - 支持 thinking budget
  if (normalizedId.startsWith('gemini-2.5')) {
    capabilities.supportsMediaResolution = true;
    
    // 检测图像生成能力
    if (normalizedId.includes('-image')) {
      capabilities.supportsImageGeneration = true;
      capabilities.supportsThinking = false;
      capabilities.thinkingConfigType = 'none';
      capabilities.supportsThoughtSummary = false;
    } else if (normalizedId.includes('-lite')) {
      // lite 版本 - 默认不思考
      capabilities.supportsThinking = false;
      capabilities.thinkingConfigType = 'budget';
      capabilities.thinkingBudgetConfig = {
        min: 0,
        max: 24576,
        defaultValue: 0,
        canDisable: true,
      };
      capabilities.supportsThoughtSummary = false;
    } else if (normalizedId.includes('-flash')) {
      // flash 版本 - 支持禁用思考
      capabilities.supportsThinking = true;
      capabilities.thinkingConfigType = 'budget';
      capabilities.thinkingBudgetConfig = {
        min: 0,
        max: 24576,
        defaultValue: -1,
        canDisable: true,
      };
      capabilities.supportsThoughtSummary = true;
    } else {
      // pro 版本 - 不支持禁用思考
      capabilities.supportsThinking = true;
      capabilities.thinkingConfigType = 'budget';
      capabilities.thinkingBudgetConfig = {
        min: 128,
        max: 32768,
        defaultValue: -1,
        canDisable: false,
      };
      capabilities.supportsThoughtSummary = true;
    }
    
    return capabilities;
  }

  // Gemini 2.0 系列 - 不支持 thinking
  if (normalizedId.startsWith('gemini-2.0') || normalizedId.startsWith('gemini-2-')) {
    capabilities.supportsThinking = false;
    capabilities.supportsMediaResolution = true;
    capabilities.thinkingConfigType = 'none';
    capabilities.supportsThoughtSummary = false;
    return capabilities;
  }

  // Gemini 1.5 系列 - 不支持 thinking
  if (normalizedId.startsWith('gemini-1.5') || normalizedId.startsWith('gemini-1-')) {
    capabilities.supportsThinking = false;
    capabilities.supportsMediaResolution = true;
    capabilities.thinkingConfigType = 'none';
    capabilities.supportsThoughtSummary = false;
    return capabilities;
  }

  // 其他 Gemini 模型 - 基本能力
  if (normalizedId.startsWith('gemini')) {
    capabilities.supportsMediaResolution = true;
    capabilities.thinkingConfigType = 'none';
    capabilities.supportsThoughtSummary = false;
    return capabilities;
  }

  // 非 Gemini 模型 - 返回空能力
  return capabilities;
}


// ============ 模型列表获取 ============

import type { ModelConfig } from '../types/models';

/**
 * Gemini API 模型列表响应格式
 */
interface GeminiModelsResponse {
  models: Array<{
    name: string;
    displayName?: string;
    description?: string;
    supportedGenerationMethods?: string[];
  }>;
}

/**
 * OpenAI API 模型列表响应格式
 */
interface OpenAIModelsResponse {
  data: Array<{
    id: string;
    object: string;
    created?: number;
    owned_by?: string;
  }>;
}

/**
 * 从 Gemini API 获取模型列表
 * 需求: 1.1, 1.2
 * 
 * @param endpoint - API 端点 URL
 * @param apiKey - API 密钥
 * @returns 模型配置列表
 */
export async function fetchGeminiModels(
  endpoint: string,
  apiKey: string
): Promise<ModelConfig[]> {
  // 验证参数
  if (!endpoint || !apiKey) {
    throw new Error('API 端点和密钥不能为空');
  }

  // 构建请求 URL（API Key 通过 Header 传递，不附加到 URL 中）
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  const url = `${normalizedEndpoint}/models`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `获取模型列表失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      throw new Error(errorMessage);
    }

    const data: GeminiModelsResponse = await response.json();
    
    // 转换为 ModelConfig 格式
    return data.models
      .filter(model => {
        // 只保留支持生成内容的模型
        return model.supportedGenerationMethods?.includes('generateContent');
      })
      .map(model => {
        // 从 models/xxx 格式提取模型 ID
        const id = model.name.replace('models/', '');
        return {
          id,
          name: model.displayName || id,
          description: model.description || '',
          provider: 'gemini' as ApiProvider,
          capabilities: detectModelCapabilities(id),
        };
      });
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('获取模型列表时发生未知错误');
  }
}

/**
 * 从 OpenAI 兼容 API 获取模型列表
 * 需求: 1.1, 1.3
 * 
 * @param endpoint - API 端点 URL
 * @param apiKey - API 密钥
 * @returns 模型配置列表
 */
export async function fetchOpenAIModels(
  endpoint: string,
  apiKey: string
): Promise<ModelConfig[]> {
  // 验证参数
  if (!endpoint || !apiKey) {
    throw new Error('API 端点和密钥不能为空');
  }

  // 构建请求 URL
  // 移除末尾斜杠
  const normalizedEndpoint = endpoint.replace(/\/+$/, '');
  
  // 检查 endpoint 是否已经包含版本路径（如 /v1、/v1beta 等）
  // 如果已包含，直接追加 /models；否则追加 /v1/models
  const hasVersionPath = /\/v\d+(?:beta)?(?:\/|$)/i.test(normalizedEndpoint);
  const url = hasVersionPath 
    ? `${normalizedEndpoint}/models`
    : `${normalizedEndpoint}/v1/models`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `获取模型列表失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      throw new Error(errorMessage);
    }

    const data: OpenAIModelsResponse = await response.json();
    
    // 转换为 ModelConfig 格式
    return data.data.map(model => ({
      id: model.id,
      name: model.id,
      description: model.owned_by ? `由 ${model.owned_by} 提供` : '',
      provider: 'openai' as ApiProvider,
      capabilities: {},
    }));
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('获取模型列表时发生未知错误');
  }
}

/**
 * 统一的模型列表获取入口
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5
 * 
 * 根据 API 端点自动检测提供商类型并获取模型列表
 * 
 * @param endpoint - API 端点 URL
 * @param apiKey - API 密钥
 * @returns 模型配置列表
 */
export async function fetchModels(
  endpoint: string,
  apiKey: string
): Promise<ModelConfig[]> {
  const provider = detectApiProvider(endpoint);
  
  // 需求 1.5: 获取失败时抛出错误，由调用方处理
  if (provider === 'gemini') {
    return await fetchGeminiModels(endpoint, apiKey);
  } else {
    return await fetchOpenAIModels(endpoint, apiKey);
  }
}


// ============ 模型重定向功能 ============

/**
 * 重定向解析结果
 */
export interface RedirectResult {
  /** 最终生效的配置 */
  config: ModelAdvancedConfig;
  /** 重定向链路径（用于调试） */
  redirectChain: string[];
  /** 是否检测到循环 */
  hasCircularRedirect: boolean;
}

/**
 * 能力解析结果
 */
export interface CapabilitiesResult {
  /** 最终生效的能力配置 */
  capabilities: ModelCapabilities;
  /** 重定向链路径（用于调试） */
  redirectChain: string[];
  /** 是否检测到循环 */
  hasCircularRedirect: boolean;
}

/**
 * 获取模型的有效能力配置（处理重定向）
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * 功能说明：
 * - 如果模型没有设置 redirectTo，返回模型自身的能力
 * - 如果模型设置了 redirectTo，返回目标模型的能力
 * - 支持重定向链（A -> B -> C），最终返回 C 的能力
 * - 检测并防止循环重定向（A -> B -> A），返回空能力并输出警告
 * - 如果重定向目标不存在，返回模型自身的能力
 * 
 * @param modelId - 要查询的模型 ID
 * @param models - 所有模型配置列表
 * @returns 有效的模型能力配置
 */
export function getEffectiveCapabilities(
  modelId: string,
  models: ModelConfig[]
): ModelCapabilities {
  const result = resolveCapabilitiesChain(modelId, models);
  return result.capabilities;
}

/**
 * 解析重定向链并返回详细的能力结果
 * 需求: 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * @param modelId - 要查询的模型 ID
 * @param models - 所有模型配置列表
 * @returns 能力解析结果，包含能力配置、链路径和循环检测
 */
export function resolveCapabilitiesChain(
  modelId: string,
  models: ModelConfig[]
): CapabilitiesResult {
  // 空输入处理 - 需求: 3.6 边界情况
  if (!modelId || !models || models.length === 0) {
    return {
      capabilities: {},
      redirectChain: [],
      hasCircularRedirect: false,
    };
  }

  // 创建模型 ID 到配置的映射，便于快速查找
  const modelMap = new Map<string, ModelConfig>();
  for (const model of models) {
    modelMap.set(model.id, model);
  }

  // 查找起始模型
  const startModel = modelMap.get(modelId);
  if (!startModel) {
    // 模型不存在，返回空能力
    return {
      capabilities: {},
      redirectChain: [],
      hasCircularRedirect: false,
    };
  }

  // 如果没有设置重定向，返回自身能力 - 需求: 3.2
  if (!startModel.redirectTo) {
    return {
      capabilities: startModel.capabilities || detectModelCapabilities(modelId),
      redirectChain: [modelId],
      hasCircularRedirect: false,
    };
  }

  // 追踪重定向链，检测循环 - 需求: 3.4, 3.5
  const visited = new Set<string>();
  const redirectChain: string[] = [];
  let currentId: string | undefined = modelId;

  while (currentId) {
    // 检测循环 - 需求: 3.5
    if (visited.has(currentId)) {
      console.warn(`检测到循环重定向: ${redirectChain.join(' -> ')} -> ${currentId}`);
      return {
        capabilities: {},
        redirectChain,
        hasCircularRedirect: true,
      };
    }

    visited.add(currentId);
    redirectChain.push(currentId);

    const currentModel = modelMap.get(currentId);
    if (!currentModel) {
      // 目标模型不存在 - 需求: 3.6
      // 返回链中最后一个有效模型的能力
      const lastValidId = redirectChain.length >= 2 ? redirectChain[redirectChain.length - 2] : undefined;
      if (lastValidId) {
        const lastValidModel = modelMap.get(lastValidId);
        if (lastValidModel) {
          return {
            capabilities: lastValidModel.capabilities || detectModelCapabilities(lastValidId),
            redirectChain,
            hasCircularRedirect: false,
          };
        }
      }
      return {
        capabilities: {},
        redirectChain,
        hasCircularRedirect: false,
      };
    }

    // 如果当前模型没有重定向，返回其能力 - 需求: 3.3
    if (!currentModel.redirectTo) {
      return {
        capabilities: currentModel.capabilities || detectModelCapabilities(currentId),
        redirectChain,
        hasCircularRedirect: false,
      };
    }

    // 继续追踪重定向链 - 需求: 3.4
    currentId = currentModel.redirectTo;
  }

  // 不应该到达这里，但为了类型安全返回空能力
  return {
    capabilities: {},
    redirectChain,
    hasCircularRedirect: false,
  };
}

/**
 * 获取模型的有效参数配置（处理重定向）
 * 需求: 3.2, 3.3, 3.4, 3.5
 * 
 * 功能说明：
 * - 如果模型设置了 redirectTo，则返回目标模型的参数配置
 * - 支持重定向链（A -> B -> C），最终返回 C 的配置
 * - 检测并防止循环重定向（A -> B -> A）
 * - 如果没有重定向或清除了重定向，返回模型自身的配置
 * 
 * @param modelId - 要查询的模型 ID
 * @param models - 所有模型配置列表
 * @returns 有效的高级参数配置
 */
export function getEffectiveConfig(
  modelId: string,
  models: ModelConfig[]
): ModelAdvancedConfig {
  const result = resolveRedirectChain(modelId, models);
  return result.config;
}

/**
 * 解析重定向链并返回详细结果
 * 需求: 3.2, 3.3, 3.4, 3.5
 * 
 * @param modelId - 要查询的模型 ID
 * @param models - 所有模型配置列表
 * @returns 重定向解析结果，包含配置、链路径和循环检测
 */
export function resolveRedirectChain(
  modelId: string,
  models: ModelConfig[]
): RedirectResult {
  // 空输入处理
  if (!modelId || !models || models.length === 0) {
    return {
      config: {},
      redirectChain: [],
      hasCircularRedirect: false,
    };
  }

  // 创建模型 ID 到配置的映射，便于快速查找
  const modelMap = new Map<string, ModelConfig>();
  for (const model of models) {
    modelMap.set(model.id, model);
  }

  // 查找起始模型
  const startModel = modelMap.get(modelId);
  if (!startModel) {
    return {
      config: {},
      redirectChain: [],
      hasCircularRedirect: false,
    };
  }

  // 如果没有设置重定向，直接返回自身配置
  if (!startModel.redirectTo) {
    return {
      config: startModel.advancedConfig || {},
      redirectChain: [modelId],
      hasCircularRedirect: false,
    };
  }

  // 追踪重定向链，检测循环
  const visited = new Set<string>();
  const redirectChain: string[] = [];
  let currentId = modelId;

  while (currentId) {
    // 检测循环
    if (visited.has(currentId)) {
      return {
        config: {},
        redirectChain,
        hasCircularRedirect: true,
      };
    }

    visited.add(currentId);
    redirectChain.push(currentId);

    const currentModel = modelMap.get(currentId);
    if (!currentModel) {
      // 目标模型不存在，返回链中最后一个有效模型的配置
      const lastValidId = redirectChain[redirectChain.length - 2];
      const lastValidModel = lastValidId ? modelMap.get(lastValidId) : undefined;
      return {
        config: lastValidModel?.advancedConfig || {},
        redirectChain,
        hasCircularRedirect: false,
      };
    }

    // 如果当前模型没有重定向，返回其配置
    if (!currentModel.redirectTo) {
      return {
        config: currentModel.advancedConfig || {},
        redirectChain,
        hasCircularRedirect: false,
      };
    }

    // 继续追踪重定向链
    currentId = currentModel.redirectTo;
  }

  // 不应该到达这里，但为了类型安全返回空配置
  return {
    config: {},
    redirectChain,
    hasCircularRedirect: false,
  };
}


// ============ 预设模型管理 ============

import { GEMINI_MODELS } from '../types/models';

/**
 * 预设模型 ID 集合
 * 需求: 3.1
 * 
 * 包含系统内置的 Gemini 模型 ID
 */
export const PRESET_MODEL_IDS: Set<string> = new Set(
  GEMINI_MODELS.map(model => model.id)
);

/**
 * 判断是否为预设模型
 * 需求: 3.1, 3.2
 * 
 * @param modelId - 模型 ID
 * @returns 如果是预设模型返回 true，否则返回 false
 */
export function isPresetModel(modelId: string): boolean {
  if (!modelId || typeof modelId !== 'string') {
    return false;
  }
  return PRESET_MODEL_IDS.has(modelId);
}


// ============ 模型合并逻辑 ============

/**
 * 合并远程和本地模型列表
 * 需求: 1.4, 3.2, 3.3, 5.3
 * 
 * 合并规则：
 * 1. 每个模型 ID 唯一
 * 2. 预设模型的配置不被 API 返回的同名模型覆盖（需求 3.3）
 * 3. 非预设模型标记为 isCustom: true（需求 3.2）
 * 4. 保留本地模型的自定义属性（如 redirectTo、advancedConfig）
 * 
 * @param remote - 远程获取的模型列表
 * @param local - 本地存储的模型列表
 * @returns 合并后的模型列表
 */
export function mergeModels(
  remote: ModelConfig[],
  local: ModelConfig[]
): ModelConfig[] {
  // 创建本地模型的映射表，用于快速查找
  const localMap = new Map<string, ModelConfig>();
  for (const model of local) {
    localMap.set(model.id, model);
  }

  // 创建结果映射表，确保 ID 唯一
  const resultMap = new Map<string, ModelConfig>();

  // 首先添加远程模型
  for (const remoteModel of remote) {
    const localModel = localMap.get(remoteModel.id);
    const isPreset = isPresetModel(remoteModel.id);
    
    if (isPreset) {
      // 需求 3.3: 预设模型不被 API 返回的同名模型覆盖
      // 保留预设模型的配置，但可以合并本地的自定义属性
      if (localModel) {
        resultMap.set(remoteModel.id, {
          ...localModel,
          // 确保预设模型的 isCustom 始终为 false
          isCustom: false,
        });
      } else {
        // 使用远程配置，但标记为非自定义
        resultMap.set(remoteModel.id, {
          ...remoteModel,
          isCustom: false,
        });
      }
    } else {
      // 需求 3.2: 非预设模型标记为自定义模型
      if (localModel) {
        // 本地配置优先：合并远程和本地配置，本地属性覆盖远程
        resultMap.set(remoteModel.id, {
          ...remoteModel,
          ...localModel,
          // 保留远程的基本信息，但允许本地覆盖
          capabilities: localModel.capabilities || remoteModel.capabilities,
          // 标记为自定义模型
          isCustom: true,
        });
      } else {
        // 没有本地配置，直接使用远程配置，标记为自定义
        resultMap.set(remoteModel.id, {
          ...remoteModel,
          isCustom: true,
        });
      }
    }
  }

  // 添加本地独有的模型
  for (const localModel of local) {
    if (!resultMap.has(localModel.id)) {
      const isPreset = isPresetModel(localModel.id);
      resultMap.set(localModel.id, {
        ...localModel,
        // 根据是否为预设模型设置 isCustom
        isCustom: !isPreset,
      });
    }
  }

  // 转换为数组并返回
  return Array.from(resultMap.values());
}


// ============ 新模型默认禁用 ============

/**
 * 为新模型设置默认禁用状态
 * 需求: 4.3, 4.4
 * 
 * 处理规则：
 * - 如果模型 ID 已存在于现有列表中，保持原有的 enabled 状态（返回 undefined）
 * - 如果是新模型（不在现有列表中），设置 enabled 为 false
 * 
 * @param remoteModels - 远程获取的模型列表
 * @param existingModelIds - 现有模型 ID 集合
 * @returns 处理后的模型列表
 */
export function setNewModelsDisabled(
  remoteModels: ModelConfig[],
  existingModelIds: Set<string>
): ModelConfig[] {
  return remoteModels.map(model => ({
    ...model,
    // 如果是新模型（不在现有列表中），默认禁用
    enabled: existingModelIds.has(model.id) ? undefined : false,
  }));
}

// ============ 模型过滤和排序 ============

/**
 * 获取启用的模型列表
 * 需求: 4.2
 * 
 * 过滤规则：
 * - enabled 为 true 或 undefined 的模型被视为启用
 * - enabled 为 false 的模型被过滤掉
 * 
 * @param models - 所有模型配置列表
 * @returns 启用的模型列表
 */
export function getEnabledModels(models: ModelConfig[]): ModelConfig[] {
  return models.filter(model => model.enabled !== false);
}

/**
 * 对模型列表进行排序
 * 需求: 4.6
 * 
 * 排序规则：
 * - 启用的模型（enabled !== false）排在前面
 * - 禁用的模型（enabled === false）排在后面
 * - 同一组内保持原有顺序
 * 
 * @param models - 所有模型配置列表
 * @returns 排序后的模型列表
 */
export function sortModels(models: ModelConfig[]): ModelConfig[] {
  return [...models].sort((a, b) => {
    const aEnabled = a.enabled !== false;
    const bEnabled = b.enabled !== false;
    
    // 启用的模型在前
    if (aEnabled && !bEnabled) return -1;
    if (!aEnabled && bEnabled) return 1;
    return 0;
  });
}
