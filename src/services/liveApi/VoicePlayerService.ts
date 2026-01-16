/**
 * 语音消息播放服务
 * 用于播放历史语音消息的 Blob 数据
 * Requirements: 3.4, 3.5, 3.6
 */

/**
 * 语音播放服务回调接口
 */
export interface VoicePlayerCallbacks {
  /** 开始播放 */
  onPlayStart: (messageId: string) => void;
  /** 播放结束 */
  onPlayEnd: (messageId: string) => void;
  /** 播放进度更新 (0-1) */
  onProgress: (messageId: string, progress: number) => void;
  /** 播放错误 */
  onError: (messageId: string, error: Error) => void;
}

/**
 * 播放错误类
 */
export class PlaybackError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PlaybackError';
  }
}

/**
 * 从 MIME 类型中解析采样率
 * @param mimeType - MIME 类型，如 "audio/pcm;rate=16000"
 * @returns 采样率，默认 24000
 */
function parseSampleRate(mimeType: string | undefined): number {
  if (!mimeType) {
    return 24000;
  }
  const match = mimeType.match(/rate=(\d+)/);
  if (match && match[1]) {
    return parseInt(match[1], 10);
  }
  // 默认采样率（AI 输出通常是 24000）
  return 24000;
}

/**
 * 将 PCM 数据转换为 WAV 格式
 * PCM 是原始音频数据，浏览器无法直接播放，需要添加 WAV 头
 * 
 * @param pcmData - PCM 原始数据
 * @param sampleRate - 采样率
 * @param numChannels - 声道数（默认单声道）
 * @param bitsPerSample - 每样本位数（默认 16 位）
 * @returns WAV 格式的 Blob
 */
function pcmToWav(
  pcmData: ArrayBuffer,
  sampleRate: number,
  numChannels: number = 1,
  bitsPerSample: number = 16
): Blob {
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmData.byteLength;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  // RIFF 头
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalSize - 8, true); // 文件大小 - 8
  writeString(view, 8, 'WAVE');

  // fmt 子块
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // fmt 块大小
  view.setUint16(20, 1, true); // 音频格式 (1 = PCM)
  view.setUint16(22, numChannels, true); // 声道数
  view.setUint32(24, sampleRate, true); // 采样率
  view.setUint32(28, byteRate, true); // 字节率
  view.setUint16(32, blockAlign, true); // 块对齐
  view.setUint16(34, bitsPerSample, true); // 每样本位数

  // data 子块
  writeString(view, 36, 'data');
  view.setUint32(40, dataSize, true); // 数据大小

  // 复制 PCM 数据
  const pcmView = new Uint8Array(pcmData);
  const wavView = new Uint8Array(buffer);
  wavView.set(pcmView, headerSize);

  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * 写入字符串到 DataView
 */
function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * 语音消息播放服务类
 * 管理历史语音消息的播放，支持播放进度回调
 * Requirements: 3.4, 3.5, 3.6
 */
export class VoicePlayerService {
  private callbacks: VoicePlayerCallbacks;
  private audioElement: HTMLAudioElement | null = null;
  private currentMessageId: string | null = null;
  private progressInterval: number | null = null;
  private objectUrl: string | null = null;

