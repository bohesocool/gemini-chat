/**
 * Live API 相关类型定义
 * 需求: 2.6, 7.1-7.7
 * 
 * Live API 是 Google Gemini 提供的实时双向流式通信接口，
 * 支持音频、视频、文本等多模态输入输出。
 */

// ============ 会话配置类型 ============

/**
 * VAD（语音活动检测）灵敏度级别
 * 注意：API 只支持 low 和 high，不支持 medium
 */
export type VadSensitivity = 'low' | 'high';

/**
 * VAD 配置
 * 需求: 5.1-5.5
 */
export interface VadConfig {
  /** 是否启用自动语音活动检测 */
  enabled: boolean;
  /** 开始说话灵敏度 */
  startSensitivity: VadSensitivity;
  /** 结束说话灵敏度 */
  endSensitivity: VadSensitivity;
  /** 静音持续时间（毫秒） */
  silenceDurationMs: number;
}

/**
 * 响应模态类型
 * 需求: 7.1
 */
export type ResponseModality = 'AUDIO' | 'TEXT';

/**
 * Live API 会话配置
 * 需求: 7.1-7.7
 */
export interface LiveSessionConfig {
  /** 使用的模型 ID */
  model: string;
  /** 响应模态（音频/文本） */
  responseModality: ResponseModality;
  /** 语音名称 */
  voiceName: string;
  /** 系统指令 */
  systemInstruction: string;
  /** 思考预算（仅原生音频模型支持） */
  thinkingBudget: number;
  /** 是否启用情感对话 */
  enableAffectiveDialog: boolean;
  /** 是否启用主动音频 */
  enableProactiveAudio: boolean;
  /** 是否启用输入转录 */
  enableInputTranscription: boolean;
  /** 是否启用输出转录 */
  enableOutputTranscription: boolean;
  /** VAD 配置 */
  vadConfig: VadConfig;
}

// ============ 转录消息类型 ============

/**
 * 转录消息角色
 */
export type TranscriptRole = 'user' | 'model';

/**
 * 转录消息
 * 需求: 6.1-6.4
 */
export interface TranscriptMessage {
  /** 消息唯一标识 */
  id: string;
  /** 消息角色（用户/模型） */
  role: TranscriptRole;
  /** 转录文本内容 */
  text: string;
  /** 时间戳 */
  timestamp: number;
  /** 是否为最终转录（非实时） */
  isFinal: boolean;
}

// ============ 连接状态类型 ============

/**
 * 连接状态
 * 需求: 2.3, 9.1
 */
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * 当前说话方
 * 需求: 9.2
 */
export type Speaker = 'none' | 'user' | 'model';

// ============ WebSocket 消息类型 - 客户端发送 ============

/**
 * VAD 灵敏度映射到 API 格式
 * 注意：API 只支持 LOW 和 HIGH，不支持 MEDIUM
 */
export type ApiStartSensitivity = 
  | 'START_SENSITIVITY_LOW' 
  | 'START_SENSITIVITY_HIGH';

export type ApiEndSensitivity = 
  | 'END_SENSITIVITY_LOW' 
  | 'END_SENSITIVITY_HIGH';

/**
 * 语音配置
 * 注意：API 使用 snake_case 格式
 */
export interface VoiceConfig {
  prebuilt_voice_config?: {
    voice_name: string;
  };
}

/**
 * 语音配置包装
 * 注意：API 使用 snake_case 格式
 */
export interface SpeechConfig {
  voice_config?: VoiceConfig;
}

/**
 * 思考配置
 * 注意：API 使用 snake_case 格式
 */
export interface LiveThinkingConfig {
  thinking_budget?: number;
  include_thoughts?: boolean;
}

/**
 * 生成配置
 * 注意：API 使用 snake_case 格式
 * enable_affective_dialog 需要 v1alpha API 版本
 */
