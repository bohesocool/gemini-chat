/**
 * Files API 服务
 * 负责与 Gemini Files API 交互，支持大文件上传（最大 2GB）
 * 需求: 2.1, 2.2, 2.3, 2.4, 2.6
 */

import {
  type FileUploadResult,
  FILES_API_SIZE_LIMIT,
  isSupportedMimeType,
  ALL_SUPPORTED_MIME_TYPES,
} from '../types/filesApi';
import { apiLogger } from './logger';

// 从错误模块导入错误类型
import {
  FilesApiError,
  type FilesApiErrorCode,
} from './filesApi/errors';

// 重新导出错误类型，保持向后兼容
export { FilesApiError, type FilesApiErrorCode } from './filesApi/errors';
export {
  ERROR_MESSAGES,
  ERROR_DETAILS,
  getErrorMessage,
  getErrorDetails,
  isRetryableError,
  isFilesApiError,
  createFilesApiError,
} from './filesApi/errors';

// ============ 类型定义 ============

/**
 * 上传进度回调
 */
export type UploadProgressCallback = (progress: number) => void;

/**
 * 文件验证结果
 */
export interface FileValidationResult {
  /** 是否有效 */
  valid: boolean;
  /** 错误信息（如果无效） */
  error?: string;
}

// ============ 常量 ============

/** 默认 Files API 端点 */
const DEFAULT_FILES_API_ENDPOINT = 'https://generativelanguage.googleapis.com';

/** 上传 API 路径 */
const UPLOAD_PATH = '/upload/v1beta/files';

/** 文件管理 API 路径 */
const FILES_PATH = '/v1beta/files';

// ============ 辅助函数 ============

/**
 * 格式化文件大小为可读字符串
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

/**
 * 获取支持的文件格式列表（用于错误提示）
 */
function getSupportedFormatsText(): string {
  return '音频（MP3、WAV、AAC、OGG、FLAC）、视频（MP4、MOV、AVI、WEBM）、图片（PNG、JPEG、WEBP）、文档（PDF、TXT、代码文件）';
}

/**
 * 构建 Files API 端点 URL
 * API Key 通过 x-goog-api-key Header 传递，不再附加到 URL 中
 * @param baseEndpoint 基础端点
 * @param path API 路径
 */
function buildFilesApiUrl(baseEndpoint: string, path: string): string {
  // 移除末尾斜杠
  const endpoint = baseEndpoint.replace(/\/+$/, '');
  return `${endpoint}${path}`;
}

// ============ 核心功能 ============

/**
 * 验证文件是否可以通过 Files API 上传
 * 需求: 2.5, 2.6, 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * @param file 要验证的文件
 * @returns 验证结果
 */
export function validateFilesApiFile(file: File): FileValidationResult {
  // 检查文件大小（最大 2GB）
  if (file.size > FILES_API_SIZE_LIMIT) {
    return {
      valid: false,
      error: `文件大小超过限制。Files API 最大支持 2GB，当前文件大小 ${formatFileSize(file.size)}`,
    };
  }

  // 检查文件类型
  const mimeType = file.type || 'application/octet-stream';
  if (!isSupportedMimeType(mimeType)) {
    return {
      valid: false,
      error: `不支持的文件格式: ${mimeType}。支持的格式：${getSupportedFormatsText()}`,
    };
  }

  return { valid: true };
}

/**
 * 上传文件到 Gemini Files API
 * 需求: 2.1, 2.2, 2.3, 2.4
 * 
 * @param file 要上传的文件
 * @param apiKey API 密钥
 * @param endpoint API 端点（可选，默认使用官方端点）
 * @param onProgress 进度回调
 * @returns 上传结果
 */
