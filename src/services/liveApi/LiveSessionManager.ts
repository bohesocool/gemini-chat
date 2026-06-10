/**
 * Live 会话管理服务
 *
 * 从 stores/live.ts 拆分：负责 Live API / 音频捕获 / 音频播放 /
 * 屏幕捕获服务实例的生命周期管理，以及音频数据累积与合并。
 * 状态变化通过回调通知调用方（store 只保留状态）。
 *
 * 需求: 2.1, 2.2, 2.2-2.6, 3.6, 4.2
 */

import type {
  ConnectionStatus,
  Speaker,
  LiveSessionConfig,
  LiveApiCallbacks,
  ScreenShareConfig,
} from '../../types/liveApi';
import { LiveApiService } from './LiveApiService';
import { AudioCaptureService } from './AudioCaptureService';
import { AudioPlayerService } from './AudioPlayerService';
import { ScreenCaptureService } from './ScreenCaptureService';
import { getFriendlyErrorMessage } from './errors';
import { storeLogger } from '../logger';

// ============ 类型定义 ============

/** 一个轮次内累积的单方音频片段（转录由调用方补充） */
export interface TurnAudioSegment {
  /** 合并后的音频数据 */
  audioData: ArrayBuffer;
  /** 时长（毫秒） */
  durationMs: number;
  /** 开始时间戳 */
  timestamp: number;
}

/** 轮次完成时的双方音频 */
export interface TurnAudio {
  user: TurnAudioSegment | null;
  model: TurnAudioSegment | null;
}

/** 会话状态回调（由 store 实现，用于更新 UI 状态） */
export interface LiveSessionManagerCallbacks {
  onConnectionStatusChange: (status: ConnectionStatus) => void;
  onError: (message: string) => void;
  onSpeakerChange: (speaker: Speaker) => void;
  onInputLevel: (level: number) => void;
  onOutputLevel: (level: number) => void;
  onInputTranscription: (text: string) => void;
  onOutputTranscription: (text: string) => void;
  /** 轮次完成：返回本轮累积的音频，供调用方补充转录后保存 */
  onTurnComplete: (audio: TurnAudio) => void;
}

/** 屏幕共享回调 */
export interface ScreenShareSessionCallbacks {
  onFrame: (base64Data: string) => void;
  onStart: () => void;
  onStop: () => void;
  onError: (error: Error) => void;
}

/** startSession 参数 */
export interface StartSessionOptions {
  apiKey: string;
  apiEndpoint: string;
  config: LiveSessionConfig;
  /** 初始输出音量 (0-1) */
  outputVolume: number;
  /** 初始静音状态 */
  muted: boolean;
}

// ============ 音频工具函数 ============

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