export interface LiveGenerationConfig {
  response_modalities: ResponseModality[];
  speech_config?: SpeechConfig;
  thinking_config?: LiveThinkingConfig;
  /** 情感对话 - 需要 v1alpha API 版本 */
  enable_affective_dialog?: boolean;
}

/**
 * 自动活动检测配置
 * 注意：API 使用 snake_case 格式
 */
export interface AutomaticActivityDetection {
  disabled?: boolean;
  start_of_speech_sensitivity?: ApiStartSensitivity;
  end_of_speech_sensitivity?: ApiEndSensitivity;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
}

/**
 * 实时输入配置
 * 注意：API 使用 snake_case 格式
 */
export interface RealtimeInputConfig {
  automatic_activity_detection?: AutomaticActivityDetection;
}

/**
 * 主动性配置
 * 注意：API 使用 snake_case 格式
 */
export interface ProactivityConfig {
  proactive_audio?: boolean;
}

/**
 * Setup 消息的 setup 字段
 * 注意：字段名使用 snake_case 格式，因为直接发送到 WebSocket API
 * 注意：enable_affective_dialog 在 generation_config 内部
 * 注意：proactivity 在 setup 顶层
 */
export interface SetupConfig {
  model: string;
  generation_config?: LiveGenerationConfig;
  system_instruction?: {
    parts: { text: string }[];
  };
  realtime_input_config?: RealtimeInputConfig;
  input_audio_transcription?: Record<string, never>;
  output_audio_transcription?: Record<string, never>;
  /** 主动性配置 - 需要 v1alpha API 版本，在 setup 顶层 */
  proactivity?: ProactivityConfig;
}

/**
 * Setup 消息 - 建立连接时发送的配置消息
 * 需求: 2.2, 7.1-7.7
 */
export interface BidiGenerateContentSetup {
  setup: SetupConfig;
}

/**
 * 音频数据
 */
export interface AudioData {
  /** Base64 编码的音频数据 */
  data: string;
  /** MIME 类型 */
  mimeType: string;
}

/**
 * 实时输入内容
 */
export interface RealtimeInputContent {
  /** 音频数据 */
  audio?: AudioData;
  /** 视频/图片数据（屏幕帧） */
  video?: {
    data: string;
    mimeType: string;
  };
  /** 活动开始信号（手动 VAD 模式） */
  activityStart?: Record<string, never>;
  /** 活动结束信号（手动 VAD 模式） */
  activityEnd?: Record<string, never>;
  /** 音频流结束信号 */
  audioStreamEnd?: boolean;
}

/**
 * 实时输入消息 - 发送音频数据
 * 需求: 3.4
 */
export interface BidiGenerateContentRealtimeInput {
  realtimeInput: RealtimeInputContent;
}

/**
 * 对话轮次
 */
export interface ContentTurn {
  role: 'user' | 'model';
  parts: { text: string }[];
}

/**
 * 客户端内容
 */
export interface ClientContentData {
  turns: ContentTurn[];
  turnComplete: boolean;
}

/**
 * 客户端内容消息 - 发送文本消息
 */
export interface BidiGenerateContentClientContent {
  clientContent: ClientContentData;
}

/**
 * 客户端发送的消息联合类型
 */
export type ClientMessage = 
  | BidiGenerateContentSetup 
  | BidiGenerateContentRealtimeInput 
  | BidiGenerateContentClientContent;

// ============ WebSocket 消息类型 - 服务端返回 ============

/**
 * 内联数据（音频/图片）
 */
export interface InlineData {
  mimeType: string;
  /** Base64 编码的数据 */
  data: string;
}

/**
 * 模型响应部分
 */
export interface ModelTurnPart {
  /** 文本内容 */
  text?: string;
  /** 内联数据（音频等） */
  inlineData?: InlineData;
}

/**
 * 模型轮次
 */
export interface ModelTurn {
  parts: ModelTurnPart[];
}

/**
 * 输入转录
 */
