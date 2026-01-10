/**
 * Gemini 服务类型定义
 * 需求: 1.1, 1.2
 */

import type { MessageTokenUsage } from '../../types/models';

// ============ URL 上下文相关类型 ============

/**
 * URL 检索状态枚举
 * 需求: 3.2
 */
export type UrlRetrievalStatus =
  | 'URL_RETRIEVAL_STATUS_SUCCESS'
  | 'URL_RETRIEVAL_STATUS_UNSAFE'
  | 'URL_RETRIEVAL_STATUS_UNSPECIFIED'
  | 'URL_RETRIEVAL_STATUS_ERROR';

/**
 * 单个 URL 的元数据
 * 需求: 3.2
 */
export interface UrlMetadata {
  /** 检索的 URL */
  retrievedUrl: string;
  /** 检索状态 */
  urlRetrievalStatus: UrlRetrievalStatus;
}

/**
 * URL 上下文元数据
 * 需求: 3.2
 */
export interface UrlContextMetadata {
  /** URL 元数据数组 */
  urlMetadata: UrlMetadata[];
}

// ============ 图片和思维链相关类型 ============

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
  tokenUsage?: MessageTokenUsage;
}

/**
 * 流式响应结果接口（支持思维链）
 */
export interface SendMessageResult {
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
  tokenUsage?: MessageTokenUsage;
}

/**
 * 调试记录信息
 */
export interface DebugInfo {
  requestId: string;
  startTime: number;
}
