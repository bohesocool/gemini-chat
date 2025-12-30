/**
 * Gemini API 服务
 * 需求: 1.2, 1.4, 2.4, 3.2, 5.2, 5.4, 5.6, 8.5, 12.3, 2.2, 2.3, 2.4
 */

import type {
  GeminiContent,
  GeminiRequest,
  GenerationConfig,
  SafetySetting,
  StreamChunk,
  ThinkingConfig,
  ImageConfig,
} from '../types';
import type { ApiConfig, ModelAdvancedConfig, MediaResolution, ModelCapabilities } from '../types/models';
import { getModelCapabilities as getModelCapabilitiesFromPreset, DEFAULT_IMAGE_GENERATION_CONFIG } from '../types/models';
import { useModelStore } from '../stores/model';
import { apiLogger } from './logger';
import { useDebugStore, createRequestRecord, generateRequestId } from '../stores/debug';

// ============ 模型能力辅助函数 ============

/**
 * 获取模型的有效能力（处理重定向）
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 * 
 * 此函数会检查模型是否有重定向设置，如果有则返回目标模型的能力。
 * 这确保了自定义模型（重定向到图片生成模型）能正确获取图片生成能力。
 * 
 * @param modelId - 模型 ID
 * @returns 模型能力配置
 */
function getModelCapabilities(modelId: string): ModelCapabilities {
  // 尝试从 model store 获取有效能力（处理重定向）
  try {
    const modelStore = useModelStore.getState();
    return modelStore.getEffectiveCapabilities(modelId);
  } catch {
    // 如果 store 不可用，回退到预设能力
    return getModelCapabilitiesFromPreset(modelId);
  }
}

// ============ 调试记录辅助函数 ============

/**
 * 开始记录 API 请求
 * 需求: 6.3
 * 
 * @param url - 请求 URL（不含 API 密钥）
 * @param method - HTTP 方法
 * @param body - 请求体
 * @returns 请求记录 ID 和开始时间
 */
function startDebugRecord(
  url: string,
  method: string,
  body: unknown
): { requestId: string; startTime: number } | null {
  const debugStore = useDebugStore.getState();
  
  // 如果调试模式未启用，不记录
  if (!debugStore.debugEnabled) {
    return null;
  }
  
  const requestId = generateRequestId();
  const startTime = Date.now();
  
  // 创建请求记录（隐藏 API 密钥）
  const sanitizedUrl = url.replace(/key=[^&]+/, 'key=***');
  
  const record = createRequestRecord(
    sanitizedUrl,
    method,
    { 'Content-Type': 'application/json' },
    body
  );
  
  // 使用生成的 requestId
  record.id = requestId;
  record.timestamp = startTime;
  
  debugStore.addRequestRecord(record);
  
  return { requestId, startTime };
}

/**
 * 完成调试记录（成功）
 * 需求: 6.3
 * 
 * @param requestId - 请求记录 ID
 * @param startTime - 请求开始时间
 * @param statusCode - HTTP 状态码
 * @param response - 响应内容
 * @param ttfb - 首字节时间（可选）
 */
function completeDebugRecord(
  requestId: string,
  startTime: number,
  statusCode: number,
  response: unknown,
  ttfb?: number
): void {
  const debugStore = useDebugStore.getState();
  
  if (!debugStore.debugEnabled) {
    return;
  }
  
  const duration = Date.now() - startTime;
  
  debugStore.updateRequestRecord(requestId, {
    statusCode,
    response,
    duration,
    ttfb,
  });
}

/**
 * 完成调试记录（失败）
 * 需求: 6.3
 * 
 * @param requestId - 请求记录 ID
 * @param startTime - 请求开始时间
 * @param error - 错误信息
 * @param statusCode - HTTP 状态码（可选）
 * @param rawResponse - 原始响应内容（可选，用于调试）
 */
function failDebugRecord(
  requestId: string,
  startTime: number,
  error: string,
  statusCode?: number,
  rawResponse?: string
): void {
  const debugStore = useDebugStore.getState();
  
  if (!debugStore.debugEnabled) {
    return;
  }
  
  const duration = Date.now() - startTime;
  
  // 尝试解析原始响应为 JSON，便于在调试面板中格式化显示
  let response: unknown = rawResponse;
  if (rawResponse) {
    try {
      response = JSON.parse(rawResponse);
    } catch {
      // 如果不是有效的 JSON，保持原始字符串
      response = rawResponse;
    }
  }
  
  debugStore.updateRequestRecord(requestId, {
    statusCode,
    error,
    duration,
    response, // 保存原始响应内容
  });
}

// ============ URL 验证和构建 ============

import { OFFICIAL_API_ENDPOINT } from '../types/models';

/**
 * 规范化 API 端点地址
 * 需求: 1.1, 1.3, 1.4
 * 
 * - 空字符串或仅包含空白字符返回官方默认地址
 * - 非空地址自动添加 /v1beta 后缀（如果没有）
 * 
 * @param endpoint - 用户输入的端点地址
 * @returns 规范化后的端点地址
 */
export function normalizeApiEndpoint(endpoint: string): string {
  // 处理空字符串或仅包含空白字符的情况
  const trimmed = endpoint.trim();
  if (!trimmed) {
    return OFFICIAL_API_ENDPOINT;
  }
  
  // 移除末尾的斜杠
  let normalized = trimmed.replace(/\/+$/, '');
  
  // 如果不以 /v1beta 结尾，自动添加
  if (!normalized.endsWith('/v1beta')) {
    normalized = `${normalized}/v1beta`;
  }
  
  return normalized;
}

/**
 * 验证 API 端点 URL 格式
 * 需求: 1.1, 1.2
 * 
 * @param url - 要验证的 URL 字符串
 * @returns 验证结果，包含是否有效和错误信息
 */
export function validateApiEndpoint(url: string): { valid: boolean; error?: string } {
  // 需求 1.1: 空字符串或仅包含空白字符是有效的（将使用官方默认地址）
  if (!url || url.trim() === '') {
    return { valid: true };
  }

  const trimmedUrl = url.trim();

  // 检查是否以 http:// 或 https:// 开头
  if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
    return { valid: false, error: 'URL 必须以 http:// 或 https:// 开头' };
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    
    // 检查协议是否为 http 或 https
    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return { valid: false, error: 'URL 协议必须是 http 或 https' };
    }

    // 检查是否有有效的主机名
    if (!parsedUrl.hostname || parsedUrl.hostname.length === 0) {
      return { valid: false, error: 'URL 必须包含有效的主机名' };
    }

    return { valid: true };
  } catch {
    return { valid: false, error: 'URL 格式无效' };
  }
}

