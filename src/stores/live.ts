/**
 * Live API 状态管理
 * 需求: 2.1, 2.2, 2.2-2.6, 3.6, 4.2, 6.1-6.4, 9.1-9.4
 *
 * 管理 Live API 实时对话功能的所有状态，包括连接状态、音频状态、
 * 说话状态、转录消息和会话配置。
 * 服务实例生命周期与音频处理逻辑在 services/liveApi/LiveSessionManager 中，
 * 本 store 只保留状态和对管理器的薄委托。
 */

import { create } from 'zustand';
import type {
  ConnectionStatus,
  Speaker,
  TranscriptMessage,
  LiveSessionConfig,
  ScreenShareStatus,
  ScreenShareConfig,
} from '../types/liveApi';
import {
  liveSessionManager,
  DEFAULT_LIVE_CONFIG,
} from '../services/liveApi';
import type { TurnAudio, TurnAudioSegment } from '../services/liveApi';
import { DEFAULT_SCREEN_SHARE_CONFIG } from '../constants/liveApi';
import { useSettingsStore } from './settings';
import { storeLogger } from '../services/logger';

// ============ 类型定义 ============

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

  // 屏幕共享状态
  // 需求: 4.1, 3.1
  /** 屏幕共享状态 */
  screenShareStatus: ScreenShareStatus;
  /** 屏幕共享错误消息 */
  screenShareError: string | null;
  /** 屏幕共享配置 */
  screenShareConfig: ScreenShareConfig;
  /** 最新屏幕帧（用于预览） */
  latestScreenFrame: string | null;
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

  // 屏幕共享控制
  // 需求: 1.1, 1.6, 2.1, 2.2, 2.3, 4.1
  /** 切换屏幕共享 */
  toggleScreenShare: () => Promise<void>;
  /** 停止屏幕共享 */
  stopScreenShare: () => void;
  /** 更新屏幕共享配置 */
  updateScreenShareConfig: (config: Partial<ScreenShareConfig>) => void;
}

// ============ Store 类型 ============

export type LiveStore = LiveState & LiveActions;

// ============ 辅助函数 ============

/**
 * 生成转录消息 ID
 */
function generateTranscriptId(): string {
  return `transcript-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 把轮次音频片段转换为待保存消息（补充转录文字）
 */
function toCompletedMessage(
  role: 'user' | 'model',
  segment: TurnAudioSegment,
  transcript: string
): CompletedAudioMessage {
  return {
    role,
    audioData: segment.audioData,
    durationMs: segment.durationMs,
    transcript: transcript.trim(),
    timestamp: segment.timestamp,
  };
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

  // 屏幕共享状态
  // 需求: 4.1, 3.1
  screenShareStatus: 'inactive',
  screenShareError: null,
  screenShareConfig: { ...DEFAULT_SCREEN_SHARE_CONFIG },
  latestScreenFrame: null,

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

    // 获取 API 配置
    const { apiKey, apiEndpoint } = useSettingsStore.getState();

    if (!apiKey) {
      set({ connectionStatus: 'error', errorMessage: '请先配置 API 密钥' });
      return;
    }

    // 设置连接中状态
    set({ connectionStatus: 'connecting', errorMessage: null });

    await liveSessionManager.startSession(
      {
        apiKey,
        apiEndpoint,
        config: state.config,
        outputVolume: state.outputVolume,
        muted: state.isMuted,
      },
      {
        onConnectionStatusChange: (status) => set({ connectionStatus: status }),
        onError: (message) => set({ errorMessage: message }),
        onSpeakerChange: (speaker) => set({ currentSpeaker: speaker }),
        onInputLevel: (level) => set({ inputLevel: level }),
        onOutputLevel: (level) => set({ outputLevel: level }),
        onInputTranscription: (text) => get().updatePendingTranscript('input', text),
        onOutputTranscription: (text) => get().updatePendingTranscript('output', text),
        onTurnComplete: (audio: TurnAudio) => {
          // 轮次完成 - 把累积音频与转录合并入待保存队列
          // 需求: 2.1, 2.2
          const currentState = get();
          const newPendingMessages = [...currentState.pendingMessages];

          if (audio.user) {
            newPendingMessages.push(
              toCompletedMessage('user', audio.user, currentState.pendingInputTranscript)
            );
          }
          if (audio.model) {
            newPendingMessages.push(
              toCompletedMessage('model', audio.model, currentState.pendingOutputTranscript)
            );
          }

          set({ pendingMessages: newPendingMessages });

          // 完成输入/输出转录
          if (currentState.pendingInputTranscript) {
            currentState.finalizePendingTranscript('input');
          }
          if (currentState.pendingOutputTranscript) {
            currentState.finalizePendingTranscript('output');
          }

          set({ currentSpeaker: 'none' });
        },
      }
    );
  },

  /**
   * 结束会话
   * 需求: 2.4, 1.6
   */
  endSession: () => {
    storeLogger.info('结束 Live 会话');

    // 停止屏幕共享并清理资源
    // 需求: 1.6
    get().stopScreenShare();

    // 清理服务并重置音频累积器
    liveSessionManager.endSession();

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
    const newMuted = !get().isMuted;
    liveSessionManager.setMuted(newMuted);
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

    liveSessionManager.setVolume(clampedVolume);
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

  // ============ 屏幕共享控制 ============

  /**
   * 切换屏幕共享
   * 需求: 1.1, 1.6, 2.1, 2.2, 2.3, 4.1
   *
   * 如果当前正在共享或请求中，则停止共享；
   * 否则通过会话管理器开始屏幕捕获。
   */
  toggleScreenShare: async () => {
    const state = get();

    // 如果当前状态是 'sharing' 或 'requesting'，停止屏幕共享
    if (state.screenShareStatus === 'sharing' || state.screenShareStatus === 'requesting') {
      get().stopScreenShare();
      return;
    }

    // 设置状态为请求中
    set({ screenShareStatus: 'requesting', screenShareError: null });

    await liveSessionManager.startScreenShare(state.screenShareConfig, {
      // 截取到一帧屏幕（已由管理器发送到 Live API），更新预览
      onFrame: (base64Data) => {
        set({ latestScreenFrame: base64Data });
      },
      onStart: () => {
        set({ screenShareStatus: 'sharing' });
      },
      // 屏幕共享停止（包括用户通过浏览器原生 UI 停止）
      // 需求: 1.5
      onStop: () => {
        set({
          screenShareStatus: 'inactive',
          latestScreenFrame: null,
        });
      },
      // 需求: 7.1, 7.2
      onError: (error) => {
        set({
          screenShareStatus: 'inactive',
          screenShareError: error.message,
        });
      },
    });
  },

  /**
   * 停止屏幕共享
   * 需求: 1.4, 1.6
   *
   * 停止屏幕捕获并重置所有屏幕共享相关状态。
   */
  stopScreenShare: () => {
    liveSessionManager.stopScreenShare();

    // 重置屏幕共享状态
    set({
      screenShareStatus: 'inactive',
      screenShareError: null,
      latestScreenFrame: null,
    });
  },

  /**
   * 更新屏幕共享配置
   * 需求: 3.3
   *
   * 合并传入的部分配置到现有配置（部分更新）。
   */
  updateScreenShareConfig: (config: Partial<ScreenShareConfig>) => {
    const currentConfig = get().screenShareConfig;
    const newConfig = { ...currentConfig, ...config };
    set({ screenShareConfig: newConfig });
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
