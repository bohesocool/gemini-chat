/**
 * Gemini API 错误类型定义
 * 需求: 1.1
 */

import type { ImageExtractionResult } from './types';

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