  constructor(callbacks: VoicePlayerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 播放语音消息
   * Requirements: 3.4
   * 
   * @param messageId - 消息 ID
   * @param audioBlob - 音频 Blob 数据
   */
  async play(messageId: string, audioBlob: Blob): Promise<void> {
    // 如果正在播放其他消息，先停止
    if (this.currentMessageId && this.currentMessageId !== messageId) {
      this.stop();
    }

    // 如果正在播放同一条消息，不做任何操作
    if (this.currentMessageId === messageId && this.audioElement && !this.audioElement.paused) {
      return;
    }

    try {
      // 清理之前的资源
      this.cleanup();

      // 创建音频元素
      this.audioElement = new Audio();
      this.currentMessageId = messageId;

      // 检查是否是 PCM 格式，需要转换为 WAV
      let playableBlob = audioBlob;
      if (audioBlob.type.includes('pcm')) {
        const sampleRate = parseSampleRate(audioBlob.type);
        const pcmData = await audioBlob.arrayBuffer();
        playableBlob = pcmToWav(pcmData, sampleRate);
      }

      // 创建 Object URL
      this.objectUrl = URL.createObjectURL(playableBlob);
      this.audioElement.src = this.objectUrl;

      // 设置事件监听器
      this.setupEventListeners(messageId);

      // 开始播放
      await this.audioElement.play();
      
      // 通知开始播放
      this.callbacks.onPlayStart(messageId);

      // 启动进度更新
      this.startProgressUpdates(messageId);
    } catch (error) {
      this.cleanup();
      const playbackError = new PlaybackError(
        error instanceof Error ? error.message : '播放失败'
      );
      this.callbacks.onError(messageId, playbackError);
      throw playbackError;
    }
  }

  /**
   * 停止播放
   * Requirements: 3.6
   */
  stop(): void {
    if (!this.audioElement || !this.currentMessageId) {
      return;
    }

    const messageId = this.currentMessageId;
    
    // 停止播放
    this.audioElement.pause();
    this.audioElement.currentTime = 0;

    // 清理资源
    this.cleanup();

    // 通知播放结束
    this.callbacks.onPlayEnd(messageId);
  }

  /**
   * 获取当前正在播放的消息 ID
   * 
   * @returns 当前播放的消息 ID，如果没有播放则返回 null
   */
  getCurrentPlayingId(): string | null {
    return this.currentMessageId;
  }

  /**
   * 是否正在播放
   * 
   * @returns 是否正在播放音频
   */
  isPlaying(): boolean {
    return this.audioElement !== null && 
           !this.audioElement.paused && 
           this.currentMessageId !== null;
  }

  /**
   * 销毁服务，释放所有资源
   */
  destroy(): void {
    this.stop();
    this.cleanup();
  }

  /**
   * 设置音频元素的事件监听器
   * 
   * @param messageId - 消息 ID
   */
  private setupEventListeners(messageId: string): void {
    if (!this.audioElement) {
      return;
    }

    // 播放结束事件
    this.audioElement.onended = () => {
      this.stopProgressUpdates();
      // 发送最终进度 1
      this.callbacks.onProgress(messageId, 1);
      this.callbacks.onPlayEnd(messageId);
      this.cleanup();
    };

    // 播放错误事件
    this.audioElement.onerror = () => {
      const error = new PlaybackError('音频播放失败');
      this.callbacks.onError(messageId, error);
      this.cleanup();
    };
  }

  /**
   * 启动进度更新定时器
   * Requirements: 3.5
   * 
   * @param messageId - 消息 ID
   */
  private startProgressUpdates(messageId: string): void {
    this.stopProgressUpdates();

    // 每 100ms 更新一次进度
    this.progressInterval = window.setInterval(() => {
      if (!this.audioElement || this.audioElement.paused) {
        return;
      }

      const duration = this.audioElement.duration;
      const currentTime = this.audioElement.currentTime;

      if (duration > 0 && isFinite(duration)) {
        const progress = Math.min(currentTime / duration, 1);
        this.callbacks.onProgress(messageId, progress);
      }
    }, 100);
  }

  /**
   * 停止进度更新定时器
   */
  private stopProgressUpdates(): void {
    if (this.progressInterval !== null) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  /**
   * 清理资源
   */
  private cleanup(): void {
    this.stopProgressUpdates();

    // 释放 Object URL
    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = null;
    }

    // 清理音频元素
    if (this.audioElement) {
      this.audioElement.onended = null;
      this.audioElement.onerror = null;
      this.audioElement.src = '';
      this.audioElement = null;
    }

    this.currentMessageId = null;
  }
}
