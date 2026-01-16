/**
 * 音频捕获服务
 * 使用 Web Audio API 捕获麦克风音频并转换为 PCM 格式
 * Requirements: 3.1-3.7
 */

import type { AudioCaptureCallbacks, AudioCaptureState } from '../../types/liveApi';
import { AudioDeviceError } from './errors';
import { AUDIO_CONFIG } from '../../constants/liveApi';

/**
 * 音频捕获服务类
 * 负责从麦克风捕获音频，转换为 PCM 格式，并计算音频电平
 */
export class AudioCaptureService {
  private callbacks: AudioCaptureCallbacks;
  private state: AudioCaptureState = 'inactive';
  private mediaStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private analyserNode: AnalyserNode | null = null;
  private levelUpdateInterval: number | null = null;

  // 音频配置常量
  private readonly targetSampleRate = AUDIO_CONFIG.INPUT_SAMPLE_RATE; // 16kHz
  private readonly bufferSize = 4096;

  constructor(callbacks: AudioCaptureCallbacks) {
    this.callbacks = callbacks;
  }

  /**
   * 请求麦克风权限并开始捕获
   * Requirements: 3.1, 3.2
   */
  async start(): Promise<void> {
    if (this.state !== 'inactive') {
      return;
    }

    try {
      // 请求麦克风权限
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: this.targetSampleRate,
        },
        video: false,
      });

      // 创建音频上下文
      this.audioContext = new AudioContext({
        sampleRate: this.targetSampleRate,
      });

      // 如果音频上下文被挂起，恢复它
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // 创建音频源节点
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);

      // 创建分析器节点用于计算音频电平
      this.analyserNode = this.audioContext.createAnalyser();
      this.analyserNode.fftSize = 256;
      this.analyserNode.smoothingTimeConstant = 0.3;

      // 创建处理器节点用于获取原始音频数据
      // 注意：ScriptProcessorNode 已被废弃，但 AudioWorklet 在某些环境下支持不完善
      // 为了兼容性，这里仍使用 ScriptProcessorNode
      this.processorNode = this.audioContext.createScriptProcessor(
        this.bufferSize,
        1, // 输入通道数
        1  // 输出通道数
      );

      // 连接节点
      this.sourceNode.connect(this.analyserNode);
      this.sourceNode.connect(this.processorNode);
      this.processorNode.connect(this.audioContext.destination);

      // 设置音频处理回调
      this.processorNode.onaudioprocess = this.handleAudioProcess.bind(this);

      // 启动音频电平更新
      this.startLevelUpdates();

      this.state = 'capturing';
    } catch (error) {
      this.handleError(error);
      throw error;
    }
  }

  /**
   * 停止捕获
   * Requirements: 3.2
   */
  stop(): void {
    this.stopLevelUpdates();

    // 断开并清理节点
    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.analyserNode) {
      this.analyserNode.disconnect();
      this.analyserNode = null;
    }

    // 关闭音频上下文
    if (this.audioContext) {
      this.audioContext.close().catch(() => {
        // 忽略关闭错误
      });
      this.audioContext = null;
    }

    // 停止媒体流
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }

    this.state = 'inactive';
    
    // 通知电平归零
    this.callbacks.onLevelChange(0);
  }

  /**
   * 暂停捕获（静音）
   * Requirements: 3.6
   */
  pause(): void {
    if (this.state !== 'capturing') {
      return;
    }

    // 暂停媒体流轨道
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = false;
      });
    }

    this.state = 'paused';
    
    // 通知电平归零
    this.callbacks.onLevelChange(0);
  }

  /**
   * 恢复捕获
   * Requirements: 3.6
   */
  resume(): void {
    if (this.state !== 'paused') {
      return;
    }

    // 恢复媒体流轨道
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach(track => {
        track.enabled = true;
      });
    }

    this.state = 'capturing';
  }

  /**
   * 获取当前状态
   */
  getState(): AudioCaptureState {
    return this.state;
  }

  /**
   * 处理音频数据
   * Requirements: 3.3, 3.4
   */
  private handleAudioProcess(event: AudioProcessingEvent): void {
    if (this.state !== 'capturing') {
      return;
    }

    const inputData = event.inputBuffer.getChannelData(0);
    
    // 转换为 16 位 PCM 格式
    const pcmData = this.convertToPcm16(inputData);
    
    // 发送音频数据
    this.callbacks.onAudioData(pcmData);
  }

  /**
   * 将 Float32Array 音频数据转换为 16 位 PCM ArrayBuffer
   * Requirements: 3.3
   * 
   * @param float32Data - 输入的浮点音频数据（范围 -1 到 1）
   * @returns 16 位小端序 PCM 数据
   */
  convertToPcm16(float32Data: Float32Array): ArrayBuffer {
    const pcmData = new ArrayBuffer(float32Data.length * 2);
    const view = new DataView(pcmData);

    for (let i = 0; i < float32Data.length; i++) {
      // 将 -1 到 1 的浮点数转换为 -32768 到 32767 的整数
      let sample = float32Data[i];
      
      // 限制范围
      sample = Math.max(-1, Math.min(1, sample ?? 0));
      
      // 转换为 16 位整数
      const int16Sample = sample < 0 
        ? sample * 0x8000 
        : sample * 0x7FFF;
      
      // 写入小端序
      view.setInt16(i * 2, int16Sample, true);
    }

    return pcmData;
  }

  /**
   * 启动音频电平更新
   * Requirements: 3.5
   */
  private startLevelUpdates(): void {
    this.stopLevelUpdates();

    // 每 50ms 更新一次音频电平
    this.levelUpdateInterval = window.setInterval(() => {
      if (this.state !== 'capturing' || !this.analyserNode) {
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
   * Requirements: 3.5
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

  /**
   * 处理错误
   * Requirements: 3.7, 8.2
   */
  private handleError(error: unknown): void {
    let audioError: AudioDeviceError;

    if (error instanceof DOMException) {
      switch (error.name) {
        case 'NotAllowedError':
          audioError = new AudioDeviceError('麦克风权限被拒绝，请在浏览器设置中允许访问麦克风');
          break;
        case 'NotFoundError':
          audioError = new AudioDeviceError('未找到麦克风设备，请检查设备连接');
          break;
        case 'NotReadableError':
          audioError = new AudioDeviceError('无法访问麦克风，可能被其他应用占用');
          break;
        case 'OverconstrainedError':
          audioError = new AudioDeviceError('麦克风不支持所需的音频格式');
          break;
        default:
          audioError = new AudioDeviceError(`音频设备错误: ${error.message}`);
      }
    } else if (error instanceof Error) {
      audioError = new AudioDeviceError(`音频捕获错误: ${error.message}`);
    } else {
      audioError = new AudioDeviceError('未知音频错误');
    }

    this.callbacks.onError(audioError);
  }
}
