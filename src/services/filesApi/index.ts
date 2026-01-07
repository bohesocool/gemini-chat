/**
 * Files API 模块入口
 * 导出所有 Files API 相关的服务和类型
 */

// 导出错误处理相关
export {
  FilesApiError,
  ERROR_MESSAGES,
  ERROR_DETAILS,
  getErrorMessage,
  getErrorDetails,
  isRetryableError,
  isFilesApiError,
  createFilesApiError,
  createErrorFromResponse,
} from './errors';

// 导出类型
export type { FilesApiErrorCode } from './errors';
