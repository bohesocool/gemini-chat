/**
 * Gemini API 调用函数
 * 需求: 1.1
 */

import type {
  GeminiContent,
  GenerationConfig,
  SafetySetting,
} from '../../types';
import type { ApiConfig, ModelAdvancedConfig } from '../../types/models';
import { apiLogger } from '../logger';

import type { MessageTokenUsage } from '../../types/models';
import type { ImageExtractionResult, SendMessageResult, NonStreamingResult, DebugInfo } from './types';
import { GeminiApiError, GeminiRequestCancelledWithThoughtsError } from './errors';
import { startDebugRecord, completeDebugRecord, failDebugRecord } from './debug';
import { validateApiEndpoint, buildRequestUrl, buildRequestBody } from './builders';
import { parseSSELine, extractThoughtSummary, extractTokenUsage, unwrapResponseData } from './parsers';

// ============ 内部类型定义（不导出） ============

/** 请求管道配置 */
interface PipelineConfig {
  contents: GeminiContent[];
  apiConfig: ApiConfig;
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
  systemInstruction?: string;
  advancedConfig?: ModelAdvancedConfig;
  stream: boolean;
  signal?: AbortSignal;
  webSearchEnabled?: boolean;
  urlContextEnabled?: boolean;
  // 流式回调（仅流式模式使用）
  onChunk?: (text: string) => void;
  onThoughtChunk?: (thought: string) => void;
}

/** 管道统一返回结果 */
interface PipelineResult {
  text: string;
  thoughtSummary?: string;
  thoughtSignature?: string;
  images?: ImageExtractionResult[];
  thoughtImages?: ImageExtractionResult[];
  duration?: number;
  ttfb?: number;
  tokenUsage?: MessageTokenUsage;
}

// ============ 内部函数（不导出） ============

/**
 * 处理流式响应（内部函数）
 * 从 sendMessageWithThoughts 中提取，处理 SSE 解析、思维链分离、图片去重
 *
 * @param response - fetch 返回的 Response 对象
 * @param signal - AbortSignal 用于取消请求（可选）
 * @param onChunk - 接收文本块的回调函数（可选）
 * @param onThoughtChunk - 接收思维链块的回调函数（可选）
 * @param debugInfo - 调试记录信息（可选）
 * @param rawResponseChunks - 用于收集原始响应块的数组（可选）
 * @returns 包含文本、思维链、图片、Token 使用量的结果对象
 */
