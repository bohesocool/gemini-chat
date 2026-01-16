/**
 * Live API 服务层导出入口
 * Requirements: 2.1, 2.2
 * 
 * 导出所有 Live API 相关的服务类和类型
 */

// 服务类导出
export { LiveApiService } from './LiveApiService';
export { AudioCaptureService } from './AudioCaptureService';
export { AudioPlayerService } from './AudioPlayerService';
export { VoicePlayerService, PlaybackError } from './VoicePlayerService';
export type { VoicePlayerCallbacks } from './VoicePlayerService';

// 历史记录存储服务导出
export {
  AudioBlobStorage,
  audioBlobStorage,
  StorageError,
  QuotaExceededError,
  AudioNotFoundError,
} from './AudioBlobStorage';
export type { AudioBlobRecord } from './AudioBlobStorage';

export { LiveSessionStorage, liveSessionStorage } from './LiveSessionStorage';

// 错误类导出
export {
  LiveApiError,
  ConnectionError,
  AudioDeviceError,
  SessionTimeoutError,
  ERROR_MESSAGES,
  getFriendlyErrorMessage,
} from './errors';

// 从类型文件重新导出常用类型
export type {
  // 服务配置类型
  LiveApiServiceConfig,
  LiveApiCallbacks,
  AudioCaptureCallbacks,
  AudioPlayerCallbacks,
  AudioCaptureState,
  
  // 会话配置类型
  LiveSessionConfig,
  VadConfig,
  VadSensitivity,
  ResponseModality,
  
  // 连接状态类型
  ConnectionStatus,
  Speaker,
  
  // 转录消息类型
  TranscriptMessage,
  TranscriptRole,
  
  // WebSocket 消息类型 - 客户端
  BidiGenerateContentSetup,
  BidiGenerateContentRealtimeInput,
  BidiGenerateContentClientContent,
  ClientMessage,
  
  // WebSocket 消息类型 - 服务端
  BidiGenerateContentServerContent,
  ServerMessage,
  SetupCompleteMessage,
  UsageMetadataMessage,
  
  // 模型和语音类型
  LiveApiModel,
  AvailableVoice,
  
  // 历史记录类型
  // Requirements: 2.1
  LiveSessionRecord,
  LiveSessionSummary,
  LiveMessageRecord,
  LiveVoiceMessage,
} from '../../types/liveApi';

// 从常量文件重新导出
export {
  AVAILABLE_VOICES,
  LIVE_API_MODELS,
  DEFAULT_LIVE_CONFIG,
  AUDIO_CONFIG,
  SESSION_LIMITS,
  VAD_DEFAULTS,
} from '../../constants/liveApi';

export type { VoiceId, LiveModelId } from '../../constants/liveApi';
