/**
 * 音频播放服务
 * 播放从 Live API 接收的 PCM 音频数据
 * Requirements: 4.1-4.4
 */

import type { AudioPlayerCallbacks } from '../../types/liveApi';
import { AUDIO_CONFIG } from '../../constants/liveApi';
import { createLogger } from '../../services/logger';

// 模块日志记录器
const logger = createLogger('AudioPlayer');

/**
 * 音频播放服务类
 * 负责播放 PCM 格式的音频数据，支持音量控制和播放中断
 * 使用连续调度方式避免音频块之间的间隙（电流音）
 */
export class AudioPlayerService {
  private callbacks: AudioPlayerCallbacks;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private volume: number = 1;
  private isCurrentlyPlaying: boolean = false;
  private audioQueue: ArrayBuffer[] = [];
  private levelUpdateInterval: number | null = null;
  
  // 连续播放调度相关
  private nextPlayTime: number = 0;
  private isScheduling: boolean = false;
  private scheduledSources: AudioBufferSourceNode[] = [];

  // 音频配置常量
  private readonly sampleRate = AUDIO_CONFIG.OUTPUT_SAMPLE_RATE; // 24kHz

  constructor(callbacks: AudioPlayerCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 初始化音频上下文
   * Requirements: 4.1
   */
  async initialize(): Promise<void> {
    if (this.audioContext) {
      return;
    }

    // 创建音频上下文
    this.audioContext = new AudioContext({
      sampleRate: this.sampleRate,
    });

    // 如果音频上下文被挂起，恢复它
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }

    // 创建增益节点用于音量控制
    this.gainNode = this.audioContext.createGain();
    this.gainNode.gain.value = this.volume;

    // 创建分析器节点用于计算音频电平
    this.analyserNode = this.audioContext.createAnalyser();
    this.analyserNode.fftSize = 256;
    this.analyserNode.smoothingTimeConstant = 0.3;

    // 连接节点：source -> gain -> analyser -> destination
    this.gainNode.connect(this.analyserNode);
    this.analyserNode.connect(this.audioContext.destination);

    // 启动音频电平更新
    this.startLevelUpdates();
  }

  /**
   * 添加音频数据到播放队列
   * Requirements: 4.1
   * 
   * @param pcmData - 16 位小端序 PCM 音频数据
   */
  enqueue(pcmData: ArrayBuffer): void {
    this.audioQueue.push(pcmData);
    this.schedulePlayback();
  }

  /**
   * 调度音频播放
   * 使用连续调度方式，确保音频块无缝衔接
   */
  private schedulePlayback(): void {
    if (this.isScheduling || !this.audioContext || !this.gainNode) {
      return;
    }

    if (this.audioQueue.length === 0) {
      return;
    }

    this.isScheduling = true;

    // 如果之前没有在播放，通知开始播放
    if (!this.isCurrentlyPlaying) {
      this.isCurrentlyPlaying = true;
      this.nextPlayTime = this.audioContext.currentTime;
      this.callbacks.onPlaybackStart();
    }

    // 处理队列中的所有音频块
    while (this.audioQueue.length > 0) {
      const pcmData = this.audioQueue.shift();
      if (!pcmData) {
        continue;
      }

      try {
        this.scheduleAudioChunk(pcmData);
      } catch (error) {
        logger.error('调度音频失败:', error);
      }
    }

    this.isScheduling = false;
  }

  /**
   * 调度单个音频块播放
   * 
   * @param pcmData - 16 位小端序 PCM 音频数据
   */
  private scheduleAudioChunk(pcmData: ArrayBuffer): void {
    if (!this.audioContext || !this.gainNode) {
      return;
    }

    // 将 16 位 PCM 转换为 Float32
    const float32Data = this.convertPcm16ToFloat32(pcmData);

    // 创建音频缓冲区
    const audioBuffer = this.audioContext.createBuffer(
      1, // 单声道
      float32Data.length,
      this.sampleRate
    );

    // 填充音频数据
    audioBuffer.copyToChannel(float32Data, 0);

    // 创建音频源节点
    const sourceNode = this.audioContext.createBufferSource();
    sourceNode.buffer = audioBuffer;

    // 连接到增益节点
    sourceNode.connect(this.gainNode);

    // 确保播放时间不早于当前时间
    const currentTime = this.audioContext.currentTime;
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime;
    }

    // 调度播放
    sourceNode.start(this.nextPlayTime);
    
