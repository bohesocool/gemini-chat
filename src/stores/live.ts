/**
 * Live API 状态管理
 * 需求: 2.1, 2.2, 2.2-2.6, 3.6, 4.2, 6.1-6.4, 9.1-9.4
 * 
 * 管理 Live API 实时对话功能的所有状态，包括连接状态、音频状态、
 * 说话状态、转录消息和会话配置。
 * 支持音频数据累积用于历史记录保存。
 */

import { create } from 'zustand';
import type {
  ConnectionStatus,
  Speaker,
  TranscriptMessage,
  LiveSessionConfig,
  LiveApiCallbacks,
} from '../types/liveApi';
import {
  LiveApiService,
  AudioCaptureService,
  AudioPlayerService,
  getFriendlyErrorMessage,
  DEFAULT_LIVE_CONFIG,
} from '../services/liveApi';
import { useSettingsStore } from './settings';
import { storeLogger } from '../services/logger';

// ============ Store 状态接口 ============

/**
 * 音频数据累积器
 * 用于收集一个轮次内的所有音频数据
 * 需求: 2.1, 2.2
 */
interface AudioAccumulator {
  /** 用户音频数据块 */
  userChunks: ArrayBuffer[];
  /** AI 音频数据块 */
  modelChunks: ArrayBuffer[];
  /** 用户音频开始时间 */
  userStartTime: number | null;
  /** AI 音频开始时间 */
  modelStartTime: number | null;
}

/**
 * 完成的音频消息
 * 需求: 2.1, 2.2
 */
export interface CompletedAudioMessage {
  /** 角色 */
  role: 'user' | 'model';
  /** 合并后的音频数据 */
  audioData: ArrayBuffer;
  /** 时长（毫秒） */
  durationMs: number;
  /** 转录文字 */
  transcript: string;
  /** 时间戳 */
  timestamp: number;
}

/**
 * Live Store 状态
 * 需求: 9.1-9.4
 */
interface LiveState {
  // 连接状态
  /** 当前连接状态 */
  connectionStatus: ConnectionStatus;
  /** 错误消息 */
  errorMessage: string | null;

  // 音频状态
  /** 是否静音 */
  isMuted: boolean;
  /** 输入音频电平 (0-1) */
  inputLevel: number;
  /** 输出音频电平 (0-1) */
  outputLevel: number;
  /** 输出音量 (0-1) */
  outputVolume: number;

  // 说话状态
  /** 当前说话方 */
  currentSpeaker: Speaker;

  // 转录
  /** 转录消息列表 */
  transcripts: TranscriptMessage[];
  /** 待处理的输入转录（实时） */
  pendingInputTranscript: string;
  /** 待处理的输出转录（实时） */
  pendingOutputTranscript: string;

  // 配置
  /** 会话配置 */
  config: LiveSessionConfig;

  // 音频累积（用于历史记录保存）
  // 需求: 2.1, 2.2
  /** 待保存的完成消息队列 */
  pendingMessages: CompletedAudioMessage[];
}

// ============ Store 操作接口 ============

/**
 * Live Store 操作
 * 需求: 2.1, 2.2, 2.2-2.6, 3.6, 4.2, 6.1-6.4
 */
interface LiveActions {
  // 会话控制
  /** 开始会话 */
  startSession: () => Promise<void>;
  /** 结束会话 */
  endSession: () => void;

  // 音频控制
  /** 切换静音状态 */
  toggleMute: () => void;
  /** 设置输出音量 */
  setOutputVolume: (volume: number) => void;

  // 配置
  /** 更新配置 */
  updateConfig: (config: Partial<LiveSessionConfig>) => void;
  /** 重置配置为默认值 */
  resetConfig: () => void;

  // 内部状态更新（供服务层回调使用）
  /** 设置连接状态 */
  setConnectionStatus: (status: ConnectionStatus) => void;
  /** 设置错误消息 */
  setErrorMessage: (message: string | null) => void;
  /** 设置当前说话方 */
  setCurrentSpeaker: (speaker: Speaker) => void;
  /** 设置输入音频电平 */
  setInputLevel: (level: number) => void;
  /** 设置输出音频电平 */
  setOutputLevel: (level: number) => void;
  /** 添加转录消息 */
  addTranscript: (message: TranscriptMessage) => void;
  /** 更新待处理转录 */
  updatePendingTranscript: (type: 'input' | 'output', text: string) => void;
  /** 完成待处理转录（将其添加到转录列表） */
  finalizePendingTranscript: (type: 'input' | 'output') => void;
  /** 清除所有转录 */
  clearTranscripts: () => void;

