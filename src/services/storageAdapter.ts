/**
 * 存储适配器 - 根据运行时配置在 IndexedDB 和 API 之间切换
 *
 * 当 DB_ENABLED=true 且后端健康时，使用 API 存储（服务端数据库）
 * 否则 fallback 到浏览器 IndexedDB（当前默认行为）
 */

import { checkHealth } from './apiClient';

let _useApi: boolean | null = null;

function getConfigFlag(key: string): boolean {
  const cfg = (window as unknown as Record<string, Record<string, string>>).__APP_CONFIG__;
  if (!cfg) return false;
  const val = cfg[key];
  return val === 'true' || val === true as unknown as string;
}

/**
 * 判断运行时配置是否声明启用了 API 模式
 * （用于决定 "后端失败要不要给用户报错"：声明启用时失败必须报错，否则可静默走 IndexedDB）
 */
export function hasApiModeConfig(): boolean {
  return getConfigFlag('DB_ENABLED');
}

/**
 * 检测运行时应使用的存储模式。
 * - 若运行时未声明 DB_ENABLED=true，则直接返回 IndexedDB 模式（无后端）
 * - 若声明启用但 health 检查失败，抛错让上层显式提示（避免把数据写到错误的 store 里造成"丢失"）
 */
export async function detectStorageMode(): Promise<boolean> {
  if (_useApi !== null) return _useApi;

  if (!hasApiModeConfig()) {
    _useApi = false;
    return false;
  }

  try {
    const health = await checkHealth();
    if (health.status !== 'ok') {
      throw new Error(`Backend health check returned status=${health.status}`);
    }
    _useApi = true;
    return true;
  } catch (err) {
    _useApi = null;
    throw err instanceof Error ? err : new Error(String(err));
  }
}

export function isApiMode(): boolean {
  return _useApi === true;
}

export function resetDetection(): void {
  _useApi = null;
}