/**
 * 构建 Gemini API 请求 URL
 * 需求: 1.1, 1.3, 1.4, 8.5
 * 
 * @param config - API 配置
 * @param stream - 是否使用流式响应
 * @returns 完整的 API 请求 URL
 */
export function buildRequestUrl(config: ApiConfig, stream: boolean = true): string {
  // 需求 1.1, 1.3, 1.4: 规范化端点地址
  // - 空端点返回官方地址
  // - 自动添加 /v1beta 后缀
  const endpoint = normalizeApiEndpoint(config.endpoint);
  
  // 构建模型路径
  const modelPath = `models/${config.model}`;
  
  // 选择生成方法
  const method = stream ? 'streamGenerateContent' : 'generateContent';
  
  // 构建完整 URL
  const url = `${endpoint}/${modelPath}:${method}?key=${config.apiKey}`;
  
  // 如果是流式响应，添加 alt=sse 参数
  if (stream) {
    return `${url}&alt=sse`;
  }
  
  return url;
}


// ============ 请求体构建 ============

/**
 * 构建 Gemini API 请求体
 * 需求: 2.4, 3.2, 3.8, 4.2, 5.6, 12.3, 联网搜索
 * 
 * @param contents - 消息内容数组
 * @param generationConfig - 生成配置（可选）
 * @param safetySettings - 安全设置（可选）
 * @param systemInstruction - 系统指令（可选）
 * @param advancedConfig - 高级参数配置（可选）
 * @param modelId - 模型 ID（可选，用于确定思考配置类型）
 * @param webSearchEnabled - 是否启用联网搜索（可选）
 * @returns 符合 Gemini API 格式的请求体
 */
export function buildRequestBody(
  contents: GeminiContent[],
  generationConfig?: GenerationConfig,
  safetySettings?: SafetySetting[],
  systemInstruction?: string,
  advancedConfig?: ModelAdvancedConfig,
  modelId?: string,
  webSearchEnabled?: boolean
): GeminiRequest {
  const request: GeminiRequest = {
    contents,
  };

  // 添加生成配置（如果提供且有有效值）
  if (generationConfig && Object.keys(generationConfig).length > 0) {
    // 过滤掉 undefined 值
    const filteredConfig: GenerationConfig = {};
    if (generationConfig.temperature !== undefined) {
      filteredConfig.temperature = generationConfig.temperature;
    }
    if (generationConfig.topP !== undefined) {
      filteredConfig.topP = generationConfig.topP;
    }
    if (generationConfig.topK !== undefined) {
      filteredConfig.topK = generationConfig.topK;
    }
    if (generationConfig.maxOutputTokens !== undefined) {
      filteredConfig.maxOutputTokens = generationConfig.maxOutputTokens;
    }
    if (generationConfig.stopSequences !== undefined && generationConfig.stopSequences.length > 0) {
      filteredConfig.stopSequences = generationConfig.stopSequences;
    }
    
    if (Object.keys(filteredConfig).length > 0) {
      request.generationConfig = filteredConfig;
    }
  }

  // 添加安全设置（如果提供且非空）
  if (safetySettings && safetySettings.length > 0) {
    request.safetySettings = safetySettings;
  }

  // 添加系统指令（如果提供且非空）
  if (systemInstruction && systemInstruction.trim().length > 0) {
    request.systemInstruction = {
      role: 'user',
      parts: [{ text: systemInstruction }],
    };
  }

  // 添加思考配置到 generationConfig 内部
  // 需求: 1.3, 1.4, 3.8, 4.2
  // 重要: thinkingConfig 必须放在 generationConfig 内部，而不是请求体顶层
  if (modelId) {
    // 使用新的基于模型类型的思考配置构建函数
    const thinkingConfig = buildThinkingConfigForModel(modelId, advancedConfig);
    if (thinkingConfig) {
      // 确保 generationConfig 存在
      if (!request.generationConfig) {
        request.generationConfig = {};
      }
      // 将 thinkingConfig 放入 generationConfig 内部
      request.generationConfig.thinkingConfig = thinkingConfig;
    }
  } else if (advancedConfig?.thinkingLevel) {
    // 向后兼容：如果没有提供 modelId，使用旧的方式
    if (!request.generationConfig) {
      request.generationConfig = {};
    }
    request.generationConfig.thinkingConfig = buildThinkingConfig(advancedConfig.thinkingLevel);
  }

  // 为画图模型添加 responseModalities 配置
  // 需求: 2.6 - 画图模型连续对话支持
  if (modelId) {
    const capabilities = getModelCapabilities(modelId);
    if (capabilities.supportsImageGeneration) {
      // 确保 generationConfig 存在
      if (!request.generationConfig) {
        request.generationConfig = {};
      }
      // 添加 responseModalities 以支持文本和图片输出
      request.generationConfig.responseModalities = ['TEXT', 'IMAGE'];
    }
  }

  // 添加图片生成配置到 generationConfig 内部
  // 需求: 2.5, 9.1, 9.2, 9.3 - imageConfig 必须放在 generationConfig 内部
  // 对于图片生成模型，必须始终包含 aspectRatio 参数
  // imageSize 参数仅在模型支持时才添加（需求: 3.1, 3.2, 3.3, 3.4）
  if (modelId) {
    const capabilities = getModelCapabilities(modelId);
    if (capabilities.supportsImageGeneration) {
      if (!request.generationConfig) {
        request.generationConfig = {};
      }
      // 使用用户配置或默认配置
      const imageConfig = advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG;
      // 根据模型能力决定是否包含 imageSize
      const supportsImageSize = capabilities.supportsImageSize !== false;
      request.generationConfig.imageConfig = buildImageConfig(imageConfig, supportsImageSize);
    }
  } else if (advancedConfig?.imageConfig) {
    // 向后兼容：如果没有提供 modelId 但有 imageConfig，仍然添加（包含 imageSize）
    if (!request.generationConfig) {
      request.generationConfig = {};
    }
    request.generationConfig.imageConfig = buildImageConfig(advancedConfig.imageConfig, true);
  }

  // 添加媒体分辨率配置到 generationConfig
  // 需求: 4.4, 4.5, 4.6, 4.7
  // 当值为 undefined 时不添加参数，当值为具体选项时设置对应的 API 参数值
  if (advancedConfig?.mediaResolution) {
    if (!request.generationConfig) {
      request.generationConfig = {};
    }
    request.generationConfig.mediaResolution = advancedConfig.mediaResolution;
  }

  // 添加联网搜索工具配置
  // 需求: 联网搜索功能
  if (webSearchEnabled) {
    request.tools = [{ googleSearch: {} }];
  }

  return request;
}

