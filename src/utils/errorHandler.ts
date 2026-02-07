/**
 * 统一错误处理工具
 * 需求: 6.1, 6.2, 6.3, 6.4
 *
 * 提供统一的错误处理函数，将各类错误转换为用户友好的消息
 */

import { createLogger } from '../services/logger';
import { getTranslation } from '../i18n';

// 创建错误处理专用日志记录器
const errorLogger = createLogger('ErrorHandler');

/**
 * 获取 i18n 错误消息的函数
 * 集中管理错误消息的翻译
 */
function getErrorMessage(key: string, params?: Record<string, string | number>): string {
  return getTranslation(`errors.${key}`, params);
}

/**
 * 错误消息键常量（用于代码内部引用）
 * 需求: 6.1, 6.2, 6.3
 */
export const ERROR_MESSAGE_KEYS = {
  /** 网络连接失败 */
  NETWORK: 'network',
  /** API 密钥为空 */
  API_KEY_EMPTY: 'apiKeyEmpty',
  /** 未知错误 */
  UNKNOWN: 'unknown',
  /** 请求超时 */
  TIMEOUT: 'timeout',
  /** API 端点无效 */
  INVALID_ENDPOINT: 'invalidEndpoint',
  /** 响应体为空 */
  EMPTY_RESPONSE: 'emptyResponse',
  /** 请求已取消 */
  REQUEST_CANCELLED: 'requestCancelled',
} as const;

/**
 * 获取本地化的错误消息对象
 * 用于向后兼容现有代码
 */
export function getErrorMessages() {
  return {
    NETWORK: getErrorMessage('network'),
    API_KEY_EMPTY: getErrorMessage('apiKeyEmpty'),
    UNKNOWN: getErrorMessage('unknown'),
    TIMEOUT: getErrorMessage('timeout'),
    INVALID_ENDPOINT: getErrorMessage('invalidEndpoint'),
    EMPTY_RESPONSE: getErrorMessage('emptyResponse'),
    REQUEST_CANCELLED: getErrorMessage('requestCancelled'),
  };
}

/**
 * 向后兼容的 ERROR_MESSAGES 导出
 * @deprecated 请使用 getErrorMessages() 代替
 */
export const ERROR_MESSAGES = {
  get NETWORK() { return getErrorMessage('network'); },
  get API_KEY_EMPTY() { return getErrorMessage('apiKeyEmpty'); },
  get UNKNOWN() { return getErrorMessage('unknown'); },
  get TIMEOUT() { return getErrorMessage('timeout'); },
  get INVALID_ENDPOINT() { return getErrorMessage('invalidEndpoint'); },
  get EMPTY_RESPONSE() { return getErrorMessage('emptyResponse'); },
  get REQUEST_CANCELLED() { return getErrorMessage('requestCancelled'); },
};

/**
 * 错误处理选项
 */
export interface ErrorHandlerOptions {
  /** 是否记录错误日志，默认为 true */
  logError?: boolean;
  /** 错误上下文信息 */
  context?: Record<string, unknown>;
}

/**
 * 检查是否为网络错误
 * 需求: 6.2
 *
 * @param error - 错误对象
 * @returns 是否为网络错误
 */
function isNetworkError(error: unknown): boolean {
  // TypeError + fetch 关键字通常表示网络错误
  if (error instanceof TypeError && error.message.includes('fetch')) {
    return true;
  }

  // 检查错误消息中是否包含网络相关关键字
  if (error instanceof Error) {
    const networkKeywords = ['network', 'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'fetch'];
    return networkKeywords.some((keyword) =>
      error.message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  return false;
}

/**
 * 检查是否为 GeminiApiError
 *
 * @param error - 错误对象
 * @returns 是否为 GeminiApiError
 */
function isGeminiApiError(
  error: unknown
): error is { name: string; message: string; statusCode?: number; errorType?: string } {
  return (
    error !== null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name: string }).name === 'GeminiApiError'
  );
}

/**
 * 处理网络错误
 * 需求: 6.2
 *
 * @param error - 错误对象
 * @returns 用户友好的错误消息
 */
export function handleNetworkError(error: unknown): string {
  if (error instanceof Error) {
    // 检查是否为超时错误
    if (error.message.toLowerCase().includes('timeout')) {
      return getErrorMessage('timeout');
    }
  }

  return getErrorMessage('network');
}

/**
 * 处理 API 错误
 * 需求: 6.1
 *
 * 将 GeminiApiError 转换为用户友好的消息
 *
 * @param error - 错误对象
 * @returns 用户友好的错误消息
 */
export function handleApiError(error: unknown): string {
  // 处理 GeminiApiError
  if (isGeminiApiError(error)) {
    // 如果有具体的错误消息，直接返回
    if (error.message) {
      return error.message;
    }

    // 根据错误类型返回对应消息
    if (error.errorType === 'NETWORK_ERROR') {
      return getErrorMessage('network');
    }

    // 根据状态码返回对应消息
    if (error.statusCode) {
      switch (error.statusCode) {
        case 401:
          return getErrorMessage('apiKeyInvalid');
        case 403:
          return getErrorMessage('noPermission');
        case 404:
          return getErrorMessage('resourceNotFound');
        case 429:
          return getErrorMessage('tooManyRequests');
        case 500:
        case 502:
        case 503:
          return getErrorMessage('serverUnavailable');
        default:
          return getErrorMessage('apiFailed', { statusCode: error.statusCode });
      }
    }
  }

  // 处理普通 Error
  if (error instanceof Error) {
    return error.message || getErrorMessage('unknown');
  }

  return getErrorMessage('unknown');
}

/**
 * 统一错误处理函数
 * 需求: 6.1, 6.2, 6.3, 6.4
 *
 * 将各类错误转换为用户友好的消息，并可选地记录日志
 *
 * @param error - 错误对象
 * @param options - 错误处理选项
 * @returns 用户友好的错误消息
 */
export function handleError(error: unknown, options: ErrorHandlerOptions = {}): string {
  const { logError = true, context } = options;

  let message: string;

  // 1. 检查是否为网络错误
  if (isNetworkError(error)) {
    message = handleNetworkError(error);
  }
  // 2. 检查是否为 API 错误
  else if (isGeminiApiError(error)) {
    message = handleApiError(error);
  }
  // 3. 处理普通 Error
  else if (error instanceof Error) {
    message = error.message || getErrorMessage('unknown');
  }
  // 4. 处理字符串错误
  else if (typeof error === 'string') {
    message = error;
  }
  // 5. 未知错误类型
  else {
    message = getErrorMessage('unknown');
  }

  // 需求: 6.4 - 使用集中的日志服务记录错误
  if (logError) {
    errorLogger.error(message, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      ...context,
    });
  }

  return message;
}