export interface InputTranscription {
  text: string;
}

/**
 * 输出转录
 */
export interface OutputTranscription {
  text: string;
}

/**
 * 服务端内容数据
 */
export interface ServerContentData {
  /** 模型响应轮次 */
  modelTurn?: ModelTurn;
  /** 轮次是否完成 */
  turnComplete?: boolean;
  /** 是否被中断 */
  interrupted?: boolean;
  /** 输入转录 */
  inputTranscription?: InputTranscription;
  /** 输出转录 */
  outputTranscription?: OutputTranscription;
}

/**
 * 服务端内容消息
 * 需求: 4.1, 6.1, 6.2
 */
export interface BidiGenerateContentServerContent {
  serverContent: ServerContentData;
}

/**
 * 响应 Token 详情
 */
export interface ResponseTokensDetail {
  modality: string;
  tokenCount: number;
}

/**
 * 使用量元数据
 */
export interface LiveUsageMetadata {
  totalTokenCount: number;
  responseTokensDetails?: ResponseTokensDetail[];
}

/**
 * 使用量元数据消息
 */
export interface UsageMetadataMessage {
  usageMetadata: LiveUsageMetadata;
}

/**
 * 设置完成消息
 */
export interface SetupCompleteMessage {
  setupComplete: Record<string, never>;
}

/**
 * 服务端返回的消息联合类型
 */
export type ServerMessage = 
  | BidiGenerateContentServerContent 
  | UsageMetadataMessage
  | SetupCompleteMessage;

// ============ 服务层类型 ============

/**
 * Live API 服务配置
 */
export interface LiveApiServiceConfig {
  /** API 密钥 */
  apiKey: string;
  /** API 端点 */
  apiEndpoint: string;
  /** 模型 ID */
  model: string;
  /** 响应模态 */
  responseModality: ResponseModality;
  /** 语音名称 */
  voiceName?: string;
  /** 系统指令 */
  systemInstruction?: string;
  /** 思考预算 */
  thinkingBudget?: number;
  /** 是否启用情感对话 */
  enableAffectiveDialog?: boolean;
  /** 是否启用主动音频 */
  enableProactiveAudio?: boolean;
  /** 是否启用输入转录 */
  enableInputTranscription?: boolean;
  /** 是否启用输出转录 */
  enableOutputTranscription?: boolean;
  /** VAD 配置 */
  vadConfig?: VadConfig;
}

/**
 * Live API 服务回调
 */
export interface LiveApiCallbacks {
  /** 连接打开 */
  onOpen: () => void;
  /** 连接关闭 */
  onClose: (reason: string) => void;
  /** 发生错误 */
  onError: (error: Error) => void;
  /** 收到音频数据 */
  onAudioData: (data: ArrayBuffer) => void;
  /** 收到文本数据 */
  onTextData: (text: string) => void;
  /** 收到输入转录 */
  onInputTranscription: (text: string) => void;
  /** 收到输出转录 */
  onOutputTranscription: (text: string) => void;
  /** 被中断 */
  onInterrupted: () => void;
  /** 轮次完成 */
  onTurnComplete: () => void;
  /** 设置完成 */
  onSetupComplete?: () => void;
}

/**
 * 音频捕获服务回调
 */
export interface AudioCaptureCallbacks {
  /** 收到音频数据 */
  onAudioData: (pcmData: ArrayBuffer) => void;
  /** 音频电平变化 */
  onLevelChange: (level: number) => void;
  /** 发生错误 */
  onError: (error: Error) => void;
}

/**
 * 音频捕获状态
 */
export type AudioCaptureState = 'inactive' | 'capturing' | 'paused';

/**
 * 音频播放服务回调
 */
export interface AudioPlayerCallbacks {
  /** 开始播放 */
  onPlaybackStart: () => void;
  /** 播放结束 */
  onPlaybackEnd: () => void;
  /** 音频电平变化 */
  onLevelChange: (level: number) => void;
}