/**
 * 构建思考配置
 * 需求: 1.3, 1.4, 3.8
 * 
 * 根据模型类型选择正确的思考配置参数：
 * - gemini-3-pro-preview: 使用 thinkingLevel
 * - gemini-2.5 系列: 使用 thinkingBudget
 * 
 * @param modelId - 模型 ID
 * @param advancedConfig - 高级参数配置（可选）
 * @returns 思考配置对象，如果模型不支持思考配置则返回 undefined
 */
export function buildThinkingConfigForModel(
  modelId: string,
  advancedConfig?: ModelAdvancedConfig
): ThinkingConfig | undefined {
  // 获取模型能力配置
  const capabilities = getModelCapabilities(modelId);
  const configType = capabilities.thinkingConfigType;
  
  const config: ThinkingConfig = {};
  let hasConfig = false;
  
  // 根据配置类型设置参数
  if (configType === 'level') {
    // Gemini 3 系列使用 thinkingLevel
    config.thinkingLevel = advancedConfig?.thinkingLevel || 'high';
    hasConfig = true;
  } else if (configType === 'budget') {
    // Gemini 2.5 系列使用 thinkingBudget
    const budgetConfig = capabilities.thinkingBudgetConfig;
    if (budgetConfig) {
      // 使用用户设置的值，或使用默认值
      const budget = advancedConfig?.thinkingBudget ?? budgetConfig.defaultValue;
      config.thinkingBudget = budget;
      hasConfig = true;
    }
  }
  
  // 添加 includeThoughts 参数（如果模型支持思维链）
  // 需求: 3.1, 3.2, 3.3 - 画图模型思维链支持
  // 对于支持 supportsThoughtSummary 的模型（如 gemini-3-pro-image-preview），
  // 即使 thinkingConfigType 为 'none'，也应该能够启用 includeThoughts
  if (capabilities.supportsThoughtSummary && advancedConfig?.includeThoughts) {
    config.includeThoughts = true;
    hasConfig = true;
  }
  
  // 如果没有任何配置，返回 undefined
  return hasConfig ? config : undefined;
}

/**
 * 构建思考配置（旧版兼容函数）
 * 需求: 1.3, 1.4
 * 
 * @param thinkingLevel - 思考深度级别
 * @returns 思考配置对象
 * @deprecated 请使用 buildThinkingConfigForModel 函数
 */
export function buildThinkingConfig(thinkingLevel: 'minimal' | 'low' | 'medium' | 'high'): ThinkingConfig {
  return {
    thinkingLevel: thinkingLevel,
  };
}

/**
 * 构建图片生成配置
 * 需求: 2.5, 3.1, 3.2, 3.3, 3.4
 * 
 * @param config - 图片生成配置
 * @param includeImageSize - 是否包含 imageSize 参数（默认 true）
 * @returns 图片 API 配置对象
 */
export function buildImageConfig(
  config: import('../types/models').ImageGenerationConfig,
  includeImageSize: boolean = true
): ImageConfig {
  // 如果模型不支持 imageSize，则不包含该参数
  if (!includeImageSize) {
    return {
      aspectRatio: config.aspectRatio,
    };
  }
  
  return {
    aspectRatio: config.aspectRatio,
    imageSize: config.imageSize,
  };
}

/**
 * 思维链提取结果
 */
export interface ThoughtExtractionResult {
  /** 普通文本内容 */
  text: string;
  /** 思维链内容 */
  thought: string;
  /** 思维链签名（用于画图模型连续对话） */
  thoughtSignature?: string;
  /** 思维链中的图片（不进入图片库，仅在思维链区域显示） */
  thoughtImages?: ImageExtractionResult[];
  /** 正式回复中的图片（进入图片库） */
  images?: ImageExtractionResult[];
}

/**
 * 解析响应中的思维链内容
 * 需求: 4.3, 2.6
 * 
 * 遍历 response.parts，检查 thought 布尔值，
 * 将思维链内容和普通回复内容分离，同时提取 thoughtSignature
 * 思维链中的图片和正式回复中的图片分开存储
 * 
 * @param chunk - 流式响应块
 * @returns 包含文本、思维链、签名和图片的对象，如果没有内容则返回 null
 */
export function extractThoughtSummary(chunk: StreamChunk): ThoughtExtractionResult | null {
  if (!chunk.candidates || chunk.candidates.length === 0) {
    return null;
  }
  
  const candidate = chunk.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    return null;
  }
  
  let text = '';
  let thought = '';
  let thoughtSignature: string | undefined;
  const thoughtImages: ImageExtractionResult[] = [];
  const images: ImageExtractionResult[] = [];
  
  for (const part of candidate.content.parts) {
    // 提取 thoughtSignature（用于画图模型连续对话）
    if ('thoughtSignature' in part && (part as { thoughtSignature?: string }).thoughtSignature) {
      thoughtSignature = (part as { thoughtSignature: string }).thoughtSignature;
    }
    
    // 检查是否为思维链部分（包含 thought: true）
    const isThoughtPart = 'thought' in part && part.thought === true;
    
    if (isThoughtPart && 'text' in part) {
      thought += part.text;
    } else if ('text' in part) {
      // 普通文本部分
      text += part.text;
    }
    
    // 提取图片数据，根据是否在思维链中分别存储
    if ('inlineData' in part && part.inlineData) {
      const { mimeType, data } = part.inlineData;
      if (mimeType.startsWith('image/')) {
        if (isThoughtPart) {
          // 思维链中的图片
          thoughtImages.push({ mimeType, data });
        } else {
          // 正式回复中的图片
          images.push({ mimeType, data });
        }
      }
    }
  }
  
  // 如果没有任何内容，返回 null
  if (!text && !thought && !thoughtSignature && thoughtImages.length === 0 && images.length === 0) {
    return null;
  }
  
  return { 
    text, 
    thought, 
    thoughtSignature,
    thoughtImages: thoughtImages.length > 0 ? thoughtImages : undefined,
    images: images.length > 0 ? images : undefined,
  };
}

/**
 * 图片提取结果接口
 * 需求: 2.7
 */
export interface ImageExtractionResult {
  /** 图片 MIME 类型 */
  mimeType: string;
  /** Base64 编码的图片数据 */
  data: string;
}

/**
 * 从响应块中提取图片数据
 * 需求: 2.7
 * 
 * @param chunk - 流式响应块
 * @returns 图片数据数组
 */
export function extractImagesFromChunk(chunk: StreamChunk): ImageExtractionResult[] {
  if (!chunk.candidates || chunk.candidates.length === 0) {
    return [];
  }
  
  const candidate = chunk.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    return [];
  }
  
  const images: ImageExtractionResult[] = [];
  
  for (const part of candidate.content.parts) {
    // 检查是否为内联数据部分（图片）
    if ('inlineData' in part && part.inlineData) {
      const { mimeType, data } = part.inlineData;
      // 只提取图片类型的数据
      if (mimeType.startsWith('image/')) {
        images.push({ mimeType, data });
      }
    }
  }
  
  return images;
}

