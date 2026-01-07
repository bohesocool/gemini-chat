/**
 * 类型定义统一导出
 */

// Gemini API 相关类型
export type {
  GeminiRequest,
  GeminiContent,
  GeminiPart,
  GeminiTextPart,
  GeminiInlineDataPart,
  GeminiFileDataPart,
  GenerationConfig,
  SafetySetting,
  HarmCategory,
  HarmBlockThreshold,
  GeminiResponse,
  GeminiCandidate,
  SafetyRating,
  UsageMetadata,
  StreamChunk,
  ThinkingConfig,
  ImageConfig,
} from './gemini';

export {
  HARM_CATEGORIES,
  HARM_BLOCK_THRESHOLDS,
  DEFAULT_GENERATION_CONFIG,
} from './gemini';

// 应用数据模型类型
export type {
  Conversation,
  Message,
  Attachment,
  AppSettings,
  ThemeMode,
  ApiConfig,
  ModelInfo,
  ExportData,
  ExportDataV2,
  ImportData,
  // 模型管理相关类型
  ApiProvider,
  ThinkingLevel,
  MediaResolution,
  ModelCapabilities,
  ModelAdvancedConfig,
  ModelConfig,
  ModelManagerState,
} from './models';

export {
  GEMINI_MODELS,
  DEFAULT_API_ENDPOINT,
  DEFAULT_MODEL,
  DEFAULT_APP_SETTINGS,
  IMAGE_SIZE_LIMIT,
  DOCUMENT_SIZE_LIMIT,
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_DOCUMENT_TYPES,
  CODE_FILE_EXTENSIONS,
  EXPORT_DATA_VERSION,
  EXPORT_DATA_VERSION_V2,
} from './models';

// 聊天窗口相关类型
export type {
  ChatWindowConfig,
  SubTopic,
  ChatWindow,
  LegacyConversation,
} from './chatWindow';

export {
  DEFAULT_CHAT_WINDOW_CONFIG,
  createDefaultSubTopic,
  createDefaultChatWindow,
} from './chatWindow';

// 鉴权相关类型
export type { AuthState, AuthConfig } from './auth';

export { FALLBACK_PASSWORD, AUTH_CONFIG_KEY, getDefaultPassword, isEnvPassword, getEnvPassword } from './auth';

// 图片历史记录相关类型
export type {
  GeneratedImage,
  ImageState,
  ImageActions,
} from './image';

export { generateImageId, createGeneratedImage } from './image';

// Files API 相关类型
export type {
  FileReference,
  FileUploadResult,
} from './filesApi';

export {
  FILES_API_SUPPORTED_TYPES,
  FILES_API_SIZE_LIMIT,
  ALL_SUPPORTED_MIME_TYPES,
  isSupportedMimeType,
  getFileCategory,
  generateFileReferenceId,
  createFileReference,
} from './filesApi';