export async function uploadFileToFilesApi(
  file: File,
  apiKey: string,
  endpoint?: string,
  onProgress?: UploadProgressCallback
): Promise<FileUploadResult> {
  apiLogger.info('开始上传文件到 Files API', { 
    fileName: file.name, 
    fileSize: file.size,
    mimeType: file.type,
  });

  // 验证文件
  const validation = validateFilesApiFile(file);
  if (!validation.valid) {
    apiLogger.error('文件验证失败', { error: validation.error });
    throw new FilesApiError(
      validation.error || '文件验证失败',
      validation.error?.includes('大小') ? 'FILE_TOO_LARGE' : 'UNSUPPORTED_TYPE'
    );
  }

  const baseEndpoint = endpoint || DEFAULT_FILES_API_ENDPOINT;
  const uploadUrl = buildFilesApiUrl(baseEndpoint, UPLOAD_PATH);

  try {
    // 使用 XMLHttpRequest 以支持上传进度
    const result = await new Promise<FileUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // 监听上传进度
      if (onProgress) {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            onProgress(progress);
          }
        });
      }

      // 监听完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const fileData = response.file;
            
            if (!fileData || !fileData.uri) {
              reject(new FilesApiError(
                '上传响应格式无效：缺少文件 URI',
                'INVALID_RESPONSE',
                xhr.status
              ));
              return;
            }

            const uploadResult: FileUploadResult = {
              uri: fileData.uri,
              mimeType: fileData.mimeType || file.type,
              name: fileData.name,
              sizeBytes: fileData.sizeBytes || file.size,
              state: fileData.state || 'ACTIVE',
              expirationTime: fileData.expirationTime,
            };

            apiLogger.info('文件上传成功', { 
              uri: uploadResult.uri,
              state: uploadResult.state,
            });

            resolve(uploadResult);
          } catch (parseError) {
            reject(new FilesApiError(
              '解析上传响应失败',
              'INVALID_RESPONSE',
              xhr.status
            ));
          }
        } else {
          // 解析错误响应
          let errorMessage = `上传失败: ${xhr.status}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            if (errorResponse.error?.message) {
              errorMessage = errorResponse.error.message;
            }
          } catch {
            // 使用默认错误消息
          }

          // 判断错误类型
          let errorCode: FilesApiErrorCode = 'UPLOAD_FAILED';
          if (xhr.status === 404 || errorMessage.includes('not found')) {
            errorCode = 'API_NOT_SUPPORTED';
          }

          reject(new FilesApiError(errorMessage, errorCode, xhr.status));
        }
      });

      // 监听错误
      xhr.addEventListener('error', () => {
        apiLogger.error('网络错误', { fileName: file.name });
        reject(new FilesApiError('网络连接失败', 'NETWORK_ERROR'));
      });

      // 监听中止
      xhr.addEventListener('abort', () => {
        apiLogger.info('上传已取消', { fileName: file.name });
        reject(new FilesApiError('上传已取消', 'UPLOAD_FAILED'));
      });

      // 发送请求
      xhr.open('POST', uploadUrl);
      xhr.setRequestHeader('x-goog-api-key', apiKey);
      xhr.setRequestHeader('X-Goog-Upload-Protocol', 'multipart');
      
      // 构建 multipart 请求体
      const metadata = JSON.stringify({
        file: {
          displayName: file.name,
        },
      });

      const formData = new FormData();
      // 添加元数据部分
      formData.append('metadata', new Blob([metadata], { type: 'application/json' }));
      // 添加文件部分
      formData.append('file', file);

      xhr.send(formData);
    });

    return result;
  } catch (error) {
    if (error instanceof FilesApiError) {
      throw error;
    }

    apiLogger.error('上传文件时发生未知错误', { 
      error: error instanceof Error ? error.message : '未知错误',
    });

    throw new FilesApiError(
      error instanceof Error ? error.message : '上传失败',
      'UPLOAD_FAILED'
    );
  }
}

/**
 * 获取已上传文件的元数据
 * 需求: 2.3
 * 
 * @param fileName 文件名（从上传结果获取，格式如 files/xxx）
 * @param apiKey API 密钥
 * @param endpoint API 端点
 * @returns 文件元数据
 */
export async function getFileMetadata(
  fileName: string,
  apiKey: string,
  endpoint?: string
): Promise<FileUploadResult> {
  apiLogger.info('获取文件元数据', { fileName });

  const baseEndpoint = endpoint || DEFAULT_FILES_API_ENDPOINT;
  const url = buildFilesApiUrl(baseEndpoint, `${FILES_PATH}/${fileName}`);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      let errorMessage = `获取文件元数据失败: ${response.status}`;
      let errorCode: FilesApiErrorCode = 'UPLOAD_FAILED';

      try {
        const errorResponse = await response.json();
        if (errorResponse.error?.message) {
          errorMessage = errorResponse.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      // 判断是否为文件过期
      if (response.status === 404) {
        errorCode = 'FILE_EXPIRED';
        errorMessage = '文件引用已过期或不存在';
      }

      throw new FilesApiError(errorMessage, errorCode, response.status);
    }

    const fileData = await response.json();

    if (!fileData.uri) {
      throw new FilesApiError('响应格式无效：缺少文件 URI', 'INVALID_RESPONSE');
    }

    return {
      uri: fileData.uri,
      mimeType: fileData.mimeType,
      name: fileData.name,
      sizeBytes: fileData.sizeBytes,
      state: fileData.state,
      expirationTime: fileData.expirationTime,
    };
  } catch (error) {
    if (error instanceof FilesApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FilesApiError('网络连接失败', 'NETWORK_ERROR');
    }

    throw new FilesApiError(
      error instanceof Error ? error.message : '获取文件元数据失败',
      'UPLOAD_FAILED'
    );
  }
}

/**
 * 删除已上传的文件
 * 需求: 2.3
 * 
 * @param fileName 文件名（从上传结果获取，格式如 files/xxx）
 * @param apiKey API 密钥
 * @param endpoint API 端点
 */
export async function deleteUploadedFile(
  fileName: string,
  apiKey: string,
  endpoint?: string
): Promise<void> {
  apiLogger.info('删除已上传文件', { fileName });

  const baseEndpoint = endpoint || DEFAULT_FILES_API_ENDPOINT;
  const url = buildFilesApiUrl(baseEndpoint, `${FILES_PATH}/${fileName}`);

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      let errorMessage = `删除文件失败: ${response.status}`;

      try {
        const errorResponse = await response.json();
        if (errorResponse.error?.message) {
          errorMessage = errorResponse.error.message;
        }
      } catch {
        // 使用默认错误消息
      }

      // 404 表示文件已不存在，可以视为删除成功
      if (response.status === 404) {
        apiLogger.info('文件已不存在，视为删除成功', { fileName });
        return;
      }

      throw new FilesApiError(errorMessage, 'UPLOAD_FAILED', response.status);
    }

    apiLogger.info('文件删除成功', { fileName });
  } catch (error) {
    if (error instanceof FilesApiError) {
      throw error;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new FilesApiError('网络连接失败', 'NETWORK_ERROR');
    }

    throw new FilesApiError(
      error instanceof Error ? error.message : '删除文件失败',
      'UPLOAD_FAILED'
    );
  }
}

// ============ 导出支持的类型列表（用于 UI 显示） ============

/**
 * 获取所有支持的 MIME 类型列表
 */
export function getAllSupportedMimeTypes(): readonly string[] {
  return ALL_SUPPORTED_MIME_TYPES;
}