  // 音频消息队列操作（用于历史记录保存）
  // 需求: 2.1, 2.2
  /** 获取并清除待保存的消息 */
  consumePendingMessages: () => CompletedAudioMessage[];
}

// ============ Store 类型 ============

export type LiveStore = LiveState & LiveActions;

// ============ 服务实例 ============

/** Live API 服务实例 */
let liveApiService: LiveApiService | null = null;
/** 音频捕获服务实例 */
let audioCaptureService: AudioCaptureService | null = null;
/** 音频播放服务实例 */
let audioPlayerService: AudioPlayerService | null = null;

// ============ 音频累积器 ============
// 需求: 2.1, 2.2

/** 音频数据累积器实例 */
let audioAccumulator: AudioAccumulator = {
  userChunks: [],
  modelChunks: [],
  userStartTime: null,
  modelStartTime: null,
};

/**
 * 重置音频累积器
 */
function resetAudioAccumulator(): void {
  audioAccumulator = {
    userChunks: [],
    modelChunks: [],
    userStartTime: null,
    modelStartTime: null,
  };
}

/**
 * 合并音频数据块
 * @param chunks 音频数据块数组
 * @returns 合并后的 ArrayBuffer
 */
function mergeAudioChunks(chunks: ArrayBuffer[]): ArrayBuffer {
  if (chunks.length === 0) {
    return new ArrayBuffer(0);
  }
  
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  
  for (const chunk of chunks) {
    result.set(new Uint8Array(chunk), offset);
    offset += chunk.byteLength;
  }
  
  return result.buffer;
}

/**
 * 计算 PCM 音频时长（毫秒）
 * @param audioData PCM 音频数据
 * @param sampleRate 采样率
 * @returns 时长（毫秒）
 */
function calculatePcmDuration(audioData: ArrayBuffer, sampleRate: number): number {
  // 16 位 PCM，每个样本 2 字节
  const numSamples = audioData.byteLength / 2;
  return Math.round((numSamples / sampleRate) * 1000);
}

// ============ 辅助函数 ============

/**
 * 生成转录消息 ID
 */
