/**
 * Live API WebSocket 服务
 * 管理与 Gemini Live API 的 WebSocket 连接
 * Requirements: 2.2-2.6, 5.1-5.5
 */

import type {
  LiveApiServiceConfig,
  LiveApiCallbacks,
  BidiGenerateContentSetup,
  BidiGenerateContentRealtimeInput,
  BidiGenerateContentClientContent,
  BidiGenerateContentServerContent,
  SetupCompleteMessage,
  VadConfig,
  ApiStartSensitivity,
  ApiEndSensitivity,
} from '../../types/liveApi';
import { ConnectionError, LiveApiError } from './errors';
import { AUDIO_CONFIG } from '../../constants/liveApi';

/**
 * Live API WebSocket 服务类
 * 负责建立和管理与 Gemini Live API 的 WebSocket 连接
 */
export class LiveApiService {
  private config: LiveApiServiceConfig;
  private callbacks: LiveApiCallbacks;
  private websocket: WebSocket | null = null;
  private connected: boolean = false;
  private setupComplete: boolean = false;

  constructor(config: LiveApiServiceConfig, callbacks: LiveApiCallbacks) {
    this.config = config;
    this.callbacks = callbacks;
  }

  /**
   * 建立 WebSocket 连接
   * Requirements: 2.2
   */
  async connect(): Promise<void> {
    if (this.websocket) {
      throw new ConnectionError('已存在活动连接，请先断开');
    }

    return new Promise((resolve, reject) => {
      try {
        // 构建 WebSocket URL
        const wsUrl = this.buildWebSocketUrl();
        
        // 创建 WebSocket 连接
        this.websocket = new WebSocket(wsUrl);
        
        // 设置二进制类型
        this.websocket.binaryType = 'arraybuffer';

        // 连接打开事件
        this.websocket.onopen = () => {
          this.connected = true;
          
          // 发送 Setup 消息
          try {
            this.sendSetupMessage();
            this.callbacks.onOpen();
            resolve();
          } catch (error) {
            reject(error);
          }
        };

        // 消息接收事件
        this.websocket.onmessage = (event) => {
          this.handleMessage(event);
        };

        // 连接关闭事件
        this.websocket.onclose = (event) => {
          this.handleClose(event);
        };

        // 错误事件
        this.websocket.onerror = () => {
          const error = new ConnectionError('WebSocket 连接错误');
          this.callbacks.onError(error);
          if (!this.connected) {
            reject(error);
          }
        };

      } catch (error) {
        const connectionError = error instanceof Error 
          ? new ConnectionError(error.message)
          : new ConnectionError('连接失败');
        reject(connectionError);
      }
    });
  }

  /**
   * 断开 WebSocket 连接
   * Requirements: 2.4
   */
  disconnect(): void {
    if (this.websocket) {
      // 正常关闭连接
      this.websocket.close(1000, '用户主动断开');
      this.websocket = null;
    }
    this.connected = false;
    this.setupComplete = false;
  }

  /**
   * 发送实时音频输入
   * Requirements: 3.4, 5.1
   * 
   * @param audioData - PCM 格式的音频数据
   */
  sendRealtimeInput(audioData: ArrayBuffer): void {
    if (!this.isConnected()) {
      throw new LiveApiError('未连接到服务器', 'NOT_CONNECTED');
    }

    // 将 ArrayBuffer 转换为 Base64
    const base64Data = this.arrayBufferToBase64(audioData);

    const message: BidiGenerateContentRealtimeInput = {
      realtimeInput: {
        audio: {
          data: base64Data,
          mimeType: AUDIO_CONFIG.INPUT_MIME_TYPE,
        },
      },
    };

    this.sendMessage(message);
  }

  /**
   * 发送文本消息
   * Requirements: 5.2
   * 
   * @param text - 文本内容
   * @param turnComplete - 是否完成当前轮次，默认为 true
   */
  sendClientContent(text: string, turnComplete: boolean = true): void {
    if (!this.isConnected()) {
      throw new LiveApiError('未连接到服务器', 'NOT_CONNECTED');
    }

    const message: BidiGenerateContentClientContent = {
      clientContent: {
        turns: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        turnComplete,
      },
    };

    this.sendMessage(message);
  }

  /**
   * 发送活动开始信号（手动 VAD 模式）
   * Requirements: 5.3
   */
  sendActivityStart(): void {
    if (!this.isConnected()) {
      throw new LiveApiError('未连接到服务器', 'NOT_CONNECTED');
    }

    const message: BidiGenerateContentRealtimeInput = {
      realtimeInput: {
        activityStart: {},
      },
    };

    this.sendMessage(message);
  }

  /**
   * 发送活动结束信号（手动 VAD 模式）
   * Requirements: 5.4
   */
  sendActivityEnd(): void {
    if (!this.isConnected()) {
      throw new LiveApiError('未连接到服务器', 'NOT_CONNECTED');
    }

    const message: BidiGenerateContentRealtimeInput = {
      realtimeInput: {
        activityEnd: {},
      },
    };

    this.sendMessage(message);
  }