    // 更新下一个播放时间
    this.nextPlayTime += audioBuffer.duration;

    // 保存源节点引用
    this.scheduledSources.push(sourceNode);

    // 播放结束时清理
    sourceNode.onended = () => {
      const index = this.scheduledSources.indexOf(sourceNode);
      if (index > -1) {
        this.scheduledSources.splice(index, 1);
      }

      // 如果没有更多调度的音频且队列为空，通知播放结束
      if (this.scheduledSources.length === 0 && this.audioQueue.length === 0) {
        this.isCurrentlyPlaying = false;
        this.callbacks.onPlaybackEnd();
      }
    };
  }

  /**
   * 停止播放并清空队列
   * Requirements: 4.3
   */
  stop(): void {
    // 停止所有调度的音频源
    for (const sourceNode of this.scheduledSources) {
      try {
        sourceNode.stop();
        sourceNode.disconnect();
      } catch {
        // 忽略已停止的错误
      }
    }
    this.scheduledSources = [];

    // 清空队列
    this.audioQueue = [];
    this.isScheduling = false;

    // 重置播放时间
    this.nextPlayTime = 0;

    // 更新播放状态
    if (this.isCurrentlyPlaying) {
      this.isCurrentlyPlaying = false;
      this.callbacks.onPlaybackEnd();
    }

    // 通知电平归零
    this.callbacks.onLevelChange(0);
  }

  /**
   * 设置音量
   * Requirements: 4.2
   * 
   * @param volume - 音量值（0-1）
   */
  setVolume(volume: number): void {
    // 限制音量范围
    this.volume = Math.max(0, Math.min(1, volume));

    // 如果增益节点已创建，立即应用音量
    if (this.gainNode) {
      this.gainNode.gain.value = this.volume;
    }
  }

  /**
   * 获取当前音量
   * Requirements: 4.2
   * 
   * @returns 当前音量值（0-1）
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * 是否正在播放
   * Requirements: 4.4
   * 
   * @returns 是否正在播放音频
   */
  isPlaying(): boolean {
    return this.isCurrentlyPlaying;
  }

  /**
   * 销毁服务，释放资源
   */
  destroy(): void {
    this.stop();
    this.stopLevelUpdates();

    if (this.gainNode) {
      this.gainNode.disconnect();
      this.gainNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // 忽略关闭错误
      });
      this.audioContext = null;
    }
  }

  /**
   * 将 16 位 PCM 数据转换为 Float32 格式
   * Requirements: 4.1
   * 
   * @param pcmData - 16 位小端序 PCM 数据
   * @returns Float32Array 格式的音频数据
   */
  convertPcm16ToFloat32(pcmData: ArrayBuffer): Float32Array {
    const view = new DataView(pcmData);
    const numSamples = pcmData.byteLength / 2;
    const float32Data = new Float32Array(numSamples);

    for (let i = 0; i < numSamples; i++) {
      // 读取 16 位小端序整数
      const int16Sample = view.getInt16(i * 2, true);
      
      // 转换为 -1 到 1 的浮点数
      float32Data[i] = int16Sample < 0 
        ? int16Sample / 0x8000 
        : int16Sample / 0x7FFF;
    }

    return float32Data;
  }

  /**
   * 启动音频电平更新
   * Requirements: 4.4
   */
  private startLevelUpdates(): void {
    this.stopLevelUpdates();

    // 每 50ms 更新一次音频电平
    this.levelUpdateInterval = window.setInterval(() => {
      if (!this.isCurrentlyPlaying || !this.analyserNode) {
        this.callbacks.onLevelChange(0);
        return;
      }

      const level = this.calculateLevel();
      this.callbacks.onLevelChange(level);
    }, 50);
  }

  /**
   * 停止音频电平更新
   */
  private stopLevelUpdates(): void {
    if (this.levelUpdateInterval !== null) {
      clearInterval(this.levelUpdateInterval);
      this.levelUpdateInterval = null;
    }
  }

  /**
   * 计算当前音频电平
   * Requirements: 4.4
   * 
   * @returns 0-1 范围的音频电平值
   */
  private calculateLevel(): number {
    if (!this.analyserNode) {
      return 0;
    }

    const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);
    this.analyserNode.getByteFrequencyData(dataArray);

    // 计算平均值
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i] ?? 0;
    }
    const average = sum / dataArray.length;

    // 归一化到 0-1 范围
    return average / 255;
  }
}
