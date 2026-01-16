/**
 * Live API 历史记录状态管理
 * Requirements: 1.2, 1.4, 7.1, 7.3
 *
 * 管理 Live API 会话历史记录的所有状态，包括会话列表、当前会话、
 * 播放状态和设置。
 */

import { create } from 'zustand';
import type {
  LiveSessionRecord,
  LiveSessionSummary,
  LiveVoiceMessage,
  LiveMessageRecord,
  LiveSessionConfig,
} from '../types/liveApi';
import {
  liveSessionStorage,
  audioBlobStorage,
  VoicePlayerService,
} from '../services/liveApi';
import type { VoicePlayerCallbacks } from '../services/liveApi';
import { storeLogger } from '../services/logger';

// ============ Store 状态接口 ============

/**
 * Live History Store 状态
 * Requirements: 1.2, 1.4
 */
interface LiveHistoryState {
  // 会话列表
  /** 会话摘要列表 */
  sessions: LiveSessionSummary[];
  /** 是否正在加载会话列表 */
  isLoadingSessions: boolean;

  // 当前查看的会话
  /** 当前会话记录 */
  currentSession: LiveSessionRecord | null;
  /** 当前会话的语音消息列表（包含音频 Blob） */
  currentSessionMessages: LiveVoiceMessage[];
  /** 是否正在加载会话 */
  isLoadingSession: boolean;

  // 当前活跃会话（实时对话时使用）
  /** 当前活跃会话 ID */
  activeSessionId: string | null;

  // 播放状态
  /** 正在播放的消息 ID */
  playingMessageId: string | null;
  /** 播放进度 (0-1) */
  playProgress: number;
}

// ============ Store 操作接口 ============

/**
 * Live History Store 操作
 * Requirements: 1.2, 1.4, 7.1, 7.3
 */
interface LiveHistoryActions {
  // 会话列表操作
  /** 加载会话列表 */
  loadSessions: () => Promise<void>;
  /** 选择会话（加载完整会话数据） */
  selectSession: (sessionId: string) => Promise<void>;
  /** 删除会话 */
  deleteSession: (sessionId: string) => Promise<void>;
  /** 清空所有会话 */
  clearAllSessions: () => Promise<void>;

  // 当前会话操作（实时对话时使用）
  /** 创建新会话 */
  createSession: (config: LiveSessionConfig) => Promise<string>;
  /** 添加语音消息 */
  addVoiceMessage: (
    role: 'user' | 'model',
    audioData: ArrayBuffer,
    durationMs: number,
    mimeType?: string
  ) => Promise<string>;
  /** 更新消息转录 */
  updateTranscript: (messageId: string, transcript: string) => Promise<void>;
  /** 结束当前活跃会话 */
  endActiveSession: () => void;

  // 播放控制
  /** 播放消息 */
  playMessage: (messageId: string) => Promise<void>;
  /** 停止播放 */
  stopPlayback: () => void;

  // 清理
  /** 清除当前会话 */
  clearCurrentSession: () => void;
}

// ============ Store 类型 ============

export type LiveHistoryStore = LiveHistoryState & LiveHistoryActions;

// ============ 服务实例 ============

/** 语音播放服务实例 */
let voicePlayerService: VoicePlayerService | null = null;

// ============ 辅助函数 ============

/**
 * 生成唯一 ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * 初始化语音播放服务
 */
function initVoicePlayerService(
  onPlayStart: (messageId: string) => void,
  onPlayEnd: (messageId: string) => void,
  onProgress: (messageId: string, progress: number) => void,
  onError: (messageId: string, error: Error) => void
): VoicePlayerService {
  const callbacks: VoicePlayerCallbacks = {
    onPlayStart,
    onPlayEnd,
    onProgress,
    onError,
  };
  return new VoicePlayerService(callbacks);
}

// ============ Store 创建 ============

/**
 * 创建 Live History Store
 * Requirements: 1.2, 1.4, 7.1, 7.3
 */
