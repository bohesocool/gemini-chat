/**
 * 屏幕捕获服务
 * 使用 getDisplayMedia API 捕获屏幕内容，定期截取帧并编码为 JPEG 图片
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.1, 7.2, 7.3, 7.4
 */

import type {
  ScreenShareConfig,
  ScreenCaptureCallbacks,
  ScreenCaptureState,
} from '../../types/liveApi';
import { ScreenCaptureError } from './errors';

/**
 * 屏幕捕获服务类
 * 负责调用 getDisplayMedia() 获取屏幕媒体流，
 * 通过 Canvas 定期截取帧并编码为 JPEG Base64 字符串。
 * 遵循 AudioCaptureService 的设计模式，通过回调函数与外部通信。
 */
export class ScreenCaptureService {
  /** 屏幕共享配置 */
  private config: ScreenShareConfig;
  /** 回调函数集合 */
  private callbacks: ScreenCaptureCallbacks;
  /** 当前捕获状态 */
  private state: ScreenCaptureState = 'inactive';
  /** 屏幕媒体流 */
  private mediaStream: MediaStream | null = null;
  /** 隐藏的 video 元素，用于播放媒体流 */
  private videoElement: HTMLVideoElement | null = null;
  /** 隐藏的 canvas 元素，用于截取帧 */
  private canvasElement: HTMLCanvasElement | null = null;
  /** canvas 2D 渲染上下文 */
  private canvasContext: CanvasRenderingContext2D | null = null;
  /** 定时截帧的定时器 ID */
  private captureInterval: ReturnType<typeof setInterval> | null = null;
  /** 最新截取的帧数据（Base64 编码的 JPEG） */
  private latestFrame: string | null = null;

  constructor(config: ScreenShareConfig, callbacks: ScreenCaptureCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * 请求屏幕共享并开始截帧
   * Requirements: 1.1, 1.2, 1.3, 7.1, 7.2
   *
   * 流程：
   * 1. 检查浏览器是否支持 getDisplayMedia
   * 2. 调用 getDisplayMedia() 获取屏幕媒体流
   * 3. 创建隐藏的 video 和 canvas 元素
   * 4. 监听媒体流轨道结束事件
   * 5. 启动定时截帧
   */
  async start(): Promise<void> {
    // 如果已经在捕获中，直接返回
    if (this.state !== 'inactive') {
      return;
    }

    // 检查浏览器是否支持 getDisplayMedia API
    // Requirements: 7.2
    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getDisplayMedia
    ) {
      const error = new ScreenCaptureError(
        '当前浏览器不支持屏幕共享功能'
      );
      this.callbacks.onError(error);
      return;
    }

    try {
      // 请求屏幕共享权限并获取媒体流
      // Requirements: 1.1
      this.mediaStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      // 创建隐藏的 video 元素用于播放媒体流
      this.videoElement = document.createElement('video');
      this.videoElement.srcObject = this.mediaStream;
      this.videoElement.muted = true;
      this.videoElement.playsInline = true;
      // 隐藏 video 元素，不添加到 DOM 中
      this.videoElement.style.display = 'none';

      // 等待 video 元素加载元数据后开始播放
      await this.videoElement.play();

      // 创建隐藏的 canvas 元素用于截取帧
      this.canvasElement = document.createElement('canvas');
      this.canvasContext = this.canvasElement.getContext('2d');

      if (!this.canvasContext) {
        throw new ScreenCaptureError('无法创建 Canvas 2D 上下文');
      }

      // 监听媒体流轨道结束事件（用户通过浏览器原生 UI 停止共享）
      // Requirements: 1.5, 7.4
      const videoTrack = this.mediaStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          this.handleTrackEnded();
        };
      }

      // 更新状态为捕获中
      this.state = 'capturing';

      // 通知外部屏幕共享已开始
      this.callbacks.onStart();