// ============ 模型信息类型 ============

/**
 * Live API 模型信息
 */
export interface LiveApiModel {
  /** 模型 ID */
  id: string;
  /** 模型显示名称 */
  name: string;
  /** 模型描述 */
  description: string;
  /** 是否支持思考能力 */
  supportsThinking: boolean;
}

/**
 * 可用语音信息
 */
export interface AvailableVoice {
  /** 语音 ID */
  id: string;
  /** 语音名称 */
  name: string;
  /** 语音描述 */
  description: string;
}


// ============ 会话历史记录类型 ============
// 需求: 1.3, 2.4, 3.2

/**
 * Live API 消息记录
 * 存储在 IndexedDB 中的消息数据结构
 * 需求: 2.4, 3.2
 */
export interface LiveMessageRecord {
  /** 消息唯一标识 */
  id: string;
  /** 消息角色（用户/模型） */
  role: 'user' | 'model';
  /** 关联的音频 Blob ID，用于从 AudioBlobStorage 获取音频数据 */
  audioId: string | null;
  /** 语音时长（毫秒） */
  durationMs: number;
  /** 转录文字内容 */
  transcript: string;
  /** 消息时间戳 */
  timestamp: number;
}

/**
 * Live API 会话记录
 * 存储在 IndexedDB 中的完整会话数据结构
 * 需求: 1.3
 */
export interface LiveSessionRecord {
  /** 会话唯一标识 */
  id: string;
  /** 会话创建时间戳 */
  createdAt: number;
  /** 会话最后更新时间戳 */
  updatedAt: number;
  /** 会话中的所有消息 */
  messages: LiveMessageRecord[];
  /** 会话配置 */
  config: LiveSessionConfig;
}

/**
 * Live API 会话摘要
 * 用于在侧边栏列表中显示的简要信息
 * 需求: 1.3
 */
export interface LiveSessionSummary {
  /** 会话唯一标识 */
  id: string;
  /** 会话创建时间戳 */
  createdAt: number;
  /** 会话摘要（首条消息的转录文字） */
  summary: string;
  /** 会话中的消息数量 */
  messageCount: number;
}

/**
 * Live API 语音消息
 * 用于 UI 组件显示的语音消息数据结构，包含实际的音频 Blob
 * 需求: 2.4, 3.2
 */
export interface LiveVoiceMessage {
  /** 消息唯一标识 */
  id: string;
  /** 消息角色（用户/模型） */
  role: 'user' | 'model';
  /** 音频 Blob 数据，可能为 null（如果音频加载失败或不存在） */
  audioBlob: Blob | null;
  /** 语音时长（毫秒） */
  durationMs: number;
  /** 转录文字内容 */
  transcript: string;
  /** 消息时间戳 */
  timestamp: number;
}

/**
 * 屏幕共享状态
 * 需求: 4.1
 */
export type ScreenShareStatus = 'inactive' | 'requesting' | 'sharing' | 'error';

/**
 * 屏幕共享配置
 * 需求: 3.1
 */
export interface ScreenShareConfig {
  /** 帧率（每秒帧数） */
  fps: number;
  /** 最大宽度（像素） */
  maxWidth: number;
  /** 最大高度（像素） */
  maxHeight: number;
  /** JPEG 图片质量 (0-1) */
  quality: number;
}

/**
 * 屏幕捕获回调
 * 需求: 1.2, 1.4, 1.5, 7.3
 */
export interface ScreenCaptureCallbacks {
  /** 截取到一帧屏幕 */
  onFrame: (base64Data: string) => void;
  /** 屏幕共享开始 */
  onStart: () => void;
  /** 屏幕共享停止 */
  onStop: () => void;
  /** 发生错误 */
  onError: (error: Error) => void;
}

/**
 * 屏幕捕获状态
 * 需求: 4.1
 */
export type ScreenCaptureState = 'inactive' | 'capturing';