export const useLiveHistoryStore = create<LiveHistoryStore>((set, get) => {
  // 初始化语音播放服务
  voicePlayerService = initVoicePlayerService(
    // onPlayStart
    (messageId: string) => {
      set({ playingMessageId: messageId, playProgress: 0 });
    },
    // onPlayEnd
    (_messageId: string) => {
      set({ playingMessageId: null, playProgress: 0 });
    },
    // onProgress
    (_messageId: string, progress: number) => {
      set({ playProgress: progress });
    },
    // onError
    (messageId: string, error: Error) => {
      storeLogger.error('语音播放错误', { messageId, error: error.message });
      set({ playingMessageId: null, playProgress: 0 });
    }
  );

  return {
    // ============ 初始状态 ============

    // 会话列表
    sessions: [],
    isLoadingSessions: false,

    // 当前查看的会话
    currentSession: null,
    currentSessionMessages: [],
    isLoadingSession: false,

    // 当前活跃会话
    activeSessionId: null,

    // 播放状态
    playingMessageId: null,
    playProgress: 0,

    // ============ 会话列表操作 ============

    /**
     * 加载会话列表
     * Requirements: 1.2
     */
    loadSessions: async () => {
      set({ isLoadingSessions: true });

      try {
        // 确保存储服务已初始化
        await liveSessionStorage.initialize();

        // 获取所有会话摘要（已按时间倒序排列）
        const sessions = await liveSessionStorage.getAllSessionSummaries();

        set({ sessions, isLoadingSessions: false });
        storeLogger.info('会话列表加载完成', { count: sessions.length });
      } catch (error) {
        storeLogger.error('加载会话列表失败', {
          error: error instanceof Error ? error.message : '未知错误',
        });
        set({ isLoadingSessions: false });
        throw error;
      }
    },

    /**
     * 选择会话（加载完整会话数据）
     * Requirements: 1.4
     */
    selectSession: async (sessionId: string) => {
      set({ isLoadingSession: true });

      try {
        // 停止当前播放
        if (voicePlayerService?.isPlaying()) {
          voicePlayerService.stop();
        }

        // 确保存储服务已初始化
        await liveSessionStorage.initialize();
        await audioBlobStorage.initialize();

        // 获取会话记录
        const session = await liveSessionStorage.getSession(sessionId);

        if (!session) {
          throw new Error(`会话不存在: ${sessionId}`);
        }

        // 收集所有音频 ID
        const audioIds = session.messages
          .map((m) => m.audioId)
          .filter((id): id is string => id !== null);

        // 批量获取音频数据
        const audioBlobs = await audioBlobStorage.getAudios(audioIds);

        // 构建语音消息列表
        const voiceMessages: LiveVoiceMessage[] = session.messages.map((msg) => ({
          id: msg.id,
          role: msg.role,
          audioBlob: msg.audioId ? audioBlobs.get(msg.audioId) || null : null,
          durationMs: msg.durationMs,
          transcript: msg.transcript,
          timestamp: msg.timestamp,
        }));

        set({
          currentSession: session,
          currentSessionMessages: voiceMessages,
          isLoadingSession: false,
        });

        storeLogger.info('会话加载完成', {
          sessionId,
          messageCount: voiceMessages.length,
        });
      } catch (error) {
        storeLogger.error('加载会话失败', {
          sessionId,
          error: error instanceof Error ? error.message : '未知错误',
        });
        set({ isLoadingSession: false });
        throw error;
      }
    },

    /**
     * 删除会话
     * Requirements: 7.1, 7.2
     */
    deleteSession: async (sessionId: string) => {
      try {
        // 确保存储服务已初始化
        await liveSessionStorage.initialize();
        await audioBlobStorage.initialize();

        // 删除会话并获取关联的音频 ID
        const audioIds = await liveSessionStorage.deleteSession(sessionId);

        // 删除关联的音频数据
        if (audioIds.length > 0) {
          await audioBlobStorage.deleteAudios(audioIds);
        }

        // 更新会话列表
        const sessions = get().sessions.filter((s) => s.id !== sessionId);
        set({ sessions });

        // 如果删除的是当前查看的会话，清除当前会话
        if (get().currentSession?.id === sessionId) {
          set({
            currentSession: null,
            currentSessionMessages: [],
          });
        }

        // 如果删除的是当前活跃会话，清除活跃会话 ID
        if (get().activeSessionId === sessionId) {
          set({ activeSessionId: null });
        }

        storeLogger.info('会话删除完成', { sessionId, audioCount: audioIds.length });
      } catch (error) {
        storeLogger.error('删除会话失败', {
          sessionId,
          error: error instanceof Error ? error.message : '未知错误',
        });
        throw error;
      }
    },

    /**
     * 清空所有会话
     * Requirements: 7.3
     */
    clearAllSessions: async () => {
      try {
        // 停止当前播放
        if (voicePlayerService?.isPlaying()) {
          voicePlayerService.stop();
        }

        // 确保存储服务已初始化
        await liveSessionStorage.initialize();
        await audioBlobStorage.initialize();

        // 清空所有会话并获取所有音频 ID
        const audioIds = await liveSessionStorage.clearAllSessions();

        // 清空所有音频数据
        if (audioIds.length > 0) {
          await audioBlobStorage.deleteAudios(audioIds);
        }

        // 重置状态
        set({
          sessions: [],
          currentSession: null,
          currentSessionMessages: [],
          activeSessionId: null,
          playingMessageId: null,
          playProgress: 0,
        });

        storeLogger.info('所有会话已清空', { audioCount: audioIds.length });
      } catch (error) {
        storeLogger.error('清空会话失败', {
          error: error instanceof Error ? error.message : '未知错误',
        });
        throw error;
      }
    },

    // ============ 当前会话操作 ============

    /**
     * 创建新会话
     * Requirements: 1.5
     */
    createSession: async (config: LiveSessionConfig) => {
      try {
        // 确保存储服务已初始化
        await liveSessionStorage.initialize();

        // 创建新会话
        const session = await liveSessionStorage.createSession(config);

        // 设置为当前活跃会话
        set({ activeSessionId: session.id });

        // 重新加载会话列表
        await get().loadSessions();

        storeLogger.info('新会话创建完成', { sessionId: session.id });

        return session.id;
      } catch (error) {
        storeLogger.error('创建会话失败', {
          error: error instanceof Error ? error.message : '未知错误',
        });
        throw error;
      }
    },

    /**
     * 添加语音消息
     * Requirements: 2.1, 2.2
     */
    addVoiceMessage: async (
      role: 'user' | 'model',
      audioData: ArrayBuffer,
      durationMs: number,
      mimeType: string = 'audio/pcm'
    ) => {
      const { activeSessionId } = get();

      if (!activeSessionId) {
        throw new Error('没有活跃的会话');
      }

      try {
        // 确保存储服务已初始化
        await liveSessionStorage.initialize();
        await audioBlobStorage.initialize();

        // 生成 ID
        const messageId = generateId();
        const audioId = generateId();

        // 存储音频数据
        await audioBlobStorage.storeAudio(audioId, audioData, mimeType);

        // 创建消息记录
        const message: LiveMessageRecord = {
          id: messageId,
          role,
          audioId,
          durationMs,
          transcript: '',
          timestamp: Date.now(),
        };

        // 添加消息到会话
        await liveSessionStorage.addMessage(activeSessionId, message);

        storeLogger.info('语音消息添加完成', {
          sessionId: activeSessionId,
          messageId,
          role,
          durationMs,
        });

        return messageId;
      } catch (error) {
        storeLogger.error('添加语音消息失败', {
          sessionId: activeSessionId,
          error: error instanceof Error ? error.message : '未知错误',
        });
        throw error;
      }
    },

    /**
     * 更新消息转录
     * Requirements: 4.1
     */
    updateTranscript: async (messageId: string, transcript: string) => {
      const { activeSessionId } = get();

      if (!activeSessionId) {
        throw new Error('没有活跃的会话');
      }

      try {
        // 确保存储服务已初始化
        await liveSessionStorage.initialize();

        // 更新转录
        await liveSessionStorage.updateMessageTranscript(
          activeSessionId,
          messageId,
          transcript
        );

        storeLogger.info('转录更新完成', {
          sessionId: activeSessionId,
          messageId,
        });
      } catch (error) {
        storeLogger.error('更新转录失败', {
          sessionId: activeSessionId,
          messageId,
          error: error instanceof Error ? error.message : '未知错误',
        });
        throw error;
      }
    },

    /**
     * 结束当前活跃会话
     */
    endActiveSession: () => {
      set({ activeSessionId: null });
      storeLogger.info('活跃会话已结束');
    },

    // ============ 播放控制 ============

    /**
     * 播放消息
     * Requirements: 3.4
     */
    playMessage: async (messageId: string) => {
      const { currentSessionMessages, playingMessageId } = get();

      // 如果正在播放同一条消息，停止播放
      if (playingMessageId === messageId) {
        get().stopPlayback();
        return;
      }

      // 查找消息
      const message = currentSessionMessages.find((m) => m.id === messageId);

      if (!message) {
        throw new Error(`消息不存在: ${messageId}`);
      }

      if (!message.audioBlob) {
        throw new Error('消息没有音频数据');
      }

      // 播放音频
      if (voicePlayerService) {
        await voicePlayerService.play(messageId, message.audioBlob);
      }
    },

    /**
     * 停止播放
     * Requirements: 3.6
     */
    stopPlayback: () => {
      if (voicePlayerService) {
        voicePlayerService.stop();
      }
      set({ playingMessageId: null, playProgress: 0 });
    },

    // ============ 清理 ============

    /**
     * 清除当前会话
     */
    clearCurrentSession: () => {
      // 停止播放
      if (voicePlayerService?.isPlaying()) {
        voicePlayerService.stop();
      }

      set({
        currentSession: null,
        currentSessionMessages: [],
        playingMessageId: null,
        playProgress: 0,
      });
    },
  };
});
