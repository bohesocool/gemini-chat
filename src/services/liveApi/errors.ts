/**
 * Live API 错误类型定义和处理函数
 * Requirements: 8.1-8.5
 */

/**
 * Live API 基础错误类
 * 所有 Live API 相关错误的基类
 */
export class LiveApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'LiveApiError';
  }
}

/**
 * 连接错误类
 * 用于 WebSocket 连接失败或断开的情况
 * Requirements: 8.1
 */
export class ConnectionError extends LiveApiError {
  constructor(message: string, isRetryable: boolean = true) {
    super(message, 'CONNECTION_ERROR', isRetryable);
    this.name = 'ConnectionError';
  }
}

/**
 * 音频设备错误类
 * 用于麦克风权限被拒绝或设备不可用的情况
 * Requirements: 8.2
 */
export class AudioDeviceError extends LiveApiError {
  constructor(message: string) {
    super(message, 'AUDIO_DEVICE_ERROR', false);
    this.name = 'AudioDeviceError';
  }
}

/**
 * 会话超时错误类
 * 用于会话超过时间限制的情况（音频15分钟/音视频2分钟）
 * Requirements: 8.4
 */
export class SessionTimeoutError extends LiveApiError {
  public sessionType: 'audio' | 'video';
  
  constructor(sessionType: 'audio' | 'video') {
    const duration = sessionType === 'audio' ? '15分钟' : '2分钟';
    super(`会话已超时（${duration}限制）`, 'SESSION_TIMEOUT', true);
    this.name = 'SessionTimeoutError';
    this.sessionType = sessionType;
  }
}

/**
 * 错误消息映射 - 将技术错误代码转换为用户友好的中文提示
 * Requirements: 8.3
 */
export const ERROR_MESSAGES: Record<string, string> = {
  // 麦克风权限相关
  'PERMISSION_DENIED': '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风',
  'NotAllowedError': '麦克风权限被拒绝，请在浏览器设置中允许访问麦克风',
  
  // 设备相关
  'NOT_FOUND': '未找到麦克风设备，请检查设备连接',
  'NotFoundError': '未找到麦克风设备，请检查设备连接',
  'NOT_READABLE': '无法访问麦克风，可能被其他应用占用',
  'NotReadableError': '无法访问麦克风，可能被其他应用占用',
  'OverconstrainedError': '麦克风不支持所需的音频格式',
  
  // WebSocket 相关
  'WEBSOCKET_CLOSED': '连接已断开，请重新连接',
  'WEBSOCKET_ERROR': 'WebSocket 连接发生错误',
  'CONNECTION_TIMEOUT': '连接超时，请检查网络后重试',
  
  // API 相关
  'INVALID_API_KEY': 'API 密钥无效，请检查设置',
  'QUOTA_EXCEEDED': 'API 配额已用尽，请稍后重试',
  'MODEL_NOT_FOUND': '模型不可用，请选择其他模型',
  'RATE_LIMITED': '请求过于频繁，请稍后重试',
  'INVALID_REQUEST': '请求格式无效，请检查配置',
  
  // 网络相关
  'NETWORK_ERROR': '网络连接失败，请检查网络设置',
  'NETWORK_UNSTABLE': '网络不稳定，可能影响通话质量',
  
  // 会话相关
  'SESSION_TIMEOUT': '会话已超时，请重新连接',
  'SESSION_EXPIRED': '会话已过期，请重新开始',
  
  // 音频相关
  'AUDIO_CONTEXT_ERROR': '音频系统初始化失败，请刷新页面重试',
  'AUDIO_PLAYBACK_ERROR': '音频播放失败',
  'AUDIO_CAPTURE_ERROR': '音频捕获失败',
};

/**
 * 安全地从 ERROR_MESSAGES 中获取映射的消息
 * 使用 Object.prototype.hasOwnProperty 避免原型链污染问题
 * 
 * @param key - 错误代码
 * @returns 映射的消息或 undefined
 */
function getErrorMessage(key: string): string | undefined {
  if (Object.prototype.hasOwnProperty.call(ERROR_MESSAGES, key)) {
    return ERROR_MESSAGES[key];
  }
  return undefined;
}

/**
 * 获取用户友好的错误消息
 * 将技术错误转换为用户可理解的中文提示
 * Requirements: 8.3
 * 
 * @param error - 错误对象或错误代码字符串
 * @returns 用户友好的中文错误消息
 */
export function getFriendlyErrorMessage(error: Error | string): string {
  // 如果是字符串，直接查找映射
  if (typeof error === 'string') {
    const mappedMessage = getErrorMessage(error);
    return mappedMessage || `发生错误: ${error}`;
  }
  
  // 如果是 LiveApiError，使用其 code 查找
  if (error instanceof LiveApiError) {
    const mappedMessage = getErrorMessage(error.code);
    if (mappedMessage) {
      return mappedMessage;
    }
    // 如果没有映射，返回原始消息
    return error.message;
  }
  
  // 对于其他 Error 类型，尝试用 name 或 message 查找
  const errorName = error.name;
  const errorMessage = error.message;
  
  // 先尝试用 error.name 查找
  if (errorName) {
    const mappedByName = getErrorMessage(errorName);
    if (mappedByName) {
      return mappedByName;
    }
  }
  
  // 再尝试用 error.message 查找
  if (errorMessage) {
    const mappedByMessage = getErrorMessage(errorMessage);
    if (mappedByMessage) {
      return mappedByMessage;
    }
  }
  
  // 检查消息中是否包含已知的错误关键词
  for (const [key, value] of Object.entries(ERROR_MESSAGES)) {
    if (errorMessage && errorMessage.includes(key)) {
      return value;
    }
  }
  
  // 如果都没找到，返回通用错误消息
  return `发生错误: ${errorMessage || '未知错误'}`;
}
