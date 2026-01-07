/**
 * Files API 错误处理模块
 * 需求: 5.1, 5.2, 5.3, 5.4, 6.5
 * 
 * 提供统一的错误类型定义、错误代码枚举和用户友好的错误消息映射
 */

// ============ 错误代码枚举 ============

/**
 * Files API 错误代码
 * 用于标识不同类型的错误，便于错误处理和用户提示
 */
export type FilesApiErrorCode =
  | 'FILE_TOO_LARGE'      // 文件超过 2GB - 需求: 2.6
  | 'UNSUPPORTED_TYPE'    // 不支持的文件类型 - 需求: 6.5
  | 'UPLOAD_FAILED'       // 上传失败 - 需求: 2.4
  | 'API_NOT_SUPPORTED'   // API 端点不支持 Files API - 需求: 5.1
  | 'FILE_EXPIRED'        // 文件引用已过期（48小时后）- 需求: 5.3
  | 'NETWORK_ERROR'       // 网络错误 - 需求: 5.2
  | 'INVALID_RESPONSE'    // 无效的响应
  | 'UPLOAD_CANCELLED';   // 上传已取消

// ============ 错误类 ============

/**
 * Files API 错误类
 * 继承自 Error，添加错误代码和 HTTP 状态码
 */
export class FilesApiError extends Error {
  /** 错误名称 */
  public readonly name = 'FilesApiError';
  
  constructor(
    message: string,
    /** 错误代码 */
    public readonly code: FilesApiErrorCode,
    /** HTTP 状态码（如果适用） */
    public readonly statusCode?: number
  ) {
    super(message);
    // 确保原型链正确（TypeScript 编译目标为 ES5 时需要）
    Object.setPrototypeOf(this, FilesApiError.prototype);
  }

  /**
   * 检查是否为可重试的错误
   * 需求: 5.2 - 允许用户重试上传
   */
  isRetryable(): boolean {
    return this.code === 'NETWORK_ERROR' || 
           this.code === 'UPLOAD_FAILED' ||
           this.code === 'UPLOAD_CANCELLED';
  }

  /**
   * 检查是否为文件相关的错误（需要用户选择其他文件）
   */
  isFileError(): boolean {
    return this.code === 'FILE_TOO_LARGE' || 
           this.code === 'UNSUPPORTED_TYPE';
  }

  /**
   * 检查是否为 API 配置相关的错误
   */
  isApiError(): boolean {
    return this.code === 'API_NOT_SUPPORTED' || 
           this.code === 'INVALID_RESPONSE';
  }

  /**
   * 检查是否为文件过期错误
   * 需求: 5.3 - 文件引用过期通知
   */
  isExpiredError(): boolean {
    return this.code === 'FILE_EXPIRED';
  }
}

// ============ 错误消息映射 ============

/**
 * 错误代码到用户友好消息的映射
 * 提供中文错误提示，便于用户理解
 */
export const ERROR_MESSAGES: Record<FilesApiErrorCode, string> = {
  FILE_TOO_LARGE: '文件大小超过限制。Files API 最大支持 2GB 的文件。',
  UNSUPPORTED_TYPE: '不支持的文件格式。请选择支持的音频、视频、图片或文档文件。',
  UPLOAD_FAILED: '文件上传失败，请稍后重试。',
  API_NOT_SUPPORTED: '当前 API 端点不支持 Files API。请检查 API 配置或关闭 Files API 模式。',
  FILE_EXPIRED: '文件引用已过期（超过 48 小时）。请重新上传文件。',
  NETWORK_ERROR: '网络连接失败，请检查网络后重试。',
  INVALID_RESPONSE: 'API 响应格式无效，请稍后重试。',
  UPLOAD_CANCELLED: '上传已取消。',
};

/**
 * 错误代码到详细说明的映射
 * 提供更详细的错误说明和解决建议
 */
export const ERROR_DETAILS: Record<FilesApiErrorCode, string> = {
  FILE_TOO_LARGE: '请选择小于 2GB 的文件，或将大文件分割后上传。',
  UNSUPPORTED_TYPE: '支持的格式：音频（MP3、WAV、AAC、OGG、FLAC）、视频（MP4、MOV、AVI、WEBM）、图片（PNG、JPEG、WEBP）、文档（PDF、TXT、代码文件）。',
  UPLOAD_FAILED: '可能是服务器暂时不可用，请稍后重试。如果问题持续，请检查 API 密钥是否有效。',
  API_NOT_SUPPORTED: '某些第三方 API 代理可能不支持 Files API。您可以关闭 Files API 模式，使用传统的内联上传方式。',
  FILE_EXPIRED: 'Files API 上传的文件会在 48 小时后自动过期。请重新上传需要使用的文件。',
  NETWORK_ERROR: '请检查您的网络连接是否正常，然后点击重试按钮。',
  INVALID_RESPONSE: '服务器返回了意外的响应格式。这可能是临时问题，请稍后重试。',
  UPLOAD_CANCELLED: '您已取消上传。如需继续，请重新选择文件。',
};

// ============ 辅助函数 ============

/**
 * 获取用户友好的错误消息
 * @param error 错误对象
 * @returns 用户友好的错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof FilesApiError) {
    return ERROR_MESSAGES[error.code] || error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return '发生未知错误，请稍后重试。';
}

/**
 * 获取错误的详细说明
 * @param error 错误对象
 * @returns 错误的详细说明
 */
export function getErrorDetails(error: unknown): string | undefined {
  if (error instanceof FilesApiError) {
    return ERROR_DETAILS[error.code];
  }
  return undefined;
}

/**
 * 检查错误是否可重试
 * @param error 错误对象
 * @returns 是否可重试
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof FilesApiError) {
    return error.isRetryable();
  }
  // 对于未知错误，默认允许重试
  return true;
}

/**
 * 检查是否为 Files API 错误
 * @param error 错误对象
 * @returns 是否为 FilesApiError
 */
export function isFilesApiError(error: unknown): error is FilesApiError {
  return error instanceof FilesApiError;
}

/**
 * 创建 FilesApiError 实例
 * 便于从其他模块创建错误
 * @param code 错误代码
 * @param customMessage 自定义消息（可选）
 * @param statusCode HTTP 状态码（可选）
 */
export function createFilesApiError(
  code: FilesApiErrorCode,
  customMessage?: string,
  statusCode?: number
): FilesApiError {
  const message = customMessage || ERROR_MESSAGES[code];
  return new FilesApiError(message, code, statusCode);
}

/**
 * 从 HTTP 响应创建错误
 * @param response HTTP 响应
 * @param defaultCode 默认错误代码
 */
export async function createErrorFromResponse(
  response: Response,
  defaultCode: FilesApiErrorCode = 'UPLOAD_FAILED'
): Promise<FilesApiError> {
  let errorMessage = `请求失败: ${response.status}`;
  let errorCode = defaultCode;

  try {
    const errorResponse = await response.json();
    if (errorResponse.error?.message) {
      errorMessage = errorResponse.error.message;
    }
  } catch {
    // 使用默认错误消息
  }

  // 根据状态码判断错误类型
  if (response.status === 404) {
    errorCode = 'FILE_EXPIRED';
    errorMessage = ERROR_MESSAGES.FILE_EXPIRED;
  } else if (response.status === 401 || response.status === 403) {
    errorCode = 'API_NOT_SUPPORTED';
  }

  return new FilesApiError(errorMessage, errorCode, response.status);
}