      // 启动定时截帧
      // Requirements: 1.2
      this.startCapturing();
    } catch (error) {
      // 处理用户拒绝权限或其他错误
      // Requirements: 7.1
      this.cleanup();

      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        // 用户拒绝了屏幕共享权限
        const captureError = new ScreenCaptureError(
          '屏幕共享权限被拒绝，请在浏览器设置中允许'
        );
        this.callbacks.onError(captureError);
      } else if (error instanceof ScreenCaptureError) {
        this.callbacks.onError(error);
      } else if (error instanceof Error) {
        const captureError = new ScreenCaptureError(
          `屏幕捕获失败: ${error.message}`
        );
        this.callbacks.onError(captureError);
      } else {
        const captureError = new ScreenCaptureError('屏幕捕获发生未知错误');
        this.callbacks.onError(captureError);
      }
    }
  }

  /**
   * 停止屏幕共享并释放所有资源
   * Requirements: 1.4
   */
  stop(): void {
    if (this.state === 'inactive') {
      return;
    }

    this.cleanup();
    this.state = 'inactive';
    this.callbacks.onStop();
  }

  /**
   * 获取当前捕获状态
   */
  getState(): ScreenCaptureState {
    return this.state;
  }

  /**
   * 获取最新截取的帧数据（用于 UI 预览）
   * @returns Base64 编码的 JPEG 图片数据，如果没有帧则返回 null
   */
  getLatestFrame(): string | null {
    return this.latestFrame;
  }

  /**
   * 启动定时截帧
   * 按照配置的帧率定期截取屏幕帧
   * Requirements: 1.2
   */
  private startCapturing(): void {
    // 清除可能存在的旧定时器
    this.stopCapturing();

    // 根据帧率计算截帧间隔（毫秒）
    const intervalMs = Math.round(1000 / this.config.fps);

    this.captureInterval = setInterval(() => {
      this.captureFrame();
    }, intervalMs);
  }

  /**
   * 停止定时截帧
   */
  private stopCapturing(): void {
    if (this.captureInterval !== null) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
    }
  }

  /**
   * 截取一帧屏幕
   * 将 video 帧绘制到 canvas，按配置缩放并编码为 JPEG Base64
   * Requirements: 1.3, 7.3
   */
  private captureFrame(): void {
    try {
      if (
        !this.videoElement ||
        !this.canvasElement ||
        !this.canvasContext ||
        this.state !== 'capturing'
      ) {
        return;
      }

      // 获取视频的原始尺寸
      const videoWidth = this.videoElement.videoWidth;
      const videoHeight = this.videoElement.videoHeight;

      // 如果视频尺寸为 0，说明还没有准备好
      if (videoWidth === 0 || videoHeight === 0) {
        return;
      }

      // 计算缩放后的尺寸，保持宽高比
      const { width, height } = this.calculateScaledDimensions(
        videoWidth,
        videoHeight,
        this.config.maxWidth,
        this.config.maxHeight
      );

      // 设置 canvas 尺寸
      this.canvasElement.width = width;
      this.canvasElement.height = height;

      // 将 video 帧绘制到 canvas（缩放）
      this.canvasContext.drawImage(this.videoElement, 0, 0, width, height);

      // 编码为 JPEG Base64 字符串
      // Requirements: 1.3
      const dataUrl = this.canvasElement.toDataURL(
        'image/jpeg',
        this.config.quality
      );

      // 提取纯 Base64 数据（去掉 data:image/jpeg;base64, 前缀）
      const base64Data = dataUrl.split(',')[1];

      if (base64Data) {
        // 更新最新帧
        this.latestFrame = base64Data;

        // 通过回调通知外部新帧已截取
        this.callbacks.onFrame(base64Data);
      }
    } catch (error) {
      // 帧截取异常时记录日志并继续下一帧（容错）
      // Requirements: 7.3
      console.warn(
        '[ScreenCaptureService] 帧截取异常，将继续下一帧:',
        error
      );
    }
  }

  /**
   * 计算缩放后的尺寸，保持宽高比
   * 根据 maxWidth 和 maxHeight 限制，等比缩放
   *
   * @param srcWidth - 源宽度
   * @param srcHeight - 源高度
   * @param maxWidth - 最大宽度限制
   * @param maxHeight - 最大高度限制
   * @returns 缩放后的宽度和高度
   */
  calculateScaledDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // 如果源尺寸在限制范围内，直接返回
    if (srcWidth <= maxWidth && srcHeight <= maxHeight) {
      return { width: srcWidth, height: srcHeight };
    }

    // 计算宽度和高度的缩放比例
    const widthRatio = maxWidth / srcWidth;
    const heightRatio = maxHeight / srcHeight;

    // 取较小的缩放比例，确保两个维度都不超过限制
    const scale = Math.min(widthRatio, heightRatio);

    return {
      width: Math.round(srcWidth * scale),
      height: Math.round(srcHeight * scale),
    };
  }

  /**
   * 处理媒体流轨道结束事件
   * 当用户通过浏览器原生 UI 停止屏幕共享时触发
   * Requirements: 1.5, 7.4
   */
  private handleTrackEnded(): void {
    // 清理资源
    this.cleanup();
    this.state = 'inactive';

    // 通知外部屏幕共享已停止
    this.callbacks.onStop();
  }

  /**
   * 清理所有资源
   * 停止定时器、释放媒体流轨道、清理 DOM 元素
   */
  private cleanup(): void {
    // 停止定时截帧
    this.stopCapturing();

    // 停止媒体流的所有轨道
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.mediaStream = null;
    }

    // 清理 video 元素
    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    // 清理 canvas 元素
    this.canvasContext = null;
    this.canvasElement = null;

    // 清除最新帧数据
    this.latestFrame = null;
  }
}
