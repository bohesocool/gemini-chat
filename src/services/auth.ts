/**
 * 鉴权服务
 * 提供密码哈希、验证等功能
 * Requirements: 5.4, 5.5, 5.6, 1.1, 1.3, 1.5
 */

import { AuthConfig, getDefaultPassword, AUTH_CONFIG_KEY, getEnvPassword, getEnvPasswordHash } from '../types/auth';
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
 * 检查 crypto.subtle 是否可用
 * crypto.subtle 只在安全上下文（HTTPS 或 localhost）中可用
 */
function isCryptoSubtleAvailable(): boolean {
  return typeof crypto !== 'undefined' && 
         typeof crypto.subtle !== 'undefined' && 
         typeof crypto.subtle.digest === 'function';
}

/**
 * 纯 JavaScript 实现的简单哈希函数
 * 当 crypto.subtle 不可用时使用（非 HTTPS 环境）
 * 注意：这不是加密安全的哈希，仅用于本地应用的简单密码验证
 * 
 * @param str - 要哈希的字符串
 * @returns 哈希后的字符串
 */
function simpleHash(str: string): string {
  let hash = 0;
  const prime = 31;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
    hash = Math.imul(hash, prime) | 0;
  }
  // 转换为正数并返回十六进制字符串
  const positiveHash = hash >>> 0;
  // 添加额外的混淆以增加哈希长度
  const hash2 = simpleHashRound(str + positiveHash.toString());
  return positiveHash.toString(16).padStart(8, '0') + hash2.toString(16).padStart(8, '0');
}

/**
 * 辅助哈希轮次
 */
function simpleHashRound(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
}

/**
 * 简单的密码哈希函数
 * 使用 SHA-256 算法对密码进行哈希
 * 当 crypto.subtle 不可用时（非 HTTPS 环境），使用简单的 JavaScript 哈希
 * 注意：这是一个简化实现，生产环境应使用更安全的方案如 bcrypt
 * 
 * @param password - 原始密码
 * @returns 哈希后的密码字符串
 */
export async function hashPassword(password: string): Promise<string> {
  // 检查 crypto.subtle 是否可用
  if (!isCryptoSubtleAvailable()) {
    logger.warn('crypto.subtle 不可用（非安全上下文），使用简单哈希');
    return simpleHash(password);
  }
  
  try {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  } catch (error) {
    // 如果 crypto.subtle 调用失败，回退到简单哈希
    logger.warn('crypto.subtle 调用失败，回退到简单哈希', error);
    return simpleHash(password);
  }
}

/**
 * 验证密码是否匹配
 * 支持两种哈希格式：
 * 1. SHA-256（64位十六进制，Docker 环境）
 * 2. simpleHash（16位十六进制，非 HTTPS 环境）
 * 
 * @param inputPassword - 用户输入的密码
 * @param storedHash - 存储的密码哈希
 * @returns 密码是否匹配
 */
export async function verifyPassword(inputPassword: string, storedHash: string): Promise<boolean> {
  // 检查存储的哈希是否为 SHA-256 格式（64位十六进制）
  const isSha256 = /^[a-f0-9]{64}$/i.test(storedHash);
  
  if (isSha256) {
    // Docker 环境：使用 SHA-256 验证
    const inputHash = await hashPasswordSha256(inputPassword);
    return inputHash === storedHash;
  } else {
    // 本地环境：使用当前环境的哈希方法
    const inputHash = await hashPassword(inputPassword);
    return inputHash === storedHash;
  }
}

/**
 * 强制使用 SHA-256 计算哈希
 * 用于 Docker 环境下的密码验证
 */
async function hashPasswordSha256(password: string): Promise<string> {
  // 优先使用 crypto.subtle
  if (isCryptoSubtleAvailable()) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      logger.warn('crypto.subtle SHA-256 失败，使用 JS 实现', error);
    }
  }
  
  // 回退：使用纯 JavaScript 实现的 SHA-256
  return jsSha256(password);
}

/**
 * 纯 JavaScript 实现的 SHA-256
 * 当 crypto.subtle 不可用时使用（HTTP 环境）
 */
