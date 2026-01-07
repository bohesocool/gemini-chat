/**
 * Files API 相关类型定义
 * 需求: 2.5, 6.1, 6.2, 6.3, 6.4
 */

// ============ 文件引用类型 ============

/**
 * 文件引用（用于消息附件）
 * 上传文件后返回的引用，用于在消息中引用已上传的文件
 */
export interface FileReference {
  /** 唯一标识 */
  id: string;
  /** 文件 URI，用于在请求中引用 */
  uri: string;
  /** MIME 类型 */
  mimeType: string;
  /** 显示名称 */
  displayName: string;
  /** 文件大小（字节） */
  sizeBytes: number;
  /** 上传状态 */
  status: 'uploading' | 'ready' | 'error';
  /** 上传进度 (0-100) */
  progress?: number;
  /** 错误信息 */
  error?: string;
  /** 错误代码 - 需求: 5.1, 5.2 */
  errorCode?: string;
  /** 原始文件对象（用于重试上传）- 需求: 5.2 */
  originalFile?: File;
}

/**
 * Files API 上传结果
 * 从 Gemini Files API 返回的文件元数据
 */
export interface FileUploadResult {
  /** 文件 URI，用于在请求中引用 */
  uri: string;
  /** 文件 MIME 类型 */
  mimeType: string;
  /** 文件名（API 返回的完整名称，如 files/xxx） */
  name: string;
  /** 文件大小（字节） */
  sizeBytes: number;
  /** 上传状态 */
  state: 'PROCESSING' | 'ACTIVE' | 'FAILED';
  /** 过期时间（48小时后） */
  expirationTime?: string;
}

// ============ 支持的文件类型 ============

/**
 * Files API 支持的 MIME 类型
 * 需求: 6.1, 6.2, 6.3, 6.4
 */
export const FILES_API_SUPPORTED_TYPES = {
  /** 音频文件类型 - 需求: 6.1 */
  audio: [
    'audio/mpeg',      // MP3
    'audio/wav',       // WAV
    'audio/aiff',      // AIFF
    'audio/aac',       // AAC
    'audio/ogg',       // OGG
    'audio/flac',      // FLAC
  ],
  /** 视频文件类型 - 需求: 6.2 */
  video: [
    'video/mp4',       // MP4
    'video/mpeg',      // MPEG
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'video/x-flv',     // FLV
    'video/webm',      // WEBM
    'video/x-ms-wmv',  // WMV
    'video/3gpp',      // 3GPP
  ],
  /** 图片文件类型 - 需求: 6.3 */
  image: [
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/heic',
    'image/heif',
  ],
  /** 文档文件类型 - 需求: 6.4 */
  document: [
    'application/pdf',
    'text/plain',
    'text/html',
    'text/css',
    'text/javascript',
    'application/javascript',
    'application/json',
    'text/x-python',
    'text/x-java',
    'text/x-typescript',
    'text/markdown',
    'text/csv',
    'text/xml',
    'application/xml',
  ],
} as const;

/**
 * 所有支持的 MIME 类型列表（扁平化）
 */
export const ALL_SUPPORTED_MIME_TYPES: readonly string[] = [
  ...FILES_API_SUPPORTED_TYPES.audio,
  ...FILES_API_SUPPORTED_TYPES.video,
  ...FILES_API_SUPPORTED_TYPES.image,
  ...FILES_API_SUPPORTED_TYPES.document,
];

// ============ 文件大小限制 ============

/**
 * Files API 文件大小限制 (2GB)
 * 需求: 2.5
 */
export const FILES_API_SIZE_LIMIT = 2 * 1024 * 1024 * 1024;

// ============ 辅助函数 ============

/**
 * 检查 MIME 类型是否被 Files API 支持
 * @param mimeType 要检查的 MIME 类型
 * @returns 是否支持
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return ALL_SUPPORTED_MIME_TYPES.includes(mimeType);
}

/**
 * 获取 MIME 类型所属的文件类别
 * @param mimeType MIME 类型
 * @returns 文件类别或 undefined
 */
export function getFileCategory(mimeType: string): 'audio' | 'video' | 'image' | 'document' | undefined {
  if (FILES_API_SUPPORTED_TYPES.audio.includes(mimeType as typeof FILES_API_SUPPORTED_TYPES.audio[number])) {
    return 'audio';
  }
  if (FILES_API_SUPPORTED_TYPES.video.includes(mimeType as typeof FILES_API_SUPPORTED_TYPES.video[number])) {
    return 'video';
  }
  if (FILES_API_SUPPORTED_TYPES.image.includes(mimeType as typeof FILES_API_SUPPORTED_TYPES.image[number])) {
    return 'image';
  }
  if (FILES_API_SUPPORTED_TYPES.document.includes(mimeType as typeof FILES_API_SUPPORTED_TYPES.document[number])) {
    return 'document';
  }
  return undefined;
}

/**
 * 生成唯一的文件引用 ID
 * @returns 唯一 ID
 */
export function generateFileReferenceId(): string {
  return `file-ref-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建文件引用对象
 * @param uploadResult 上传结果
 * @param displayName 显示名称
 * @returns 文件引用
 */
export function createFileReference(
  uploadResult: FileUploadResult,
  displayName: string
): FileReference {
  return {
    id: generateFileReferenceId(),
    uri: uploadResult.uri,
    mimeType: uploadResult.mimeType,
    displayName,
    sizeBytes: uploadResult.sizeBytes,
    status: uploadResult.state === 'ACTIVE' ? 'ready' : 
            uploadResult.state === 'PROCESSING' ? 'uploading' : 'error',
  };
}
