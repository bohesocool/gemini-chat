/**
 * 日志服务
 * 提供统一的日志输出功能，支持不同级别和模块标识
 */

// 日志级别类型
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// 日志级别优先级（数字越大优先级越高）
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

// 日志级别显示名称
const LOG_LEVEL_NAMES: Record<LogLevel, string> = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

// console 方法映射表，替代 switch 语句
// 使用 .bind(console) 确保 this 指向正确
const CONSOLE_METHODS: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

// 日志配置
interface LoggerConfig {
  /** 最小日志级别，低于此级别的日志不会输出 */
  minLevel: LogLevel;
  /** 是否启用日志 */
  enabled: boolean;
  /** 模块过滤列表，为空或未设置时输出所有模块 */
  moduleFilter?: string[];
}

/**
 * 获取环境感知的默认配置
 * 开发环境默认 debug，生产环境默认 warn
 */
function getDefaultConfig(): LoggerConfig {
  const isProd = typeof import.meta !== 'undefined'
    && import.meta.env?.PROD === true;
  return {
    minLevel: isProd ? 'warn' : 'debug',
    enabled: true,
  };
}

// 默认配置（通过环境检测初始化）
const defaultConfig: LoggerConfig = getDefaultConfig();

// 当前配置
let currentConfig: LoggerConfig = { ...defaultConfig };

/**
 * 格式化当前时间
 * 格式：YYYY-MM-DD HH:mm:ss
 */
function formatTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * 格式化日志消息
 * 格式：[时间] [级别] [模块] 消息
 */
function formatMessage(level: LogLevel, module: string, message: string): string {
  return `[${formatTime()}] [${LOG_LEVEL_NAMES[level]}] [${module}] ${message}`;
}

/**
 * 格式化附加数据
 * 对象类型数据通过 JSON.parse(JSON.stringify()) 序列化，序列化失败时回退到原始数据
 */
function formatData(data: unknown): unknown {
  if (data === undefined) return undefined;
  if (typeof data === 'object' && data !== null) {
    try {
      return JSON.parse(JSON.stringify(data));
    } catch {
      return data; // 序列化失败时回退到原始数据
    }
  }
  return data;
}

/**
 * 检查是否应该输出该级别的日志
 * 支持模块过滤：过滤列表非空时仅输出列表中模块的日志
 */
function shouldLog(level: LogLevel, module?: string): boolean {
  if (!currentConfig.enabled) return false;
  if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[currentConfig.minLevel]) return false;
  if (module && currentConfig.moduleFilter && currentConfig.moduleFilter.length > 0) {
    return currentConfig.moduleFilter.includes(module);
  }
  return true;
}

/**
 * 输出日志
 * 使用映射表查找对应的 console 方法，附加数据通过 formatData 序列化
 */
function log(level: LogLevel, module: string, message: string, data?: unknown): void {
  if (!shouldLog(level, module)) return;

  const formattedMessage = formatMessage(level, module, message);
  const method = CONSOLE_METHODS[level];
  const formattedData = formatData(data);

  if (formattedData !== undefined) {
    method(formattedMessage, formattedData);
  } else {
    method(formattedMessage);
  }
}

/**
 * 日志服务接口
 */
export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  // 新增：日志分组
  group(label: string): void;
  groupEnd(): void;
  // 新增：性能计时
  time(label: string): void;
  timeEnd(label: string): void;
}

/**
 * 创建指定模块的日志记录器
 * @param module 模块名称
 * @returns 日志记录器实例
 */
export function createLogger(module: string): Logger {
  return {
    debug: (message: string, data?: unknown) => log('debug', module, message, data),
    info: (message: string, data?: unknown) => log('info', module, message, data),
    warn: (message: string, data?: unknown) => log('warn', module, message, data),
    error: (message: string, data?: unknown) => log('error', module, message, data),
    // 日志分组：enabled 为 false 时不执行任何操作
    group: (label: string) => {
      if (!currentConfig.enabled) return;
      console.group(label);
    },
    groupEnd: () => {
      if (!currentConfig.enabled) return;
      console.groupEnd();
    },
    // 性能计时：在标签前添加 [模块名] 前缀，避免不同模块间的标签冲突
    time: (label: string) => {
      if (!currentConfig.enabled) return;
      console.time(`[${module}] ${label}`);
    },
    timeEnd: (label: string) => {
      if (!currentConfig.enabled) return;
      console.timeEnd(`[${module}] ${label}`);
    },
  };
}

/**
 * 配置日志服务
 * @param config 部分配置项
 */
export function configureLogger(config: Partial<LoggerConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * 重置日志配置为默认值
 */
export function resetLoggerConfig(): void {
  currentConfig = { ...defaultConfig };
}

/**
 * 获取当前日志配置
 */
export function getLoggerConfig(): LoggerConfig {
  return { ...currentConfig };
}

// 预定义的模块日志记录器
export const appLogger = createLogger('App');
export const apiLogger = createLogger('API');
export const storeLogger = createLogger('Store');
export const storageLogger = createLogger('Storage');
export const authLogger = createLogger('Auth');