function jsSha256(message: string): string {
  // SHA-256 常量
  const K: number[] = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // 初始哈希值
  let H: number[] = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
    0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
  ];

  // 将消息转换为字节数组
  const encoder = new TextEncoder();
  const msgBytes = encoder.encode(message);
  const msgLen = msgBytes.length;
  const bitLen = msgLen * 8;

  // 正确的填充计算：消息 + 1字节(0x80) + 填充 + 8字节(长度) 必须是64的倍数
  const padLen = (64 - ((msgLen + 9) % 64)) % 64;
  const paddedLen = msgLen + 1 + padLen + 8;
  
  const padded = new Uint8Array(paddedLen);
  padded.set(msgBytes);
  padded[msgLen] = 0x80;
  
  // 添加长度（大端序，64位）
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, 0, false); // 高32位
  view.setUint32(paddedLen - 4, bitLen, false); // 低32位

  // 辅助函数
  const rotr = (x: number, n: number): number => (x >>> n) | (x << (32 - n));
  const ch = (x: number, y: number, z: number): number => (x & y) ^ (~x & z);
  const maj = (x: number, y: number, z: number): number => (x & y) ^ (x & z) ^ (y & z);
  const sigma0 = (x: number): number => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
  const sigma1 = (x: number): number => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
  const gamma0 = (x: number): number => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
  const gamma1 = (x: number): number => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);

  // 处理每个 512 位块
  for (let i = 0; i < paddedLen; i += 64) {
    const W: number[] = new Array(64);
    const block = new DataView(padded.buffer, i, 64);

    // 准备消息调度
    for (let t = 0; t < 16; t++) {
      W[t] = block.getUint32(t * 4, false);
    }
    for (let t = 16; t < 64; t++) {
      W[t] = (gamma1(W[t - 2]!) + W[t - 7]! + gamma0(W[t - 15]!) + W[t - 16]!) >>> 0;
    }

    // 初始化工作变量
    let a = H[0]!;
    let b = H[1]!;
    let c = H[2]!;
    let d = H[3]!;
    let e = H[4]!;
    let f = H[5]!;
    let g = H[6]!;
    let h = H[7]!;

    // 主循环
    for (let t = 0; t < 64; t++) {
      const T1 = (h + sigma1(e) + ch(e, f, g) + K[t]! + W[t]!) >>> 0;
      const T2 = (sigma0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + T1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (T1 + T2) >>> 0;
    }

    // 更新哈希值
    H = [
      (H[0]! + a) >>> 0,
      (H[1]! + b) >>> 0,
      (H[2]! + c) >>> 0,
      (H[3]! + d) >>> 0,
      (H[4]! + e) >>> 0,
      (H[5]! + f) >>> 0,
      (H[6]! + g) >>> 0,
      (H[7]! + h) >>> 0
    ];
  }

  // 输出哈希值
  return H.map(v => v.toString(16).padStart(8, '0')).join('');
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
 * 如果环境变量密码发生变化，则更新配置
 * 
 * @returns 鉴权配置
 */
export async function initAuthConfig(): Promise<AuthConfig> {
  let config = getAuthConfig();
  const envPassword = getEnvPassword(); // Vite 构建时的明文密码
  const envPasswordHash = getEnvPasswordHash(); // Docker 运行时的哈希值
  
  if (!config) {
    // 首次使用，创建默认配置
    let passwordHash: string;
    let isDefault = true;
    
    if (envPasswordHash) {
      // Docker 环境：直接使用注入的哈希值
      passwordHash = envPasswordHash;
      isDefault = false;
      logger.info('使用 Docker 环境变量密码哈希');
    } else if (envPassword) {
      // Vite 构建环境：计算哈希
      passwordHash = await hashPassword(envPassword);
      isDefault = false;
      logger.info('使用 Vite 环境变量密码');
    } else {
      // 使用默认密码
      passwordHash = await hashPassword(getDefaultPassword());
      logger.info('使用默认密码');
    }
    
    config = {
      passwordHash,
      isDefaultPassword: isDefault,
      envPasswordHash: envPasswordHash || (envPassword ? await hashPassword(envPassword) : undefined),
    };
    saveAuthConfig(config);
    logger.info('已创建默认鉴权配置');
  } else if (envPasswordHash) {
    // Docker 环境：检查哈希是否变化
    if (config.envPasswordHash !== envPasswordHash) {
      config = {
        passwordHash: envPasswordHash,
        isDefaultPassword: false,
        envPasswordHash: envPasswordHash,
      };
      saveAuthConfig(config);
      logger.info('Docker 环境变量密码已更新，鉴权配置已同步');
    }
  } else if (envPassword) {
    // Vite 环境：检查密码是否变化
    const currentEnvHash = await hashPassword(envPassword);
    if (config.envPasswordHash !== currentEnvHash) {
      config = {
        passwordHash: currentEnvHash,
        isDefaultPassword: false,
        envPasswordHash: currentEnvHash,
      };
      saveAuthConfig(config);
      logger.info('Vite 环境变量密码已更新，鉴权配置已同步');
    }
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