function createAudioAccumulator(): AudioAccumulator {
  return {
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

/**
 * 把累积的音频块合并为轮次音频片段
 * 没有有效数据时返回 null
 */
function buildSegment(
  chunks: ArrayBuffer[],
  sampleRate: number,
  startTime: number | null
): TurnAudioSegment | null {
  if (chunks.length === 0) {
    return null;
  }
  const audioData = mergeAudioChunks(chunks);
  if (audioData.byteLength === 0) {
    return null;
  }
  return {
    audioData,
    durationMs: calculatePcmDuration(audioData, sampleRate),
    timestamp: startTime || Date.now(),
  };
}

// ============ 会话管理器 ============

/**
 * Live 会话管理器
 * 持有所有服务实例，对外只暴露动作方法 + 状态回调
 */
export class LiveSessionManager {
  private liveApiService: LiveApiService | null = null;
  private audioCaptureService: AudioCaptureService | null = null;
  private audioPlayerService: AudioPlayerService | null = null;
  private screenCaptureService: ScreenCaptureService | null = null;

  /** 音频数据累积器（需求: 2.1, 2.2） */
  private accumulator: AudioAccumulator = createAudioAccumulator();
  /** 静音状态（捕获回调中判断是否发送/累积） */
  private muted = false;

  /**
   * 开始会话：创建并连接所有服务
   * 失败时通过回调报告错误并自行清理，不抛出异常
   * 需求: 2.2, 3.1-3.4, 4.1
   */
  async startSession(options: StartSessionOptions, callbacks: LiveSessionManagerCallbacks): Promise<void> {
    const { apiKey, apiEndpoint, config, outputVolume, muted } = options;
    this.muted = muted;

    try {
      // 创建 Live API 服务回调
      const liveApiCallbacks: LiveApiCallbacks = {
        onOpen: () => {
          storeLogger.info('Live API 连接已打开');
        },
        onClose: (reason) => {
          storeLogger.info('Live API 连接已关闭', { reason });
          callbacks.onConnectionStatusChange('disconnected');
          callbacks.onSpeakerChange('none');
          this.cleanupServices();
        },
        onError: (error) => {
          storeLogger.error('Live API 错误', { error: error.message });
          callbacks.onError(getFriendlyErrorMessage(error));
          callbacks.onConnectionStatusChange('error');
          callbacks.onSpeakerChange('none');
        },
        onAudioData: (data) => {
          // 将音频数据添加到播放队列
          if (this.audioPlayerService) {
            this.audioPlayerService.enqueue(data);
          }

          // 累积 AI 音频数据用于历史记录保存
          // 需求: 2.2
          if (this.accumulator.modelStartTime === null) {
            this.accumulator.modelStartTime = Date.now();
          }
          this.accumulator.modelChunks.push(data.slice(0)); // 复制数据
        },
        onTextData: (text) => {
          // 处理文本响应（如果响应模态为文本）
          storeLogger.debug('收到文本响应', { text });
        },
        onInputTranscription: (text) => {
          // 输入转录增量，由 store 累积
          callbacks.onInputTranscription(text);
        },
        onOutputTranscription: (text) => {
          // 输出转录增量，由 store 累积
          callbacks.onOutputTranscription(text);
        },
        onInterrupted: () => {
          // 处理中断 - 停止音频播放
          storeLogger.info('AI 响应被中断');
          if (this.audioPlayerService) {
            this.audioPlayerService.stop();
          }
          callbacks.onSpeakerChange('none');
        },
        onTurnComplete: () => {
          // 轮次完成 - 合并累积的音频并交给调用方保存
          storeLogger.info('轮次完成');
          const audio: TurnAudio = {
            // 用户音频 16kHz（需求: 2.1）
            user: buildSegment(this.accumulator.userChunks, 16000, this.accumulator.userStartTime),
            // AI 音频 24kHz（需求: 2.2）
            model: buildSegment(this.accumulator.modelChunks, 24000, this.accumulator.modelStartTime),
          };
          this.accumulator = createAudioAccumulator();
          callbacks.onTurnComplete(audio);
        },
        onSetupComplete: () => {
          storeLogger.info('Live API 设置完成');
          callbacks.onConnectionStatusChange('connected');
        },
      };

      // 创建 Live API 服务
      this.liveApiService = new LiveApiService(
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
      this.audioPlayerService = new AudioPlayerService({
        onPlaybackStart: () => {
          callbacks.onSpeakerChange('model');
        },
        onPlaybackEnd: () => {
          // 只有在没有待处理音频时才设置为 none
          if (!this.audioPlayerService?.isPlaying()) {
            callbacks.onSpeakerChange('none');
          }
        },
        onLevelChange: (level) => {
          callbacks.onOutputLevel(level);
        },
      });

      // 初始化音频播放服务
      await this.audioPlayerService.initialize();

      // 设置输出音量
      this.audioPlayerService.setVolume(outputVolume);

      // 创建音频捕获服务
      this.audioCaptureService = new AudioCaptureService({
        onAudioData: (pcmData) => {
          // 发送音频数据到 Live API
          if (this.liveApiService?.isConnected() && !this.muted) {
            this.liveApiService.sendRealtimeInput(pcmData);

            // 累积用户音频数据用于历史记录保存
            // 需求: 2.1
            if (this.accumulator.userStartTime === null) {
              this.accumulator.userStartTime = Date.now();
            }
            this.accumulator.userChunks.push(pcmData.slice(0)); // 复制数据
          }
        },
        onLevelChange: (level) => {
          callbacks.onInputLevel(level);
          // 如果有音频输入，设置当前说话方为用户
          if (level > 0.1 && !this.muted) {
            callbacks.onSpeakerChange('user');
          }
        },
        onError: (error) => {
          storeLogger.error('音频捕获错误', { error: error.message });
          callbacks.onError(getFriendlyErrorMessage(error));
        },
      });

      // 连接 Live API
      await this.liveApiService.connect();

      // 开始音频捕获
      await this.audioCaptureService.start();

      storeLogger.info('Live 会话已开始');
    } catch (error) {
      storeLogger.error('启动 Live 会话失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });

      const friendlyMessage = error instanceof Error
        ? getFriendlyErrorMessage(error)
        : '启动会话失败';

      callbacks.onError(friendlyMessage);
      callbacks.onConnectionStatusChange('error');

      // 清理已创建的服务
      this.cleanupServices();
    }
  }

  /**
   * 结束会话：停止屏幕共享、清理所有服务、重置累积器
   * 需求: 2.4, 1.6
   */
  endSession(): void {
    this.stopScreenShare();
    this.cleanupServices();
    this.accumulator = createAudioAccumulator();
  }

  /**
   * 设置静音状态
   * 需求: 3.6
   */
  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.audioCaptureService) {
      if (muted) {
        this.audioCaptureService.pause();
      } else {
        this.audioCaptureService.resume();
      }
    }
  }

  /**
   * 设置输出音量（调用方负责范围校验）
   * 需求: 4.2
   */
  setVolume(volume: number): void {
    if (this.audioPlayerService) {
      this.audioPlayerService.setVolume(volume);
    }
  }

  /**
   * 开始屏幕共享
   * 需求: 1.1, 2.1, 2.2, 2.3, 4.1
   */
  async startScreenShare(config: ScreenShareConfig, callbacks: ScreenShareSessionCallbacks): Promise<void> {
    this.screenCaptureService = new ScreenCaptureService(config, {
      // 截取到一帧屏幕时的回调
      // 需求: 2.1 - 发送帧到 Live API
      onFrame: (base64Data: string) => {
        // 通过 LiveApiService 发送屏幕帧
        if (this.liveApiService?.isConnected()) {
          try {
            this.liveApiService.sendScreenFrame(base64Data);
          } catch (error) {
            storeLogger.warn('发送屏幕帧失败', {
              error: error instanceof Error ? error.message : '未知错误',
            });
          }
        }
        // 通知调用方更新预览
        callbacks.onFrame(base64Data);
      },

      // 屏幕共享开始回调
      onStart: () => {
        storeLogger.info('屏幕共享已开始');
        callbacks.onStart();
      },

      // 屏幕共享停止回调（包括用户通过浏览器原生 UI 停止）
      // 需求: 1.5
      onStop: () => {
        storeLogger.info('屏幕共享已停止');
        this.screenCaptureService = null;
        callbacks.onStop();
      },

      // 屏幕共享错误回调
      // 需求: 7.1, 7.2
      onError: (error: Error) => {
        storeLogger.error('屏幕共享错误', { error: error.message });
        this.screenCaptureService = null;
        callbacks.onError(error);
      },
    });

    // 启动屏幕捕获
    await this.screenCaptureService.start();
  }

  /**
   * 停止屏幕共享
   * 需求: 1.4, 1.6
   */
  stopScreenShare(): void {
    if (this.screenCaptureService) {
      this.screenCaptureService.stop();
      this.screenCaptureService = null;
    }
  }

  /**
   * 清理会话服务实例（不含屏幕共享）
   */
  private cleanupServices(): void {
    if (this.liveApiService) {
      this.liveApiService.disconnect();
      this.liveApiService = null;
    }

    if (this.audioCaptureService) {
      this.audioCaptureService.stop();
      this.audioCaptureService = null;
    }

    if (this.audioPlayerService) {
      this.audioPlayerService.destroy();
      this.audioPlayerService = null;
    }
  }
}

/** 全局会话管理器实例（与 store 一一对应） */
export const liveSessionManager = new LiveSessionManager();