async function processStreamResponse(
  response: Response,
  signal: AbortSignal | undefined,
  onChunk?: (text: string) => void,
  onThoughtChunk?: (thought: string) => void,
  debugInfo?: DebugInfo | null,
  rawResponseChunks?: unknown[]
): Promise<{
  text: string;
  thought: string;
  thoughtSignature?: string;
  images: ImageExtractionResult[];
  thoughtImages: ImageExtractionResult[];
  tokenUsage: MessageTokenUsage | null;
}> {
  let fullText = '';
  let fullThought = '';
  let lastThoughtSignature: string | undefined;
  const allImages: ImageExtractionResult[] = [];
  const allThoughtImages: ImageExtractionResult[] = [];
  // 用于图片去重的 Set，存储已添加图片的 base64 数据哈希
  // 修复: 开启思维链时 API 可能在多个 chunk 中返回相同图片，需要去重
  const addedImageHashes = new Set<string>();
  const addedThoughtImageHashes = new Set<string>();
  let lastTokenUsage: MessageTokenUsage | null = null;

  if (!response.body) {
    if (debugInfo) {
      failDebugRecord(debugInfo.requestId, debugInfo.startTime, '响应体为空');
    }
    throw new GeminiApiError('响应体为空');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  /**
   * 处理单个已解析的 SSE chunk
   * 提取文本、思维链、图片（含去重）和 Token 使用量
   */
  const processChunk = (chunk: import('../../types').StreamChunk) => {
    // 收集原始响应块用于调试
    rawResponseChunks?.push(chunk);

    // 使用 extractThoughtSummary 分离文本、思维链和图片
    const extracted = extractThoughtSummary(chunk);
    if (extracted) {
      if (extracted.text) {
        fullText += extracted.text;
        onChunk?.(extracted.text);
      }
      if (extracted.thought) {
        fullThought += extracted.thought;
        onThoughtChunk?.(extracted.thought);
      }
      // 提取 thoughtSignature（用于画图模型连续对话）
      if (extracted.thoughtSignature) {
        lastThoughtSignature = extracted.thoughtSignature;
      }
      // 提取思维链中的图片（不进入图片库，仅在思维链区域显示）
      // 基于 mimeType + data 前缀哈希进行去重
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
      // 基于 mimeType + data 前缀哈希进行去重
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

    // 从每个 chunk 提取 Token 使用量（最后一个有效的会被保留）
    const tokenUsage = extractTokenUsage(chunk);
    if (tokenUsage) {
      lastTokenUsage = tokenUsage;
    }
  };

  while (true) {
    // 检查是否已取消
    if (signal?.aborted) {
      reader.cancel();
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
        processChunk(chunk);
      }
    }
  }

  // 处理缓冲区中剩余的数据
  if (buffer) {
    const chunk = parseSSELine(buffer);
    if (chunk) {
      processChunk(chunk);
    }
  }

  return {
    text: fullText,
    thought: fullThought,
    thoughtSignature: lastThoughtSignature,
    images: allImages,
    thoughtImages: allThoughtImages,
    tokenUsage: lastTokenUsage,
  };
}

/**
 * 处理非流式响应（内部函数）
 * 从 sendMessageNonStreamingWithThoughts 中提取，解析完整响应数据
 *
 * @param responseData - 经过 unwrapResponseData 解包后的响应数据
 * @param rawResponseData - 原始响应数据（用于调试记录）
 * @param debugInfo - 调试记录信息（可选）
 * @param ttfb - 首字节时间（可选）
 * @returns 包含文本、思维链、图片、Token 使用量的结果对象
 */
function processNonStreamResponse(
  responseData: unknown,
  rawResponseData: unknown,
  debugInfo?: DebugInfo | null,
  ttfb?: number
): {
  text: string;
  thought: string;
  thoughtSignature?: string;
  images: ImageExtractionResult[];
  thoughtImages: ImageExtractionResult[];
  tokenUsage: MessageTokenUsage | null;
} {
  // 使用 extractThoughtSummary 提取文本、思维链、签名和图片
  const extracted = extractThoughtSummary(responseData as import('../../types').StreamChunk);
  const text = extracted?.text || '';
  const thought = extracted?.thought || '';
  const thoughtSignature = extracted?.thoughtSignature;
  const thoughtImages = extracted?.thoughtImages || [];
  const images = extracted?.images || [];

  // 从响应数据中提取 Token 使用量
  const tokenUsage = extractTokenUsage(responseData as import('../../types').StreamChunk) || null;

  // 记录调试信息（成功完成）
  if (debugInfo) {
    completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseData, ttfb);
  }

  return {
    text,
    thought,
    thoughtSignature,
    images,
    thoughtImages,
    tokenUsage,
  };
}

/**
 * 统一请求管道（内部函数）
 * 封装：验证 → 构建请求 → 调试记录 → HTTP 调用 → 响应处理 → 错误处理
 *
 * 需求: 1.1, 1.2, 1.3, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11
 *
 * @param config - 管道配置，包含请求参数、流式/非流式模式、回调等
 * @returns 统一的管道结果，包含文本、思维链、图片、耗时、Token 使用量等
 */
