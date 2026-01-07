/**
 * Gemini API 请求构建函数
 * 需求: 1.1, 1.2, 1.3, 1.4, 3.3, 4.1, 4.2, 4.3
 */

import type {
  GeminiContent,
  GeminiRequest,
  GenerationConfig,
  SafetySetting,
  ThinkingConfig,
  ImageConfig,
  GeminiPart,
  GeminiInlineDataPart,
  GeminiFileDataPart,
} from '../../types';
import type { ApiConfig, ModelAdvancedConfig, MediaResolution, ModelCapabilities, Attachment } from '../../types/models';
import { getModelCapabilities as getModelCapabilitiesFromPreset, DEFAULT_IMAGE_GENERATION_CONFIG, OFFICIAL_API_ENDPOINT } from '../../types/models';
import { useModelStore } from '../../stores/model';
import type { FileReference } from '../../types/filesApi';

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

// ============ URL 验证和构建 ============

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
  config: import('../../types/models').ImageGenerationConfig,
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


// ============ Files API 文件引用构建 ============

/**
 * 将文件引用转换为 Gemini API 的 file_data part
 * 需求: 3.3, 4.1
 * 
 * @param ref - 文件引用对象
 * @returns Gemini API 的 file_data part 格式
 */
export function fileReferenceToGeminiPart(ref: FileReference): GeminiFileDataPart {
  return {
    file_data: {
      file_uri: ref.uri,
      mime_type: ref.mimeType,
    },
  };
}

/**
 * 将附件转换为 Gemini API 的 inlineData part
 * 
 * @param attachment - 附件对象
 * @returns Gemini API 的 inlineData part 格式
 */
function attachmentToGeminiPart(attachment: Attachment): GeminiInlineDataPart {
  return {
    inlineData: {
      mimeType: attachment.mimeType,
      data: attachment.data,
    },
  };
}

/**
 * 构建包含文件引用的消息内容
 * 需求: 3.3, 4.1, 4.2, 4.3
 * 
 * 支持混合文件引用、内联附件和文本内容。
 * 文件引用使用 file_data 格式，内联附件使用 inlineData 格式。
 * 
 * @param text - 文本内容
 * @param fileReferences - 文件引用数组（通过 Files API 上传的文件）
 * @param inlineAttachments - 内联附件数组（base64 编码的文件）
 * @returns Gemini API 的 Content 对象
 */
export function buildContentWithFileReferences(
  text: string,
  fileReferences: FileReference[] = [],
  inlineAttachments: Attachment[] = []
): GeminiContent {
  const parts: GeminiPart[] = [];

  // 添加文件引用 parts（使用 file_data 格式）
  // 需求: 4.1 - 使用 file_data part 格式
  for (const ref of fileReferences) {
    // 只添加状态为 ready 的文件引用
    if (ref.status === 'ready') {
      parts.push(fileReferenceToGeminiPart(ref));
    }
  }

  // 添加内联附件 parts（使用 inlineData 格式）
  // 需求: 4.3 - 支持混合文件引用与内联 base64 数据
  for (const attachment of inlineAttachments) {
    parts.push(attachmentToGeminiPart(attachment));
  }

  // 添加文本 part
  // 需求: 4.2 - 支持混合文件引用与文本内容
  if (text.trim()) {
    parts.push({ text });
  }

  return {
    role: 'user',
    parts,
  };
}