function generateTranscriptId(): string {
  return `transcript-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 清理服务实例
 */
function cleanupServices(): void {
  if (liveApiService) {
    liveApiService.disconnect();
    liveApiService = null;
  }

  if (audioCaptureService) {
    audioCaptureService.stop();
    audioCaptureService = null;
  }

  if (audioPlayerService) {
    audioPlayerService.destroy();
    audioPlayerService = null;
  }
}

// ============ Store 创建 ============

/**
 * 创建 Live Store
 * 需求: 2.2-2.6, 3.6, 4.2, 6.1-6.4, 9.1-9.4
 */
export const useLiveStore = create<LiveStore>((set, get) => ({
  // ============ 初始状态 ============
  
  // 连接状态
  connectionStatus: 'disconnected',
  errorMessage: null,

  // 音频状态
  isMuted: false,
  inputLevel: 0,
  outputLevel: 0,
  outputVolume: 1,

  // 说话状态
  currentSpeaker: 'none',

  // 转录
  transcripts: [],
  pendingInputTranscript: '',
  pendingOutputTranscript: '',

  // 配置
  config: { ...DEFAULT_LIVE_CONFIG },

  // 音频消息队列
  // 需求: 2.1, 2.2
  pendingMessages: [],

  // ============ 会话控制 ============

  /**
   * 开始会话
   * 需求: 2.2, 3.1-3.4, 4.1
   */
  startSession: async () => {
    const state = get();
    
    // 如果已经连接或正在连接，不重复操作
    if (state.connectionStatus === 'connected' || state.connectionStatus === 'connecting') {
      return;
    }

    // 设置连接中状态
    set({ connectionStatus: 'connecting', errorMessage: null });

    try {
      // 获取 API 配置
      const settingsStore = useSettingsStore.getState();
      const { apiKey, apiEndpoint } = settingsStore;

      if (!apiKey) {
        throw new Error('请先配置 API 密钥');
      }

      const config = state.config;

      // 创建 Live API 服务回调
      const liveApiCallbacks: LiveApiCallbacks = {
        onOpen: () => {
          storeLogger.info('Live API 连接已打开');
        },
        onClose: (reason) => {
          storeLogger.info('Live API 连接已关闭', { reason });
          set({ 
            connectionStatus: 'disconnected',
            currentSpeaker: 'none',
          });
          cleanupServices();
        },
        onError: (error) => {
          storeLogger.error('Live API 错误', { error: error.message });
          const friendlyMessage = getFriendlyErrorMessage(error);
          set({ 
            connectionStatus: 'error',
            errorMessage: friendlyMessage,
            currentSpeaker: 'none',
          });
        },
        onAudioData: (data) => {
          // 将音频数据添加到播放队列
          if (audioPlayerService) {
            audioPlayerService.enqueue(data);
          }
          
          // 累积 AI 音频数据用于历史记录保存
          // 需求: 2.2
          if (audioAccumulator.modelStartTime === null) {
            audioAccumulator.modelStartTime = Date.now();
          }
          audioAccumulator.modelChunks.push(data.slice(0)); // 复制数据
        },
        onTextData: (text) => {
          // 处理文本响应（如果响应模态为文本）
          storeLogger.debug('收到文本响应', { text });
        },
        onInputTranscription: (text) => {
          // 更新输入转录（增量累积）
          const before = get().pendingInputTranscript;
          get().updatePendingTranscript('input', text);
          const after = get().pendingInputTranscript;
          console.log('[LiveAPI] 输入转录累积:', { 增量: text, 之前: before, 之后: after });
        },
        onOutputTranscription: (text) => {
          // 更新输出转录（增量累积）
          const before = get().pendingOutputTranscript;
          get().updatePendingTranscript('output', text);
          const after = get().pendingOutputTranscript;
          console.log('[LiveAPI] 输出转录累积:', { 增量: text, 之前: before, 之后: after });
        },
        onInterrupted: () => {
          // 处理中断 - 停止音频播放
          storeLogger.info('AI 响应被中断');
          if (audioPlayerService) {
            audioPlayerService.stop();
          }
          set({ currentSpeaker: 'none' });
        },
        onTurnComplete: () => {
          // 轮次完成 - 完成待处理的转录并保存音频消息
          storeLogger.info('轮次完成');
          const currentState = get();
          const newPendingMessages: CompletedAudioMessage[] = [...currentState.pendingMessages];
          
          // 处理用户音频消息
          // 需求: 2.1
          if (audioAccumulator.userChunks.length > 0) {
            const userAudioData = mergeAudioChunks(audioAccumulator.userChunks);
            const userDurationMs = calculatePcmDuration(userAudioData, 16000); // 用户音频 16kHz
            
            if (userAudioData.byteLength > 0) {
              newPendingMessages.push({
                role: 'user',
                audioData: userAudioData,
                durationMs: userDurationMs,
                transcript: currentState.pendingInputTranscript.trim(),
                timestamp: audioAccumulator.userStartTime || Date.now(),
              });
            }
          }
          
          // 处理 AI 音频消息
          // 需求: 2.2
          if (audioAccumulator.modelChunks.length > 0) {
            const modelAudioData = mergeAudioChunks(audioAccumulator.modelChunks);
            const modelDurationMs = calculatePcmDuration(modelAudioData, 24000); // AI 音频 24kHz
            
            if (modelAudioData.byteLength > 0) {
              newPendingMessages.push({
                role: 'model',
                audioData: modelAudioData,
                durationMs: modelDurationMs,
                transcript: currentState.pendingOutputTranscript.trim(),
                timestamp: audioAccumulator.modelStartTime || Date.now(),
              });
            }
          }
          
          // 更新待保存消息队列
          set({ pendingMessages: newPendingMessages });
          
          // 重置音频累积器
          resetAudioAccumulator();
          
          // 完成输入转录
          if (currentState.pendingInputTranscript) {
            currentState.finalizePendingTranscript('input');
          }
          
          // 完成输出转录
          if (currentState.pendingOutputTranscript) {
            currentState.finalizePendingTranscript('output');
          }
          
          set({ currentSpeaker: 'none' });
        },
        onSetupComplete: () => {
          storeLogger.info('Live API 设置完成');
          set({ connectionStatus: 'connected' });
        },
      };

      // 创建 Live API 服务
      liveApiService = new LiveApiService(
        {
          apiKey,
          apiEndpoint,
          model: config.model,
          responseModality: config.responseModality,
          voiceName: config.voiceName,
          systemInstruction: config.systemInstruction,
          thinkingBudget: config.thinkingBudget,
          enableAffectiveDialog: config.enableAffectiveDialog,
          enableProactiveAudio: config.enableProactiveAudio,
          enableInputTranscription: config.enableInputTranscription,
          enableOutputTranscription: config.enableOutputTranscription,
          vadConfig: config.vadConfig,
        },
        liveApiCallbacks
      );

      // 创建音频播放服务
      audioPlayerService = new AudioPlayerService({
        onPlaybackStart: () => {
          set({ currentSpeaker: 'model' });
        },
        onPlaybackEnd: () => {
          // 只有在没有待处理音频时才设置为 none
          if (!audioPlayerService?.isPlaying()) {
            set({ currentSpeaker: 'none' });
          }
        },
        onLevelChange: (level) => {
          set({ outputLevel: level });
        },
      });

      // 初始化音频播放服务
      await audioPlayerService.initialize();

      // 设置输出音量
      audioPlayerService.setVolume(state.outputVolume);

      // 创建音频捕获服务
      audioCaptureService = new AudioCaptureService({
        onAudioData: (pcmData) => {
          // 发送音频数据到 Live API
          if (liveApiService?.isConnected() && !get().isMuted) {
            liveApiService.sendRealtimeInput(pcmData);
            
            // 累积用户音频数据用于历史记录保存
            // 需求: 2.1
            if (audioAccumulator.userStartTime === null) {
              audioAccumulator.userStartTime = Date.now();
            }
            audioAccumulator.userChunks.push(pcmData.slice(0)); // 复制数据
          }
        },
        onLevelChange: (level) => {
          set({ inputLevel: level });
          // 如果有音频输入，设置当前说话方为用户
          if (level > 0.1 && !get().isMuted) {
            set({ currentSpeaker: 'user' });
          }
        },
        onError: (error) => {
          storeLogger.error('音频捕获错误', { error: error.message });
          const friendlyMessage = getFriendlyErrorMessage(error);
          set({ errorMessage: friendlyMessage });
        },
      });

      // 连接 Live API
      await liveApiService.connect();

      // 开始音频捕获
      await audioCaptureService.start();

      storeLogger.info('Live 会话已开始');
    } catch (error) {
      storeLogger.error('启动 Live 会话失败', { 
        error: error instanceof Error ? error.message : '未知错误' 
      });
      
      const friendlyMessage = error instanceof Error 
        ? getFriendlyErrorMessage(error)
        : '启动会话失败';
      
      set({ 
        connectionStatus: 'error',
        errorMessage: friendlyMessage,
      });
      
      // 清理已创建的服务
      cleanupServices();
    }
  },

  /**
   * 结束会话
   * 需求: 2.4
   */
  endSession: () => {
    storeLogger.info('结束 Live 会话');
    
    // 清理服务
    cleanupServices();
    
    // 重置音频累积器
    resetAudioAccumulator();

    // 重置状态
    set({
      connectionStatus: 'disconnected',
      errorMessage: null,
      currentSpeaker: 'none',
      inputLevel: 0,
      outputLevel: 0,
      isMuted: false,
      pendingMessages: [],
    });
  },

  // ============ 音频控制 ============

  /**
   * 切换静音状态
   * 需求: 3.6
   */
  toggleMute: () => {
    const state = get();
    const newMuted = !state.isMuted;

    if (audioCaptureService) {
      if (newMuted) {
        audioCaptureService.pause();
      } else {
        audioCaptureService.resume();
      }
    }

    set({ isMuted: newMuted });
    storeLogger.info('静音状态切换', { isMuted: newMuted });
  },

  /**
   * 设置输出音量
   * 需求: 4.2
   */
  setOutputVolume: (volume: number) => {
    // 处理 NaN 和无效值
    // 如果输入是 NaN，保持当前音量不变
    if (Number.isNaN(volume)) {
      return;
    }
    
    // 限制音量范围在 0-1 之间
    const clampedVolume = Math.max(0, Math.min(1, volume));

    if (audioPlayerService) {
      audioPlayerService.setVolume(clampedVolume);
    }

    set({ outputVolume: clampedVolume });
  },

  // ============ 配置管理 ============

  /**
   * 更新配置
   * 需求: 7.1-7.7
   */
  updateConfig: (configUpdate: Partial<LiveSessionConfig>) => {
    const currentConfig = get().config;
    const newConfig = { ...currentConfig, ...configUpdate };
    set({ config: newConfig });
  },

  /**
   * 重置配置为默认值
   */
  resetConfig: () => {
    set({ config: { ...DEFAULT_LIVE_CONFIG } });
  },

  // ============ 内部状态更新 ============

  /**
   * 设置连接状态
   * 需求: 2.3, 9.1
   */
  setConnectionStatus: (status: ConnectionStatus) => {
    set({ connectionStatus: status });
  },

  /**
   * 设置错误消息
   * 需求: 8.1-8.5
   */
  setErrorMessage: (message: string | null) => {
    set({ errorMessage: message });
  },

  /**
   * 设置当前说话方
   * 需求: 9.2
   */
  setCurrentSpeaker: (speaker: Speaker) => {
    set({ currentSpeaker: speaker });
  },

  /**
   * 设置输入音频电平
   * 需求: 3.5
   */
  setInputLevel: (level: number) => {
    set({ inputLevel: level });
  },

  /**
   * 设置输出音频电平
   * 需求: 4.4
   */
  setOutputLevel: (level: number) => {
    set({ outputLevel: level });
  },

  /**
   * 添加转录消息
   * 需求: 6.1-6.4
   */
  addTranscript: (message: TranscriptMessage) => {
    const transcripts = get().transcripts;
    set({ transcripts: [...transcripts, message] });
  },

  /**
   * 更新待处理转录
   * 需求: 6.1, 6.2
   * 
   * 注意：API 返回的转录是增量的，每次只返回新的部分
   * 需要累积拼接成完整文本
   */
  updatePendingTranscript: (type: 'input' | 'output', text: string) => {
    // API 返回的是增量文本，需要累积
    const state = get();
    if (type === 'input') {
      const accumulated = state.pendingInputTranscript + text;
      set({ pendingInputTranscript: accumulated });
    } else {
      const accumulated = state.pendingOutputTranscript + text;
      set({ pendingOutputTranscript: accumulated });
    }
  },

  /**
   * 完成待处理转录
   * 需求: 6.1-6.4
   */
  finalizePendingTranscript: (type: 'input' | 'output') => {
    const state = get();
    const text = type === 'input' 
      ? state.pendingInputTranscript 
      : state.pendingOutputTranscript;

    if (!text.trim()) {
      return;
    }

    const message: TranscriptMessage = {
      id: generateTranscriptId(),
      role: type === 'input' ? 'user' : 'model',
      text: text.trim(),
      timestamp: Date.now(),
      isFinal: true,
    };

    const transcripts = [...state.transcripts, message];

    if (type === 'input') {
      set({ transcripts, pendingInputTranscript: '' });
    } else {
      set({ transcripts, pendingOutputTranscript: '' });
    }
  },

  /**
   * 清除所有转录
   */
  clearTranscripts: () => {
    set({ 
      transcripts: [],
      pendingInputTranscript: '',
      pendingOutputTranscript: '',
    });
  },

  /**
   * 获取并清除待保存的消息
   * 需求: 2.1, 2.2
   * 
   * 用于外部（如 LiveApiView）获取待保存的音频消息并保存到历史记录
   */
  consumePendingMessages: () => {
    const messages = get().pendingMessages;
    set({ pendingMessages: [] });
    return messages;
  },
}));

// ============ 导出辅助函数 ============

/**
 * 获取连接状态的显示文本
 * 需求: 9.1
 */
export function getConnectionStatusText(status: ConnectionStatus): string {
  const statusTexts: Record<ConnectionStatus, string> = {
    disconnected: '未连接',
    connecting: '连接中...',
    connected: '已连接',
    error: '连接错误',
  };
  return statusTexts[status];
}

/**
 * 获取说话方的显示文本
 * 需求: 9.2
 */
export function getSpeakerText(speaker: Speaker): string {
  const speakerTexts: Record<Speaker, string> = {
    none: '无',
    user: '用户',
    model: 'AI',
  };
  return speakerTexts[speaker];
}
