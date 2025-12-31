/**
 * Gemini API 调试记录函数
 * 需求: 1.1, 6.3
 */

import { useDebugStore, createRequestRecord, generateRequestId } from '../../stores/debug';
import type { DebugInfo } from './types';

/**
 * 开始记录 API 请求
 * 需求: 6.3
 * 
 * @param url - 请求 URL（不含 API 密钥）
 * @param method - HTTP 方法
 * @param body - 请求体
 * @returns 请求记录 ID 和开始时间
 */
export function startDebugRecord(
  url: string,
  method: string,
  body: unknown
): DebugInfo | null {
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
export function completeDebugRecord(
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
export function failDebugRecord(
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
