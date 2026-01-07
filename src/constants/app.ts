/**
 * 应用配置常量
 * 需求: 2.3, 2.6, 4.1
 * 
 * 本文件定义应用的基本配置信息，包括名称、官方网站、Logo 路径等。
 */

/**
 * 应用配置常量
 */
export const APP_CONFIG = {
  /** 应用名称 */
  name: 'Gemini Chat',
  /** 官方网站 URL */
  websiteUrl: 'https://github.com/bohesocool/gemini-chat',
  /** 更新检查 API URL（GitHub Releases API） */
  updateCheckUrl: 'https://api.github.com/repos/bohesocool/gemini-chat/releases/latest',
  /** Logo 路径 */
  logoPath: '/logo.png',
  /** 版权信息 */
  copyright: '© 2026 Gemini Chat. All rights reserved.',
} as const;

/** 应用配置类型 */
export type AppConfigKey = keyof typeof APP_CONFIG;