  /**
   * 发送音频流结束信号
   * Requirements: 5.5
   */
  sendAudioStreamEnd(): void {
    if (!this.isConnected()) {
      throw new LiveApiError('未连接到服务器', 'NOT_CONNECTED');
    }

    const message: BidiGenerateContentRealtimeInput = {
      realtimeInput: {
        audioStreamEnd: true,
      },
    };

    this.sendMessage(message);
  }

  /**
   * 获取连接状态
   * Requirements: 2.3
   */
  isConnected(): boolean {
    return this.connected && this.websocket !== null && this.websocket.readyState === WebSocket.OPEN;
  }

  /**
   * 获取设置是否完成
   */
  isSetupComplete(): boolean {
    return this.setupComplete;
  }

  /**
   * 构建 WebSocket URL
   * Requirements: 2.2
   * 
   * 注意：情感对话和主动音频功能需要使用 v1alpha API 版本
   * 
   * 安全说明：此处 API Key 通过 URL query 参数传递是已知的例外情况。
   * 浏览器原生 WebSocket API 不支持自定义 Header，而 Google Gemini Live API
   * 要求通过 ?key= 参数进行鉴权，这是 WebSocket 协议的固有限制，无法规避。
   * 所有 HTTP (fetch/XHR) 请求已改为通过 x-goog-api-key Header 传递密钥。
   */
  private buildWebSocketUrl(): string {
    const { apiEndpoint, apiKey, enableAffectiveDialog, enableProactiveAudio } = this.config;
    
    // 处理 API 端点
    let baseUrl = apiEndpoint || 'generativelanguage.googleapis.com';
    
    // 移除协议前缀（如果有）
    baseUrl = baseUrl.replace(/^https?:\/\//, '').replace(/^wss?:\/\//, '');
    
    // 移除尾部斜杠
    baseUrl = baseUrl.replace(/\/+$/, '');
    
    // 根据功能选择 API 版本
    // 情感对话和主动音频需要 v1alpha 版本
    const apiVersion = (enableAffectiveDialog || enableProactiveAudio) 
      ? 'v1alpha' 
      : 'v1beta';
    
    // 构建 WebSocket URL
    // Live API 使用 wss 协议
    // 注意：WebSocket 无法使用 Header 传递 API Key，此处 query 参数是唯一选择
    const wsUrl = `wss://${baseUrl}/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    
    return wsUrl;
  }

  /**
   * 发送 Setup 消息
   * Requirements: 2.2, 7.1-7.7
   */
  private sendSetupMessage(): void {
    const setupMessage = this.buildSetupMessage();
    this.sendMessage(setupMessage);
  }

  /**
   * 构建 Setup 消息
   * Requirements: 7.1-7.7
   * 注意：所有字段名使用 snake_case 格式，因为直接发送到 WebSocket API
   */
  private buildSetupMessage(): BidiGenerateContentSetup {
    const {
      model,
      responseModality,
      voiceName,
      systemInstruction,
      thinkingBudget,
      enableAffectiveDialog,
      enableProactiveAudio,
      enableInputTranscription,
      enableOutputTranscription,
      vadConfig,
    } = this.config;

    const setup: BidiGenerateContentSetup = {
      setup: {
        model: `models/${model}`,
        generation_config: {
          response_modalities: [responseModality],
        },
      },
    };

    // 添加语音配置（仅音频模态）
    if (responseModality === 'AUDIO' && voiceName) {
      setup.setup.generation_config!.speech_config = {
        voice_config: {
          prebuilt_voice_config: {
            voice_name: voiceName,
          },
        },
      };
    }

    // 添加思考配置（仅支持思考的模型）
    if (thinkingBudget && thinkingBudget > 0) {
      setup.setup.generation_config!.thinking_config = {
        thinking_budget: thinkingBudget,
        include_thoughts: true,
      };
    }

    // 添加系统指令
    if (systemInstruction && systemInstruction.trim()) {
      setup.setup.system_instruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    // 添加 VAD 配置
    if (vadConfig) {
      setup.setup.realtime_input_config = {
        automatic_activity_detection: this.buildVadConfig(vadConfig),
      };
    }

    // 添加输入转录配置
    if (enableInputTranscription) {
      setup.setup.input_audio_transcription = {};
    }

    // 添加输出转录配置
    if (enableOutputTranscription) {
      setup.setup.output_audio_transcription = {};
    }

    // 添加情感对话配置（需要 v1alpha API 版本）
    // 根据官方文档，enable_affective_dialog 应该在 generation_config 内部
    if (enableAffectiveDialog) {
      setup.setup.generation_config!.enable_affective_dialog = true;
    }

    // 添加主动音频配置（需要 v1alpha API 版本）
    // 根据官方文档，proactivity 应该在 setup 顶层，与 generation_config 同级
    if (enableProactiveAudio) {
      setup.setup.proactivity = {
        proactive_audio: true,
      };
    }

    return setup;
  }

  /**
   * 构建 VAD 配置
   * Requirements: 5.1-5.5
   * 注意：字段名使用 snake_case 格式
   */
  private buildVadConfig(vadConfig: VadConfig): {
    disabled?: boolean;
    start_of_speech_sensitivity?: ApiStartSensitivity;
    end_of_speech_sensitivity?: ApiEndSensitivity;
    silence_duration_ms?: number;
  } {
    if (!vadConfig.enabled) {
      return { disabled: true };
    }

    return {
      start_of_speech_sensitivity: this.mapStartSensitivity(vadConfig.startSensitivity),
      end_of_speech_sensitivity: this.mapEndSensitivity(vadConfig.endSensitivity),
      silence_duration_ms: vadConfig.silenceDurationMs,
    };
  }

  /**
   * 映射开始说话灵敏度
   * 注意：API 只支持 LOW 和 HIGH
   */
  private mapStartSensitivity(sensitivity: 'low' | 'high'): ApiStartSensitivity {
    const mapping: Record<string, ApiStartSensitivity> = {
      low: 'START_SENSITIVITY_LOW',
      high: 'START_SENSITIVITY_HIGH',
    };
    return mapping[sensitivity] || 'START_SENSITIVITY_LOW';
  }

  /**
   * 映射结束说话灵敏度
   * 注意：API 只支持 LOW 和 HIGH
   */
  private mapEndSensitivity(sensitivity: 'low' | 'high'): ApiEndSensitivity {
    const mapping: Record<string, ApiEndSensitivity> = {
      low: 'END_SENSITIVITY_LOW',
      high: 'END_SENSITIVITY_HIGH',
    };
    return mapping[sensitivity] || 'END_SENSITIVITY_LOW';
  }

  /**
   * 发送消息到 WebSocket
   */
  private sendMessage(message: object): void {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      throw new ConnectionError('WebSocket 未连接');
    }

    const jsonString = JSON.stringify(message);
    this.websocket.send(jsonString);
  }

  /**
   * 处理接收到的消息
   * Requirements: 4.1, 6.1, 6.2
   */
  private handleMessage(event: MessageEvent): void {
    try {
      // 解析 JSON 消息
      const data = typeof event.data === 'string' 
        ? JSON.parse(event.data) 
        : JSON.parse(new TextDecoder().decode(event.data));

      // 处理不同类型的消息
      if (this.isSetupCompleteMessage(data)) {
        this.handleSetupComplete(data);
      } else if (this.isServerContentMessage(data)) {
        this.handleServerContent(data);
      } else if ('usageMetadata' in data) {
        // 使用量元数据，可以记录但不需要特殊处理
        // console.log('Usage metadata:', data.usageMetadata);
      }
    } catch (error) {
      console.error('解析消息失败:', error);
    }
  }

  /**
   * 检查是否为设置完成消息
   */
  private isSetupCompleteMessage(data: unknown): data is SetupCompleteMessage {
    return typeof data === 'object' && data !== null && 'setupComplete' in data;
  }

  /**
   * 检查是否为服务端内容消息
   */
  private isServerContentMessage(data: unknown): data is BidiGenerateContentServerContent {
    return typeof data === 'object' && data !== null && 'serverContent' in data;
  }

  /**
   * 处理设置完成消息
   */
  private handleSetupComplete(_message: SetupCompleteMessage): void {
    this.setupComplete = true;
    this.callbacks.onSetupComplete?.();
  }

  /**
   * 处理服务端内容消息
   * Requirements: 4.1, 6.1, 6.2
   */
  private handleServerContent(message: BidiGenerateContentServerContent): void {
    const { serverContent } = message;

    // 处理中断
    if (serverContent.interrupted) {
      this.callbacks.onInterrupted();
      return;
    }

    // 处理输入转录
    if (serverContent.inputTranscription?.text) {
      this.callbacks.onInputTranscription(serverContent.inputTranscription.text);
    }

    // 处理输出转录
    if (serverContent.outputTranscription?.text) {
      this.callbacks.onOutputTranscription(serverContent.outputTranscription.text);
    }

    // 处理模型响应
    if (serverContent.modelTurn?.parts) {
      for (const part of serverContent.modelTurn.parts) {
        // 处理文本响应
        if (part.text) {
          this.callbacks.onTextData(part.text);
        }

        // 处理音频响应
        if (part.inlineData?.data) {
          const audioData = this.base64ToArrayBuffer(part.inlineData.data);
          this.callbacks.onAudioData(audioData);
        }
      }
    }

    // 处理轮次完成
    if (serverContent.turnComplete) {
      this.callbacks.onTurnComplete();
    }
  }

  /**
   * 处理连接关闭
   * Requirements: 2.4, 2.5
   */
  private handleClose(event: CloseEvent): void {
    this.connected = false;
    this.setupComplete = false;
    this.websocket = null;

    // 根据关闭代码确定原因
    let reason = '连接已关闭';
    if (event.code === 1000) {
      reason = '正常关闭';
    } else if (event.code === 1006) {
      reason = '连接异常断开';
    } else if (event.reason) {
      reason = event.reason;
    }

    this.callbacks.onClose(reason);
  }

  /**
   * 将 ArrayBuffer 转换为 Base64 字符串
   */
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i] ?? 0);
    }
    return btoa(binary);
  }

  /**
   * 将 Base64 字符串转换为 ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
