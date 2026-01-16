/**
 * Live API 常量定义
 * 需求: 7.2
 * 
 * 定义 Live API 相关的常量，包括可用语音、模型列表和默认配置。
 */

import type { LiveSessionConfig, LiveApiModel, AvailableVoice } from '../types/liveApi';

// ============ 可用语音列表 ============

/**
 * Live API 可用语音列表
 * 需求: 7.2
 */
export const AVAILABLE_VOICES: readonly AvailableVoice[] = [
  { id: 'Puck', name: 'Puck', description: '活泼友好' },
  { id: 'Charon', name: 'Charon', description: '沉稳专业' },
  { id: 'Kore', name: 'Kore', description: '温暖亲切' },
  { id: 'Fenrir', name: 'Fenrir', description: '深沉有力' },
  { id: 'Aoede', name: 'Aoede', description: '清晰明亮' },
] as const;

// ============ Live API 模型列表 ============

/**
 * Live API 支持的模型列表
 * 需求: 7.1
 * 
 * 目前只支持原生音频模型
 */
export const LIVE_API_MODELS: readonly LiveApiModel[] = [
  { 
    id: 'gemini-2.5-flash-native-audio-preview-12-2025', 
    name: 'Gemini 2.5 Flash Native Audio',
    description: '原生音频输出，支持思考能力、情感对话、主动音频',
    supportsThinking: true,
  },
] as const;

// ============ 默认配置 ============

/**
 * Live API 默认会话配置
 * 需求: 7.1-7.7
 */
export const DEFAULT_LIVE_CONFIG: LiveSessionConfig = {
  model: 'gemini-2.5-flash-native-audio-preview-12-2025',
  responseModality: 'AUDIO',
  voiceName: 'Kore',
  systemInstruction: '',
  thinkingBudget: 0,
  enableAffectiveDialog: false,
  enableProactiveAudio: false,
  enableInputTranscription: true,
  enableOutputTranscription: true,
  vadConfig: {
    enabled: true,
    startSensitivity: 'low',
    endSensitivity: 'low',
    silenceDurationMs: 500,
  },
};

// ============ 音频配置常量 ============

/**
 * 音频采样率配置
 */
export const AUDIO_CONFIG = {
  /** 输入音频采样率（Hz） */
  INPUT_SAMPLE_RATE: 16000,
  /** 输出音频采样率（Hz） */
  OUTPUT_SAMPLE_RATE: 24000,
  /** 音频位深度 */
  BIT_DEPTH: 16,
  /** 音频通道数 */
  CHANNELS: 1,
  /** 输入音频 MIME 类型 */
  INPUT_MIME_TYPE: 'audio/pcm;rate=16000',
  /** 输出音频 MIME 类型 */
  OUTPUT_MIME_TYPE: 'audio/pcm;rate=24000',
} as const;

// ============ 会话限制常量 ============

/**
 * 会话时间限制
 */
export const SESSION_LIMITS = {
  /** 纯音频会话最大时长（毫秒）- 15分钟 */
  AUDIO_SESSION_MAX_DURATION: 15 * 60 * 1000,
  /** 音视频会话最大时长（毫秒）- 2分钟 */
  VIDEO_SESSION_MAX_DURATION: 2 * 60 * 1000,
} as const;

// ============ VAD 配置常量 ============

/**
 * VAD 默认配置值
 */
export const VAD_DEFAULTS = {
  /** 默认静音持续时间（毫秒） */
  SILENCE_DURATION_MS: 500,
  /** 前缀填充时间（毫秒） */
  PREFIX_PADDING_MS: 300,
} as const;

// ============ 类型导出 ============

/** 语音 ID 类型 */
export type VoiceId = typeof AVAILABLE_VOICES[number]['id'];

/** 模型 ID 类型 */
export type LiveModelId = typeof LIVE_API_MODELS[number]['id'];