/**
 * 从流式响应块中提取 Token 使用量
 * 需求: 1.2, 1.5
 * 
 * @param chunk - 流式响应块
 * @returns Token 使用量对象，如果没有数据则返回 null
 */
export function extractTokenUsage(chunk: StreamChunk): import('../types/models').MessageTokenUsage | null {
  if (!chunk.usageMetadata) {
    return null;
  }
  
  const { promptTokenCount, candidatesTokenCount, totalTokenCount, thoughtsTokenCount } = chunk.usageMetadata;
  
  return {
    promptTokens: promptTokenCount || 0,
    completionTokens: candidatesTokenCount || 0,
    thoughtsTokens: thoughtsTokenCount || 0,
    totalTokens: totalTokenCount || 0,
  };
}

/**
 * 为内容应用媒体分辨率设置
 * 
 * @deprecated 媒体分辨率现在通过 generationConfig.mediaResolution 设置，
 * 不再需要在内容的 inlineData 中添加。此函数保留用于向后兼容。
 * 
 * @param contents - 消息内容数组
 * @param mediaResolution - 媒体分辨率设置
 * @returns 应用了媒体分辨率的内容数组
 */
export function applyMediaResolution(
  contents: GeminiContent[],
  mediaResolution?: MediaResolution
): GeminiContent[] {
  // 如果没有设置媒体分辨率，直接返回原内容
  if (!mediaResolution) {
    return contents;
  }

  // 遍历所有内容，为包含媒体的部分添加分辨率设置
  return contents.map(content => ({
    ...content,
    parts: content.parts.map(part => {
      // 检查是否为内联数据（图片/视频）
      if ('inlineData' in part) {
        return {
          inlineData: {
            ...part.inlineData,
            mediaResolution,
          },
        };
      }
      return part;
    }),
  }));
}


// ============ 流式响应处理 ============

/**
 * API 错误类型
 */
export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

/**
 * 解包 API 响应数据
 * 某些 API 端点返回 {"response": {...}, "traceId": "..."} 格式
 * 此函数将其解包为标准的 StreamChunk 格式
 * 
 * @param data - 原始响应数据
 * @returns 解包后的 StreamChunk
 */
function unwrapResponseData(data: unknown): StreamChunk {
  if (data && typeof data === 'object' && 'response' in data) {
    const wrapped = data as { response: StreamChunk };
    if (wrapped.response && typeof wrapped.response === 'object') {
      return wrapped.response;
    }
  }
  return data as StreamChunk;
}

/**
 * 解析 SSE 流中的数据
 * @param line - SSE 数据行
 * @returns 解析后的 StreamChunk 或 null
 */
function parseSSELine(line: string): StreamChunk | null {
  if (!line.startsWith('data: ')) {
    return null;
  }
  
  const jsonStr = line.slice(6).trim();
  if (!jsonStr || jsonStr === '[DONE]') {
    return null;
  }
  
  try {
    const parsed = JSON.parse(jsonStr);
    // 使用 unwrapResponseData 处理响应被包装的情况
    return unwrapResponseData(parsed);
  } catch {
    return null;
  }
}

/**
 * 从 StreamChunk 中提取文本内容
 * @param chunk - 流式响应块
 * @returns 提取的文本内容
 */
function extractTextFromChunk(chunk: StreamChunk): string {
  if (!chunk.candidates || chunk.candidates.length === 0) {
    return '';
  }
  
  const candidate = chunk.candidates[0];
  if (!candidate || !candidate.content || !candidate.content.parts) {
    return '';
  }
  
  return candidate.content.parts
    .filter((part): part is { text: string } => 'text' in part)
    .map(part => part.text)
    .join('');
}

/**
 * 请求取消错误类型
 * 需求: 5.2
 */
export class GeminiRequestCancelledError extends Error {
  /** 已接收的部分响应内容 */
  public partialResponse: string;
  
  constructor(message: string, partialResponse: string = '') {
    super(message);
    this.name = 'GeminiRequestCancelledError';
    this.partialResponse = partialResponse;
  }
}

/**
 * 发送消息到 Gemini API 并处理流式响应
 * 需求: 5.2, 5.4, 4.3, 4.4, 2.2, 2.3
 * 
 * @param contents - 消息内容数组
 * @param config - API 配置
 * @param generationConfig - 生成配置（可选）
 * @param safetySettings - 安全设置（可选）
 * @param systemInstruction - 系统指令（可选）
 * @param onChunk - 接收文本块的回调函数
 * @param advancedConfig - 高级参数配置（可选）
 * @param signal - AbortSignal 用于取消请求（可选）
 */
