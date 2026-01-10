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

import type { ImageExtractionResult, SendMessageResult, NonStreamingResult } from './types';
import { GeminiApiError, GeminiRequestCancelledError, GeminiRequestCancelledWithThoughtsError } from './errors';
import { startDebugRecord, completeDebugRecord, failDebugRecord } from './debug';
import { validateApiEndpoint, buildRequestUrl, buildRequestBody } from './builders';
import { parseSSELine, extractTextFromChunk, extractThoughtSummary, extractTokenUsage, unwrapResponseData } from './parsers';

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
  // 需求: 2.2 - 输出请求日志
  apiLogger.info('发送流式消息请求（含思维链）', { model: config.model, messageCount: contents.length, webSearchEnabled, urlContextEnabled });

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

  // 构建请求，传入模型 ID 以正确构建思考配置，以及联网搜索和 URL 上下文配置
  const url = buildRequestUrl(config, true);
  const body = buildRequestBody(contents, generationConfig, safetySettings, systemInstruction, advancedConfig, config.model, webSearchEnabled, urlContextEnabled);

  // 需求: 2.3 - 输出 API 调用日志
  apiLogger.debug('API 请求参数', {
    model: config.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    thinkingLevel: advancedConfig?.thinkingLevel,
  });

  // 需求: 8.1 - 独立记录请求开始时间（不依赖调试模式）
  const requestStartTime = Date.now();
  
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
  let lastTokenUsage: import('../../types/models').MessageTokenUsage | null = null; // 用于存储最后一个 chunk 的 Token 使用量
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

    // 需求: 8.3 - 记录首字节时间（独立于调试模式）
    ttfb = Date.now() - requestStartTime;

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
    // 需求: 8.2 - 计算总耗时（独立于调试模式）
    const duration = Date.now() - requestStartTime;
    
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
  // 需求: 2.2 - 输出请求日志
  apiLogger.info('发送非流式消息请求（含思维链）', { model: config.model, messageCount: contents.length, webSearchEnabled, urlContextEnabled });

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

  // 构建请求（非流式），传入模型 ID 以正确构建思考配置，以及联网搜索和 URL 上下文配置
  // 需求: 2.1, 2.2, 2.3, 2.4 - 正确传递 modelId、webSearchEnabled 和 urlContextEnabled 参数
  const url = buildRequestUrl(config, false);
  const body = buildRequestBody(contents, generationConfig, safetySettings, systemInstruction, advancedConfig, config.model, webSearchEnabled, urlContextEnabled);

  // 需求: 2.3 - 输出 API 调用日志
  apiLogger.debug('API 请求参数', {
    model: config.model,
    temperature: generationConfig?.temperature,
    maxOutputTokens: generationConfig?.maxOutputTokens,
    thinkingLevel: advancedConfig?.thinkingLevel,
    includeThoughts: advancedConfig?.includeThoughts,
  });

  // 需求: 8.1 - 独立记录请求开始时间（不依赖调试模式）
  const requestStartTime = Date.now();
  
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

    // 需求: 8.3 - 记录首字节时间（独立于调试模式）
    const ttfb = Date.now() - requestStartTime;

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
    
    // 需求: 8.2 - 计算总耗时（独立于调试模式）
    const duration = Date.now() - requestStartTime;

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