async function executeRequest(config: PipelineConfig): Promise<PipelineResult> {
  const {
    contents,
    apiConfig,
    generationConfig,
    safetySettings,
    systemInstruction,
    advancedConfig,
    stream,
    signal,
    webSearchEnabled,
    urlContextEnabled,
    onChunk,
    onThoughtChunk,
  } = config;

  // ========== 1. 验证阶段 ==========

  // 验证 API 端点
  const validation = validateApiEndpoint(apiConfig.endpoint);
  if (!validation.valid) {
    apiLogger.error('API 端点验证失败', { error: validation.error });
    throw new GeminiApiError(validation.error || 'API 端点无效');
  }

  // 验证 API 密钥
  if (!apiConfig.apiKey || apiConfig.apiKey.trim() === '') {
    apiLogger.error('API 密钥为空');
    throw new GeminiApiError('API 密钥不能为空');
  }

  // ========== 2. 构建阶段 ==========

  // 构建请求 URL（根据流式/非流式模式）
  const url = buildRequestUrl(apiConfig, stream);
  // 构建请求体（传入模型 ID、联网搜索和 URL 上下文配置）
  const body = buildRequestBody(
    contents,
    generationConfig,
    safetySettings,
    systemInstruction,
    advancedConfig,
    apiConfig.model,
    webSearchEnabled,
    urlContextEnabled
  );
  // 构建请求头（通过 header 传递 API key，避免密钥暴露在 URL 中）
  const headers = {
    'Content-Type': 'application/json',
    'x-goog-api-key': apiConfig.apiKey,
  };

  // 输出 API 调用日志
  apiLogger.info(stream ? '发送流式消息请求' : '发送非流式消息请求', {
    model: apiConfig.model,
    messageCount: contents.length,
    webSearchEnabled,
    urlContextEnabled,
  });
  apiLogger.debug('API 请求参数', {
    model: apiConfig.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    thinkingLevel: advancedConfig?.thinkingLevel,
  });

  // ========== 3. 调试阶段 ==========

  // 独立记录请求开始时间（不依赖调试模式）
  const requestStartTime = Date.now();
  // 开始记录调试信息（仅在调试模式启用时有效）
  const debugInfo = startDebugRecord(url, 'POST', body, headers);

  // 用于追踪已接收的部分响应（流式模式下用于取消时返回部分内容）
  let partialText = '';
  let partialThought = '';
  let partialImages: ImageExtractionResult[] = [];
  let ttfb: number | undefined;
  // 收集所有原始响应块，用于调试面板显示完整的上游响应
  const rawResponseChunks: unknown[] = [];

  try {
    // ========== 4. HTTP 调用 ==========

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal,
    });

    // 记录首字节时间（独立于调试模式）
    ttfb = Date.now() - requestStartTime;

    // 处理 HTTP 错误响应
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

      apiLogger.error('API 请求失败', { status: response.status, message: errorMessage });
      // 记录失败，同时保存原始响应内容
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, errorMessage, response.status, errorText);
      }
      // 直接使用原始错误消息，让用户看到上游返回的具体错误
      throw new GeminiApiError(errorMessage, response.status);
    }

    // ========== 5. 响应处理 ==========

    if (stream) {
      // 流式响应处理
      const streamResult = await processStreamResponse(
        response,
        signal,
        // 包装 onChunk 回调，同时追踪部分文本（用于取消时返回）
        onChunk ? (text: string) => {
          partialText += text;
          onChunk(text);
        } : (text: string) => {
          partialText += text;
        },
        // 包装 onThoughtChunk 回调，同时追踪部分思维链
        onThoughtChunk ? (thought: string) => {
          partialThought += thought;
          onThoughtChunk(thought);
        } : (thought: string) => {
          partialThought += thought;
        },
        debugInfo,
        rawResponseChunks
      );

      // 更新部分图片追踪（用于取消时返回）
      partialImages = streamResult.images;

      // 计算总耗时
      const duration = Date.now() - requestStartTime;

      apiLogger.info('流式消息请求完成', {
        responseLength: streamResult.text.length,
        hasThought: !!streamResult.thought,
        imageCount: streamResult.images.length,
        thoughtImageCount: streamResult.thoughtImages.length,
        hasTokenUsage: !!streamResult.tokenUsage,
      });

      // 记录成功，保存完整的原始响应数据
      if (debugInfo) {
        completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, rawResponseChunks, ttfb);
      }

      return {
        text: streamResult.text,
        thoughtSummary: streamResult.thought || undefined,
        thoughtSignature: streamResult.thoughtSignature,
        images: streamResult.images.length > 0 ? streamResult.images : undefined,
        thoughtImages: streamResult.thoughtImages.length > 0 ? streamResult.thoughtImages : undefined,
        duration,
        ttfb,
        tokenUsage: streamResult.tokenUsage || undefined,
      };
    } else {
      // 非流式响应处理
      const rawResponseData = await response.json();
      const responseData = unwrapResponseData(rawResponseData);

      // 使用 processNonStreamResponse 处理响应数据
      const nonStreamResult = processNonStreamResponse(responseData, rawResponseData, debugInfo, ttfb);

      // 计算总耗时
      const duration = Date.now() - requestStartTime;

      apiLogger.info('非流式消息请求完成', {
        responseLength: nonStreamResult.text.length,
        hasThought: !!nonStreamResult.thought,
        imageCount: nonStreamResult.images.length,
        thoughtImageCount: nonStreamResult.thoughtImages.length,
        hasTokenUsage: !!nonStreamResult.tokenUsage,
      });

      return {
        text: nonStreamResult.text,
        thoughtSummary: nonStreamResult.thought || undefined,
        thoughtSignature: nonStreamResult.thoughtSignature,
        images: nonStreamResult.images.length > 0 ? nonStreamResult.images : undefined,
        thoughtImages: nonStreamResult.thoughtImages.length > 0 ? nonStreamResult.thoughtImages : undefined,
        duration,
        ttfb,
        tokenUsage: nonStreamResult.tokenUsage || undefined,
      };
    }
  } catch (error) {
    // ========== 6. 错误处理 ==========

    // 已经是取消错误（含思维链），直接抛出
    if (error instanceof GeminiRequestCancelledWithThoughtsError) {
      throw error;
    }

    // 处理 fetch 的 AbortError（将其转换为含部分响应的取消错误）
    if (error instanceof DOMException && error.name === 'AbortError') {
      apiLogger.info('请求被中止', {
        partialResponseLength: partialText.length,
        partialThoughtLength: partialThought.length,
      });
      if (debugInfo) {
        completeDebugRecord(debugInfo.requestId, debugInfo.startTime, 200, {
          cancelled: true,
          partialResponse: partialText,
          partialThought: partialThought,
        }, ttfb);
      }
      throw new GeminiRequestCancelledWithThoughtsError(
        '请求已取消',
        partialText,
        partialThought,
        partialImages
      );
    }

    // 已经是 GeminiApiError（如 HTTP 错误），记录调试信息后直接抛出
    if (error instanceof GeminiApiError) {
      apiLogger.error('Gemini API 错误', { type: error.errorType, message: error.message });
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, error.message, error.statusCode);
      }
      throw error;
    }

    // 网络连接失败（fetch 抛出的 TypeError）
    if (error instanceof TypeError && error.message.includes('fetch')) {
      apiLogger.error('网络连接失败', { message: error.message });
      if (debugInfo) {
        failDebugRecord(debugInfo.requestId, debugInfo.startTime, '网络连接失败');
      }
      throw new GeminiApiError('网络连接失败，请检查网络设置', undefined, 'NETWORK_ERROR');
    }

    // 未知错误
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