export async function sendMessage(
  contents: GeminiContent[],
  config: ApiConfig,
  generationConfig?: GenerationConfig,
  safetySettings?: SafetySetting[],
  systemInstruction?: string,
  onChunk?: (text: string) => void,
  advancedConfig?: ModelAdvancedConfig,
  signal?: AbortSignal
): Promise<string> {
  // 需求: 2.2 - 输出请求日志
  apiLogger.info('发送流式消息请求', { model: config.model, messageCount: contents.length });

  // 验证 API 配置
  const validation = validateApiEndpoint(config.endpoint);
  if (!validation.valid) {
    apiLogger.error('API 端点验证失败', { error: validation.error });
    throw new GeminiApiError(validation.error || 'API 端点无效');
  }
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    apiLogger.error('API 密钥为空');
    throw new GeminiApiError('API 密钥不能为空');
  }

  // 构建请求，传入模型 ID 以正确构建画图模型配置
  const url = buildRequestUrl(config, true);
  const body = buildRequestBody(contents, generationConfig, safetySettings, systemInstruction, advancedConfig, config.model);

  // 需求: 2.3 - 输出 API 调用日志
  apiLogger.debug('API 请求参数', {
    model: config.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
  });

  // 需求: 6.3 - 开始记录调试信息
  const debugInfo = startDebugRecord(url, 'POST', body);

  // 用于追踪已接收的部分响应
  let fullText = '';
  let ttfb: number | undefined;
  // 收集所有原始响应块，用于调试面板显示完整的上游响应
  const rawResponseChunks: unknown[] = [];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal, // 传递 AbortSignal 用于取消请求
    });

    // 记录首字节时间 - 需求: 8.2
    if (debugInfo) {
      ttfb = Date.now() - debugInfo.startTime;
    }

    // 处理 HTTP 错误
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 请求失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      // 需求: 2.4 - 输出错误日志
      apiLogger.error('API 请求失败', { status: response.status, message: errorMessage });

      // 需求: 6.3 - 记录失败，同时保存原始响应内容
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, errorMessage, response.status, errorText);
      }

      // 直接使用原始错误消息，让用户看到上游返回的具体错误
      throw new GeminiApiError(errorMessage, response.status);
    }

    // 处理流式响应
    if (!response.body) {
      apiLogger.error('响应体为空');
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '响应体为空');
      }
      throw new GeminiApiError('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      // 检查是否已取消 - 需求: 5.2
      if (signal?.aborted) {
        reader.cancel();
        apiLogger.info('请求已取消', { partialResponseLength: fullText.length });
        // 需求: 6.3 - 记录取消
        if (debugInfo) {
          completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, { cancelled: true, partialResponse: fullText }, ttfb);
        }
        throw new GeminiRequestCancelledError('请求已取消', fullText);
      }

      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // 按行处理 SSE 数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行
      
      for (const line of lines) {
        const chunk = parseSSELine(line);
        if (chunk) {
          // 收集原始响应块用于调试
          rawResponseChunks.push(chunk);
          const text = extractTextFromChunk(chunk);
          if (text) {
            fullText += text;
            onChunk?.(text);
          }
        }
      }
    }

    // 处理缓冲区中剩余的数据
    if (buffer) {
      const chunk = parseSSELine(buffer);
      if (chunk) {
        // 收集原始响应块用于调试
        rawResponseChunks.push(chunk);
        const text = extractTextFromChunk(chunk);
        if (text) {
          fullText += text;
          onChunk?.(text);
        }
      }
    }

    apiLogger.info('流式消息请求完成', { responseLength: fullText.length });
    
    // 需求: 6.3 - 记录成功，保存完整的原始响应数据
    if (debugInfo) {
      completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseChunks, ttfb);
    }
    
    return fullText;
  } catch (error) {
    // 需求: 5.2 - 处理 AbortError 异常
    if (error instanceof GeminiRequestCancelledError) {
      throw error;
    }
    
    // 处理 fetch 的 AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      apiLogger.info('请求被中止', { partialResponseLength: fullText.length });
      // 需求: 6.3 - 记录取消
      if (debugInfo) {
        completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, { cancelled: true, partialResponse: fullText }, ttfb);
      }
      throw new GeminiRequestCancelledError('请求已取消', fullText);
    }

    // 需求: 2.4 - 输出错误日志
    if (error instanceof GeminiApiError) {
      apiLogger.error('Gemini API 错误', { type: error.errorType, message: error.message });
      // 需求: 6.3 - 记录失败（如果还没记录）
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, error.message, error.statusCode);
      }
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      apiLogger.error('网络连接失败', { message: error.message });
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '网络连接失败');
      }
      throw new GeminiApiError('网络连接失败，请检查网络设置', undefined, 'NETWORK_ERROR');
    }
    
    apiLogger.error('未知错误', { error: error instanceof Error ? error.message : '未知错误' });
    if (debugInfo) {
      failDebugRecord(debugInfo.requestId, debugInfo.startTime, error instanceof Error ? error.message : '未知错误');
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : '未知错误',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 请求取消错误类型（支持思维链）
 * 需求: 5.2, 5.3, 5.4
 */
export class GeminiRequestCancelledWithThoughtsError extends Error {
  /** 已接收的部分响应内容 */
  public partialResponse: string;
  /** 已接收的部分思维链内容 */
  public partialThought: string;
  /** 已接收的图片数据 */
  public partialImages: ImageExtractionResult[];
  
  constructor(
    message: string, 
    partialResponse: string = '', 
    partialThought: string = '',
    partialImages: ImageExtractionResult[] = []
  ) {
    super(message);
    this.name = 'GeminiRequestCancelledWithThoughtsError';
    this.partialResponse = partialResponse;
    this.partialThought = partialThought;
    this.partialImages = partialImages;
  }
}

/**
 * 发送消息到 Gemini API 并处理流式响应（支持思维链提取和 Token 统计）
 * 需求: 4.3, 5.2, 5.4, 2.2, 2.3, 3.1, 1.2, 联网搜索
 * 
 * @param contents - 消息内容数组
 * @param config - API 配置
 * @param generationConfig - 生成配置（可选）
 * @param safetySettings - 安全设置（可选）
 * @param systemInstruction - 系统指令（可选）
 * @param onChunk - 接收文本块的回调函数
 * @param advancedConfig - 高级参数配置（可选）
 * @param signal - AbortSignal 用于取消请求（可选）
 * @param webSearchEnabled - 是否启用联网搜索（可选）
 * @param onThoughtChunk - 接收思维链块的回调函数（可选）- 需求: 3.1
 * @returns 包含文本、思维链、Token 使用量等的结果对象
 */
export async function sendMessageWithThoughts(
  contents: GeminiContent[],
  config: ApiConfig,
  generationConfig?: GenerationConfig,
  safetySettings?: SafetySetting[],
  systemInstruction?: string,
  onChunk?: (text: string) => void,
  advancedConfig?: ModelAdvancedConfig,
  signal?: AbortSignal,
  webSearchEnabled?: boolean,
  onThoughtChunk?: (thought: string) => void
): Promise<{ text: string; thoughtSummary?: string; thoughtSignature?: string; images?: ImageExtractionResult[]; thoughtImages?: ImageExtractionResult[]; duration?: number; ttfb?: number; tokenUsage?: import('../types/models').MessageTokenUsage }> {
  // 需求: 2.2 - 输出请求日志
  apiLogger.info('发送流式消息请求（含思维链）', { model: config.model, messageCount: contents.length, webSearchEnabled });

  // 验证 API 配置
  const validation = validateApiEndpoint(config.endpoint);
  if (!validation.valid) {
    apiLogger.error('API 端点验证失败', { error: validation.error });
    throw new GeminiApiError(validation.error || 'API 端点无效');
  }
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    apiLogger.error('API 密钥为空');
    throw new GeminiApiError('API 密钥不能为空');
  }

  // 构建请求，传入模型 ID 以正确构建思考配置，以及联网搜索配置
  const url = buildRequestUrl(config, true);
  const body = buildRequestBody(contents, generationConfig, safetySettings, systemInstruction, advancedConfig, config.model, webSearchEnabled);

  // 需求: 2.3 - 输出 API 调用日志
  apiLogger.debug('API 请求参数', {
    model: config.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    thinkingLevel: advancedConfig?.thinkingLevel,
  });

  // 需求: 6.3 - 开始记录调试信息
  const debugInfo = startDebugRecord(url, 'POST', body);

  // 用于追踪已接收的部分响应 - 需求: 5.3, 5.4
  let fullText = '';
  let fullThought = '';
  let lastThoughtSignature: string | undefined; // 用于画图模型连续对话
  const allImages: ImageExtractionResult[] = []; // 正式回复中的图片（进入图片库）
  const allThoughtImages: ImageExtractionResult[] = []; // 思维链中的图片（不进入图片库）
  // 用于图片去重的 Set，存储已添加图片的 base64 数据哈希
  // 修复: 开启思维链时 API 可能在多个 chunk 中返回相同图片，需要去重
  const addedImageHashes = new Set<string>();
  const addedThoughtImageHashes = new Set<string>();
  let ttfb: number | undefined;
  let lastTokenUsage: import('../types/models').MessageTokenUsage | null = null; // 用于存储最后一个 chunk 的 Token 使用量
  // 收集所有原始响应块，用于调试面板显示完整的上游响应
  const rawResponseChunks: unknown[] = [];

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal, // 传递 AbortSignal 用于取消请求
    });

    // 记录首字节时间 - 需求: 8.2
    if (debugInfo) {
      ttfb = Date.now() - debugInfo.startTime;
    }

    // 处理 HTTP 错误
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 请求失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      // 需求: 6.3 - 记录失败，同时保存原始响应内容
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, errorMessage, response.status, errorText);
      }

      // 直接使用原始错误消息，让用户看到上游返回的具体错误
      throw new GeminiApiError(errorMessage, response.status);
    }

    // 处理流式响应
    if (!response.body) {
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '响应体为空');
      }
      throw new GeminiApiError('响应体为空');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      // 检查是否已取消 - 需求: 5.2
      if (signal?.aborted) {
        reader.cancel();
        apiLogger.info('请求已取消（含思维链）', { 
          partialResponseLength: fullText.length,
          partialThoughtLength: fullThought.length,
        });
        // 需求: 6.3 - 记录取消
        if (debugInfo) {
          completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, { 
            cancelled: true, 
            partialResponse: fullText,
            partialThought: fullThought,
          }, ttfb);
        }
        throw new GeminiRequestCancelledWithThoughtsError(
          '请求已取消', 
          fullText, 
          fullThought,
          allImages
        );
      }

      const { done, value } = await reader.read();
      
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      
      // 按行处理 SSE 数据
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // 保留最后一个不完整的行
      
      for (const line of lines) {
        const chunk = parseSSELine(line);
        if (chunk) {
          // 收集原始响应块用于调试
          rawResponseChunks.push(chunk);
          // 使用 extractThoughtSummary 分离文本、思维链和图片
          const extracted = extractThoughtSummary(chunk);
          if (extracted) {
            if (extracted.text) {
              fullText += extracted.text;
              onChunk?.(extracted.text);
            }
            if (extracted.thought) {
              fullThought += extracted.thought;
              // 需求: 3.1 - 调用思维链回调
              onThoughtChunk?.(extracted.thought);
            }
            // 提取 thoughtSignature（用于画图模型连续对话）
            if (extracted.thoughtSignature) {
              lastThoughtSignature = extracted.thoughtSignature;
            }
            // 提取思维链中的图片（不进入图片库，仅在思维链区域显示）
            if (extracted.thoughtImages) {
              for (const img of extracted.thoughtImages) {
                const imageHash = `${img.mimeType}:${img.data.substring(0, 100)}`;
                if (!addedThoughtImageHashes.has(imageHash)) {
                  addedThoughtImageHashes.add(imageHash);
                  allThoughtImages.push(img);
                }
              }
            }
            // 提取正式回复中的图片（进入图片库）
            if (extracted.images) {
              for (const img of extracted.images) {
                const imageHash = `${img.mimeType}:${img.data.substring(0, 100)}`;
                if (!addedImageHashes.has(imageHash)) {
                  addedImageHashes.add(imageHash);
                  allImages.push(img);
                }
              }
            }
          }
          // 需求: 1.2 - 从每个 chunk 提取 Token 使用量（最后一个有效的会被保留）
          const tokenUsage = extractTokenUsage(chunk);
          if (tokenUsage) {
            lastTokenUsage = tokenUsage;
          }
        }
      }
    }

    // 处理缓冲区中剩余的数据
    if (buffer) {
      const chunk = parseSSELine(buffer);
      if (chunk) {
        // 收集原始响应块用于调试
        rawResponseChunks.push(chunk);
        const extracted = extractThoughtSummary(chunk);
        if (extracted) {
          if (extracted.text) {
            fullText += extracted.text;
            onChunk?.(extracted.text);
          }
          if (extracted.thought) {
            fullThought += extracted.thought;
            // 需求: 3.1 - 调用思维链回调
            onThoughtChunk?.(extracted.thought);
          }
          // 提取 thoughtSignature（用于画图模型连续对话）
          if (extracted.thoughtSignature) {
            lastThoughtSignature = extracted.thoughtSignature;
          }
          // 提取思维链中的图片（不进入图片库，仅在思维链区域显示）
          if (extracted.thoughtImages) {
            for (const img of extracted.thoughtImages) {
              const imageHash = `${img.mimeType}:${img.data.substring(0, 100)}`;
              if (!addedThoughtImageHashes.has(imageHash)) {
                addedThoughtImageHashes.add(imageHash);
                allThoughtImages.push(img);
              }
            }
          }
          // 提取正式回复中的图片（进入图片库）
          if (extracted.images) {
            for (const img of extracted.images) {
              const imageHash = `${img.mimeType}:${img.data.substring(0, 100)}`;
              if (!addedImageHashes.has(imageHash)) {
                addedImageHashes.add(imageHash);
                allImages.push(img);
              }
            }
          }
        }
        // 需求: 1.2 - 从最后一个 chunk 提取 Token 使用量
        const tokenUsage = extractTokenUsage(chunk);
        if (tokenUsage) {
          lastTokenUsage = tokenUsage;
        }
      }
    }

    apiLogger.info('流式消息请求完成（含思维链）', { 
      responseLength: fullText.length, 
      hasThought: !!fullThought,
      imageCount: allImages.length,
      thoughtImageCount: allThoughtImages.length,
      hasTokenUsage: !!lastTokenUsage,
    });

    // 需求: 6.3 - 记录成功
    // 需求: 8.2 - 计算总耗时
    const duration = debugInfo ? Date.now() - debugInfo.startTime : undefined;
    
    if (debugInfo) {
      // 保存完整的原始响应数据，而不是处理后的简化内容
      completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseChunks, ttfb);
    }

    return {
      text: fullText,
      thoughtSummary: fullThought || undefined,
      thoughtSignature: lastThoughtSignature,
      images: allImages.length > 0 ? allImages : undefined,
      thoughtImages: allThoughtImages.length > 0 ? allThoughtImages : undefined,
      duration,
      ttfb,
      tokenUsage: lastTokenUsage || undefined,
    };
  } catch (error) {
    // 需求: 5.2 - 处理 AbortError 异常
    if (error instanceof GeminiRequestCancelledWithThoughtsError) {
      throw error;
    }
    
    // 处理 fetch 的 AbortError
    if (error instanceof DOMException && error.name === 'AbortError') {
      apiLogger.info('请求被中止（含思维链）', { 
        partialResponseLength: fullText.length,
        partialThoughtLength: fullThought.length,
      });
      // 需求: 6.3 - 记录取消
      if (debugInfo) {
        completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, { 
          cancelled: true, 
          partialResponse: fullText,
          partialThought: fullThought,
        }, ttfb);
      }
      throw new GeminiRequestCancelledWithThoughtsError(
        '请求已取消', 
        fullText, 
        fullThought,
        allImages
      );
    }

    // 需求: 2.4 - 输出错误日志
    if (error instanceof GeminiApiError) {
      apiLogger.error('Gemini API 错误', { type: error.errorType, message: error.message });
      // 需求: 6.3 - 记录失败（如果还没记录）
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, error.message, error.statusCode);
      }
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      apiLogger.error('网络连接失败', { message: error.message });
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '网络连接失败');
      }
      throw new GeminiApiError('网络连接失败，请检查网络设置', undefined, 'NETWORK_ERROR');
    }
    
    apiLogger.error('未知错误', { error: error instanceof Error ? error.message : '未知错误' });
    if (debugInfo) {
      failDebugRecord(debugInfo.requestId, debugInfo.startTime, error instanceof Error ? error.message : '未知错误');
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : '未知错误',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 发送消息到 Gemini API（非流式响应）
 * 需求: 10.3, 10.4, 2.2, 2.3
 * 
 * @param contents - 消息内容数组
 * @param config - API 配置
 * @param generationConfig - 生成配置（可选）
 * @param safetySettings - 安全设置（可选）
 * @param systemInstruction - 系统指令（可选）
 * @param advancedConfig - 高级参数配置（可选）
 * @returns 完整的响应文本
 */
export async function sendMessageNonStreaming(
  contents: GeminiContent[],
  config: ApiConfig,
  generationConfig?: GenerationConfig,
  safetySettings?: SafetySetting[],
  systemInstruction?: string,
  advancedConfig?: ModelAdvancedConfig
): Promise<string> {
  // 需求: 2.2 - 输出请求日志
  apiLogger.info('发送非流式消息请求', { model: config.model, messageCount: contents.length });

  // 验证 API 配置
  const validation = validateApiEndpoint(config.endpoint);
  if (!validation.valid) {
    apiLogger.error('API 端点验证失败', { error: validation.error });
    throw new GeminiApiError(validation.error || 'API 端点无效');
  }
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    apiLogger.error('API 密钥为空');
    throw new GeminiApiError('API 密钥不能为空');
  }

  // 构建请求（非流式），传入模型 ID 以正确构建画图模型配置
  const url = buildRequestUrl(config, false);
  const body = buildRequestBody(contents, generationConfig, safetySettings, systemInstruction, advancedConfig, config.model);

  // 需求: 2.3 - 输出 API 调用日志
  apiLogger.debug('API 请求参数', {
    model: config.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
  });

  // 需求: 6.3 - 开始记录调试信息
  const debugInfo = startDebugRecord(url, 'POST', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 记录首字节时间 - 需求: 8.2
    const ttfb = debugInfo ? Date.now() - debugInfo.startTime : undefined;

    // 处理 HTTP 错误
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 请求失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      // 需求: 2.4 - 输出错误日志
      apiLogger.error('API 请求失败', { status: response.status, message: errorMessage });

      // 需求: 6.3 - 记录失败，同时保存原始响应内容
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, errorMessage, response.status, errorText);
      }

      // 直接使用原始错误消息，让用户看到上游返回的具体错误
      throw new GeminiApiError(errorMessage, response.status);
    }

    // 解析非流式响应，使用 unwrapResponseData 处理响应被包装的情况
    const rawResponseData = await response.json();
    const responseData = unwrapResponseData(rawResponseData);
    
    if (!responseData.candidates || responseData.candidates.length === 0) {
      apiLogger.warn('API 响应无候选内容');
      // 需求: 6.3 - 记录成功，保存完整的原始响应
      if (debugInfo) {
        completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseData, ttfb);
      }
      return '';
    }
    
    const candidate = responseData.candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      apiLogger.warn('API 响应内容为空');
      // 需求: 6.3 - 记录成功，保存完整的原始响应
      if (debugInfo) {
        completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseData, ttfb);
      }
      return '';
    }
    
    const result = candidate.content.parts
      .filter((part): part is { text: string } => 'text' in part)
      .map(part => part.text)
      .join('');

    apiLogger.info('非流式消息请求完成', { responseLength: result.length });
    
    // 需求: 6.3 - 记录成功，保存完整的原始响应数据
    if (debugInfo) {
      completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, responseData, ttfb);
    }
    
    return result;
  } catch (error) {
    // 需求: 2.4 - 输出错误日志
    if (error instanceof GeminiApiError) {
      apiLogger.error('Gemini API 错误', { type: error.errorType, message: error.message });
      // 需求: 6.3 - 记录失败（如果还没记录）
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, error.message, error.statusCode);
      }
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      apiLogger.error('网络连接失败', { message: error.message });
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '网络连接失败');
      }
      throw new GeminiApiError('网络连接失败，请检查网络设置', undefined, 'NETWORK_ERROR');
    }
    
    apiLogger.error('未知错误', { error: error instanceof Error ? error.message : '未知错误' });
    if (debugInfo) {
      failDebugRecord(debugInfo.requestId, debugInfo.startTime, error instanceof Error ? error.message : '未知错误');
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : '未知错误',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 非流式响应结果接口
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export interface NonStreamingResult {
  /** 响应文本 */
  text: string;
  /** 思维链摘要 */
  thoughtSummary?: string;
  /** 思维链签名（用于画图模型连续对话） */
  thoughtSignature?: string;
  /** 正式回复中的图片（进入图片库） */
  images?: ImageExtractionResult[];
  /** 思维链中的图片（不进入图片库，仅在思维链区域显示） */
  thoughtImages?: ImageExtractionResult[];
  /** 请求总耗时（毫秒） */
  duration?: number;
  /** 首字节时间（毫秒） */
  ttfb?: number;
  /** Token 使用量 */
  tokenUsage?: import('../types/models').MessageTokenUsage;
}

/**
 * 发送消息到 Gemini API（非流式响应，支持思维链和完整数据返回）
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4
 * 
 * @param contents - 消息内容数组
 * @param config - API 配置
 * @param generationConfig - 生成配置（可选）
 * @param safetySettings - 安全设置（可选）
 * @param systemInstruction - 系统指令（可选）
 * @param advancedConfig - 高级参数配置（可选）
 * @param webSearchEnabled - 是否启用联网搜索（可选）
 * @returns 包含文本、思维链、Token 使用量等的完整结果对象
 */
export async function sendMessageNonStreamingWithThoughts(
  contents: GeminiContent[],
  config: ApiConfig,
  generationConfig?: GenerationConfig,
  safetySettings?: SafetySetting[],
  systemInstruction?: string,
  advancedConfig?: ModelAdvancedConfig,
  webSearchEnabled?: boolean
): Promise<NonStreamingResult> {
  // 需求: 2.2 - 输出请求日志
  apiLogger.info('发送非流式消息请求（含思维链）', { model: config.model, messageCount: contents.length, webSearchEnabled });

  // 验证 API 配置
  const validation = validateApiEndpoint(config.endpoint);
  if (!validation.valid) {
    apiLogger.error('API 端点验证失败', { error: validation.error });
    throw new GeminiApiError(validation.error || 'API 端点无效');
  }
  
  if (!config.apiKey || config.apiKey.trim() === '') {
    apiLogger.error('API 密钥为空');
    throw new GeminiApiError('API 密钥不能为空');
  }

  // 构建请求（非流式），传入模型 ID 以正确构建思考配置，以及联网搜索配置
  // 需求: 2.1, 2.2, 2.3, 2.4 - 正确传递 modelId 和 webSearchEnabled 参数
  const url = buildRequestUrl(config, false);
  const body = buildRequestBody(contents, generationConfig, safetySettings, systemInstruction, advancedConfig, config.model, webSearchEnabled);

  // 需求: 2.3 - 输出 API 调用日志
  apiLogger.debug('API 请求参数', {
    model: config.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    thinkingLevel: advancedConfig?.thinkingLevel,
    includeThoughts: advancedConfig?.includeThoughts,
  });

  // 需求: 6.3 - 开始记录调试信息
  const debugInfo = startDebugRecord(url, 'POST', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // 需求: 1.3 - 记录首字节时间
    const ttfb = debugInfo ? Date.now() - debugInfo.startTime : undefined;

    // 处理 HTTP 错误
    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `API 请求失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      // 需求: 2.4 - 输出错误日志
      apiLogger.error('API 请求失败', { status: response.status, message: errorMessage });

      // 需求: 6.3 - 记录失败，同时保存原始响应内容
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, errorMessage, response.status, errorText);
      }

      // 直接使用原始错误消息，让用户看到上游返回的具体错误
      throw new GeminiApiError(errorMessage, response.status);
    }

    // 解析非流式响应，使用 unwrapResponseData 处理响应被包装的情况
    const rawResponseData = await response.json();
    const responseData = unwrapResponseData(rawResponseData);
    
    // 需求: 1.2 - 计算总耗时
    const duration = debugInfo ? Date.now() - debugInfo.startTime : undefined;

    // 需求: 1.4, 1.5 - 使用 extractThoughtSummary 提取思维链内容、签名和图片
    const extracted = extractThoughtSummary(responseData);
    const text = extracted?.text || '';
    const thoughtSummary = extracted?.thought || undefined;
    const thoughtSignature = extracted?.thoughtSignature;
    const thoughtImages = extracted?.thoughtImages; // 思维链中的图片
    const images = extracted?.images; // 正式回复中的图片

    // 需求: 1.1 - 提取 Token 使用量
    const tokenUsage = extractTokenUsage(responseData) || undefined;

    apiLogger.info('非流式消息请求完成（含思维链）', { 
      responseLength: text.length,
      hasThought: !!thoughtSummary,
      imageCount: images?.length || 0,
      thoughtImageCount: thoughtImages?.length || 0,
      hasTokenUsage: !!tokenUsage,
    });
    
    // 需求: 6.3 - 记录成功，保存完整的原始响应数据
    if (debugInfo) {
      completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseData, ttfb);
    }
    
    return {
      text,
      thoughtSummary,
      thoughtSignature,
      images: images && images.length > 0 ? images : undefined,
      thoughtImages: thoughtImages && thoughtImages.length > 0 ? thoughtImages : undefined,
      duration,
      ttfb,
      tokenUsage,
    };
  } catch (error) {
    // 需求: 2.4 - 输出错误日志
    if (error instanceof GeminiApiError) {
      apiLogger.error('Gemini API 错误', { type: error.errorType, message: error.message });
      // 需求: 6.3 - 记录失败（如果还没记录）
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, error.message, error.statusCode);
      }
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      apiLogger.error('网络连接失败', { message: error.message });
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '网络连接失败');
      }
      throw new GeminiApiError('网络连接失败，请检查网络设置', undefined, 'NETWORK_ERROR');
    }
    
    apiLogger.error('未知错误', { error: error instanceof Error ? error.message : '未知错误' });
    if (debugInfo) {
      failDebugRecord(debugInfo.requestId, debugInfo.startTime, error instanceof Error ? error.message : '未知错误');
    }
    throw new GeminiApiError(
      error instanceof Error ? error.message : '未知错误',
      undefined,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * 测试 API 连接
 * 需求: 1.4
 * 
 * @param config - API 配置
 * @returns 连接是否成功
 */
export async function testConnection(config: ApiConfig): Promise<{ success: boolean; error?: string }> {
  try {
    // 验证配置
    const validation = validateApiEndpoint(config.endpoint);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }
    
    if (!config.apiKey || config.apiKey.trim() === '') {
      return { success: false, error: 'API 密钥不能为空' };
    }

    // 发送简单的测试请求
    const testContents: GeminiContent[] = [
      { role: 'user', parts: [{ text: 'Hi' }] }
    ];

    const url = buildRequestUrl(config, false);
    const body = buildRequestBody(testContents, { maxOutputTokens: 10 });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `连接失败: ${response.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      switch (response.status) {
        case 401:
          return { success: false, error: 'API 密钥无效' };
        case 429:
          return { success: false, error: '请求过于频繁' };
        case 500:
        case 502:
        case 503:
          return { success: false, error: '服务暂时不可用' };
        default:
          return { success: false, error: errorMessage };
      }
    }

    return { success: true };
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return { success: false, error: '网络连接失败' };
    }
    
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '未知错误' 
    };
  }
}
