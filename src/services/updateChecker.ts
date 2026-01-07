/**
 * 更新检查服务
 * 负责检查应用是否有新版本可用
 * 需求: 3.1, 3.2, 3.3, 3.4
 */

import { APP_CONFIG } from '../constants/app';

/**
 * 更新检查状态
 * - idle: 空闲状态
 * - checking: 正在检查中
 * - available: 有新版本可用
 * - latest: 已是最新版本
 * - error: 检查失败
 */
export type UpdateStatus = 'idle' | 'checking' | 'available' | 'latest' | 'error';

/**
 * 更新信息
 */
export interface UpdateInfo {
  /** 最新版本号 */
  latestVersion: string;
  /** 下载链接 */
  downloadUrl: string;
  /** 更新说明 */
  releaseNotes?: string;
}

/**
 * 更新检查结果
 */
export interface UpdateCheckResult {
  /** 检查状态 */
  status: UpdateStatus;
  /** 更新信息（当有新版本时） */
  updateInfo?: UpdateInfo;
  /** 错误信息（当检查失败时） */
  error?: string;
}

/**
 * GitHub Release API 响应类型
 */
interface GitHubRelease {
  tag_name: string;
  html_url: string;
  body?: string;
}

/**
 * 比较两个语义化版本号
 * @param current 当前版本号
 * @param latest 最新版本号
 * @returns 如果 latest > current 返回 1，相等返回 0，否则返回 -1
 */
export function compareVersions(current: string, latest: string): number {
  // 移除版本号前缀 'v'（如果存在）
  const cleanCurrent = current.replace(/^v/, '');
  const cleanLatest = latest.replace(/^v/, '');

  const currentParts = cleanCurrent.split('.').map(Number);
  const latestParts = cleanLatest.split('.').map(Number);

  // 确保两个数组长度相同
  const maxLength = Math.max(currentParts.length, latestParts.length);
  while (currentParts.length < maxLength) currentParts.push(0);
  while (latestParts.length < maxLength) latestParts.push(0);

  for (let i = 0; i < maxLength; i++) {
    const latest = latestParts[i] ?? 0;
    const current = currentParts[i] ?? 0;
    if (latest > current) return 1;
    if (latest < current) return -1;
  }

  return 0;
}

/**
 * 检查更新
 * @param currentVersion 当前版本号
 * @returns 更新检查结果
 */
export async function checkForUpdates(currentVersion: string): Promise<UpdateCheckResult> {
  try {
    const response = await fetch(APP_CONFIG.updateCheckUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return {
          status: 'error',
          error: '未找到发布版本信息',
        };
      }
      throw new Error(`HTTP 错误: ${response.status}`);
    }

    const release: GitHubRelease = await response.json();
    const latestVersion = release.tag_name;

    const comparison = compareVersions(currentVersion, latestVersion);

    if (comparison > 0) {
      // 有新版本可用
      return {
        status: 'available',
        updateInfo: {
          latestVersion,
          downloadUrl: release.html_url,
          releaseNotes: release.body,
        },
      };
    } else {
      // 已是最新版本
      return {
        status: 'latest',
      };
    }
  } catch (error) {
    // 处理网络错误和其他异常
    let errorMessage = '检查更新失败';

    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = '网络连接失败，请检查网络设置';
    } else if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        errorMessage = '请求超时，请稍后重试';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      status: 'error',
      error: errorMessage,
    };
  }
}