// ============ 公共函数（薄包装，调用 executeRequest 管道） ============

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
  // 调用统一管道 → 返回纯文本
  const result = await executeRequest({
    contents,
    apiConfig: config,
    generationConfig,
    safetySettings,
    systemInstruction,
    advancedConfig,
    stream: true,
    signal,
    onChunk,
  });
  return result.text;
}

/**
 * 发送消息到 Gemini API 并处理流式响应（支持思维链提取和 Token 统计）
 * 需求: 4.3, 5.2, 5.4, 2.2, 2.3, 3.1, 1.2, 联网搜索, URL 上下文
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
 * @param urlContextEnabled - 是否启用 URL 上下文（可选）- 需求: 2.1, 2.4
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
  onThoughtChunk?: (thought: string) => void,
  urlContextEnabled?: boolean
): Promise<SendMessageResult> {
  // 调用统一管道 → 直接返回 PipelineResult（兼容 SendMessageResult）
  return await executeRequest({
    contents,
    apiConfig: config,
    generationConfig,
    safetySettings,
    systemInstruction,
    advancedConfig,
    stream: true,
    signal,
    webSearchEnabled,
    urlContextEnabled,
    onChunk,
    onThoughtChunk,
  });
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
  // 调用统一管道 → 返回纯文本
  const result = await executeRequest({
    contents,
    apiConfig: config,
    generationConfig,
    safetySettings,
    systemInstruction,
    advancedConfig,
    stream: false,
  });
  return result.text;
}

/**
 * 发送消息到 Gemini API（非流式响应，支持思维链和完整数据返回）
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, URL 上下文
 *
 * @param contents - 消息内容数组
 * @param config - API 配置
 * @param generationConfig - 生成配置（可选）
 * @param safetySettings - 安全设置（可选）
 * @param systemInstruction - 系统指令（可选）
 * @param advancedConfig - 高级参数配置（可选）
 * @param webSearchEnabled - 是否启用联网搜索（可选）
 * @param urlContextEnabled - 是否启用 URL 上下文（可选）- 需求: 2.1, 2.4
 * @returns 包含文本、思维链、Token 使用量等的完整结果对象
 */
export async function sendMessageNonStreamingWithThoughts(
  contents: GeminiContent[],
  config: ApiConfig,
  generationConfig?: GenerationConfig,
  safetySettings?: SafetySetting[],
  systemInstruction?: string,
  advancedConfig?: ModelAdvancedConfig,
  webSearchEnabled?: boolean,
  urlContextEnabled?: boolean
): Promise<NonStreamingResult> {
  // 调用统一管道 → 直接返回 PipelineResult（兼容 NonStreamingResult）
  return await executeRequest({
    contents,
    apiConfig: config,
    generationConfig,
    safetySettings,
    systemInstruction,
    advancedConfig,
    stream: false,
    webSearchEnabled,
    urlContextEnabled,
  });
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
        'x-goog-api-key': config.apiKey, // 通过 header 传递 API key，避免密钥暴露在 URL 中
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
