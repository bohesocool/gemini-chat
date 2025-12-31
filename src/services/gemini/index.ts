/**
 * Gemini 服务模块统一导出
 * 需求: 1.2 - 提供统一的导出入口，确保向后兼容
 */

// 导出类型
export type {
  ImageExtractionResult,
  ThoughtExtractionResult,
  NonStreamingResult,
  SendMessageResult,
  DebugInfo,
} from './types';

// 导出错误类型
export {
  GeminiApiError,
  GeminiRequestCancelledError,
  GeminiRequestCancelledWithThoughtsError,
} from './errors';

// 导出调试记录函数
export {
  startDebugRecord,
  completeDebugRecord,
  failDebugRecord,
} from './debug';

// 导出请求构建函数
export {
  normalizeApiEndpoint,
  validateApiEndpoint,
  buildRequestUrl,
  buildRequestBody,
  buildThinkingConfigForModel,
  buildThinkingConfig,
  buildImageConfig,
  applyMediaResolution,
} from './builders';

// 导出响应解析函数
export {
  extractThoughtSummary,
  extractImagesFromChunk,
  extractTokenUsage,
  parseSSELine,
  extractTextFromChunk,
  unwrapResponseData,
} from './parsers';

// 导出 API 调用函数
export {
  sendMessage,
  sendMessageWithThoughts,
  sendMessageNonStreaming,
  sendMessageNonStreamingWithThoughts,
  testConnection,
} from './api';
