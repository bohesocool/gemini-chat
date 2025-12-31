/**
 * Gemini API 响应解析函数
 * 需求: 1.1
 */

import type { StreamChunk } from '../../types';
import type { MessageTokenUsage } from '../../types/models';
import type { ImageExtractionResult, ThoughtExtractionResult } from './types';

/**
 * 解包 API 响应数据
 * 某些 API 端点返回 {"response": {...}, "traceId": "..."} 格式
 * 此函数将其解包为标准的 StreamChunk 格式
 * 
 * @param data - 原始响应数据
 * @returns 解包后的 StreamChunk
 */
export function unwrapResponseData(data: unknown): StreamChunk {
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
export function parseSSELine(line: string): StreamChunk | null {
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
export function extractTextFromChunk(chunk: StreamChunk): string {
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
export function extractTokenUsage(chunk: StreamChunk): MessageTokenUsage | null {
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
