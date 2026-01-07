/**
 * 版本服务
 * 提供应用版本信息的获取和格式化功能
 */

// 直接导入 package.json 获取版本信息
import pkg from '../../package.json';

/**
 * 应用版本信息
 */
export interface AppVersion {
  /** 版本号，如 "1.0.0" */
  version: string;
  /** 应用名称 */
  name: string;
}

/**
 * 获取应用版本信息
 */
export function getAppVersion(): AppVersion {
  return {
    version: pkg.version,
    name: pkg.name,
  };
}

/**
 * 格式化版本号显示
 * @param version 版本号
 * @returns 格式化后的版本号，如 "v1.0.0"
 */
export function formatVersion(version: string): string {
  return `v${version}`;
}
