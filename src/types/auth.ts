/**
 * 鉴权相关类型定义
 * Requirements: 5.1
 */

/**
 * 鉴权状态
 * 用于管理用户的登录状态和密码重置状态
 */
export interface AuthState {
  /** 是否已登录 */
  isAuthenticated: boolean;
  /** 是否需要重置密码（使用默认密码时） */
  needsPasswordReset: boolean;
}

/**
 * 鉴权配置
 * 存储在 LocalStorage 中的密码配置
 */
export interface AuthConfig {
  /** 密码哈希值 */
  passwordHash: string;
  /** 是否为默认密码 */
  isDefaultPassword: boolean;
}

/**
 * 判断是否在 Electron 环境中运行
 */
export const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
    'electronAPI' in window && 
    (window as { electronAPI?: unknown }).electronAPI !== undefined;
};

/**
 * 默认密码（当环境变量未设置时使用）
 */
export const FALLBACK_PASSWORD = 'adminiadmin';

/**
 * 从环境变量获取密码（构建时）或从 window 配置获取（运行时）
 */
export const getEnvPassword = (): string | undefined => {
  // 优先从 window 配置读取（Docker 运行时注入）
  if (typeof window !== 'undefined') {
    const appConfig = (window as { __APP_CONFIG__?: { AUTH_PASSWORD?: string } }).__APP_CONFIG__;
    if (appConfig?.AUTH_PASSWORD) {
      return appConfig.AUTH_PASSWORD;
    }
  }
  // 其次从 Vite 环境变量读取（构建时注入）
  return import.meta.env.VITE_AUTH_PASSWORD as string | undefined;
};

/**
 * 获取实际使用的密码
 */
export const getDefaultPassword = (): string => {
  return getEnvPassword() || FALLBACK_PASSWORD;
};

/**
 * 是否使用了环境变量密码
 */
export const isEnvPassword = (): boolean => {
  return !!getEnvPassword();
};

/**
 * LocalStorage 中存储鉴权配置的键名
 */
export const AUTH_CONFIG_KEY = 'gemini-chat-auth-config';
