/**
 * 鉴权服务
 * 提供密码哈希、验证等功能
 * Requirements: 5.4, 5.5, 5.6, 1.1, 1.3, 1.5
 */

import { AuthConfig, getDefaultPassword, AUTH_CONFIG_KEY, isEnvPassword } from '../types/auth';
import { authLogger as logger } from './logger';
import {
  generateToken,
  verifyToken,
  saveToken,
  getToken,
  clearToken,
  isTokenExpired,
} from './jwt';

/**
 * 简单的密码哈希函数
 * 使用 SHA-256 算法对密码进行哈希
 * 注意：这是一个简化实现，生产环境应使用更安全的方案如 bcrypt
 * 
 * @param password - 原始密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * 验证密码是否匹配
 * 
 * @param inputPassword - 用户输入的密码
 * @param storedHash - 存储的密码哈希
 * @returns 密码是否匹配
 */
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  const inputHash = await hashPassword(inputPassword);
  return inputHash === storedHash;
}

/**
 * 检查两个密码是否匹配
 * 用于密码重置时验证新密码和确认密码
 * 
 * @param password - 新密码
 * @param confirmPassword - 确认密码
 * @returns 两个密码是否相等
 */
export function passwordsMatch(password: string, confirmPassword: string): boolean {
  return password === confirmPassword;
}


/**
 * 获取存储的鉴权配置
 * 
 * @returns 鉴权配置，如果不存在则返回 null
 */
export function getAuthConfig(): AuthConfig | null {
  try {
    const stored = localStorage.getItem(AUTH_CONFIG_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as AuthConfig;
  } catch (error) {
    logger.error('读取鉴权配置失败', error);
    return null;
  }
}

/**
 * 保存鉴权配置
 * 
 * @param config - 鉴权配置
 */
export function saveAuthConfig(config: AuthConfig): void {
  try {
    localStorage.setItem(AUTH_CONFIG_KEY, JSON.stringify(config));
    logger.info('鉴权配置已保存');
  } catch (error) {
    logger.error('保存鉴权配置失败', error);
  }
}

/**
 * 初始化鉴权配置
 * 如果没有配置，则使用默认密码创建配置
 * 如果使用了环境变量密码，则不需要强制重置
 * 
 * @returns 鉴权配置
 */
export async function initAuthConfig(): Promise<AuthConfig> {
  let config = getAuthConfig();
  
  if (!config) {
    // 首次使用，创建默认配置
    const defaultHash = await hashPassword(getDefaultPassword());
    config = {
      passwordHash: defaultHash,
      // 如果使用环境变量密码，则不需要强制重置
      isDefaultPassword: !isEnvPassword(),
    };
    saveAuthConfig(config);
    logger.info('已创建默认鉴权配置');
  }
  
  return config;
}

/**
 * 更新密码
 * 
 * @param newPassword - 新密码
 */
export async function updatePassword(newPassword: string): Promise<void> {
  const newHash = await hashPassword(newPassword);
  const config: AuthConfig = {
    passwordHash: newHash,
    isDefaultPassword: false,
  };
  saveAuthConfig(config);
  logger.info('密码已更新');
}

// ============ JWT Token 相关函数 ============

/**
 * 登录并生成 Token
 * 验证密码成功后生成 JWT Token 并存储到 LocalStorage
 * 需求: 1.1
 * 
 * @param password - 用户输入的密码
 * @returns 登录是否成功
 */
export async function loginWithToken(password: string): Promise<boolean> {
  try {
    const config = getAuthConfig();
    if (!config) {
      logger.error('鉴权配置不存在');
      return false;
    }

    const isValid = await verifyPassword(password, config.passwordHash);
    if (!isValid) {
      logger.warn('登录失败：密码错误');
      return false;
    }

    // 生成并存储 JWT Token
    const token = await generateToken();
    saveToken(token);
    logger.info('登录成功，JWT Token 已生成并存储');
    return true;
  } catch (error) {
    logger.error('登录过程发生错误', error);
    return false;
  }
}

/**
 * 从 Token 恢复登录状态
 * 检查 LocalStorage 中的 Token 是否有效
 * 需求: 1.3
 * 
 * @returns 是否成功恢复登录状态
 */
export async function restoreSession(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) {
      logger.info('未找到存储的 Token');
      return false;
    }

    const payload = await verifyToken(token);
    if (!payload) {
      logger.warn('Token 验证失败，清除无效 Token');
      clearToken();
      return false;
    }

    if (isTokenExpired(payload)) {
      logger.warn('Token 已过期，清除过期 Token');
      clearToken();
      return false;
    }

    logger.info('从 Token 成功恢复登录状态');
    return true;
  } catch (error) {
    logger.error('恢复登录状态时发生错误', error);
    clearToken();
    return false;
  }
}

/**
 * 登出并清除 Token
 * 需求: 1.5
 */
export function logoutWithToken(): void {
  clearToken();
  logger.info('已登出并清除 JWT Token');
}
