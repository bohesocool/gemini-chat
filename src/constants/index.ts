/**
 * 集中常量管理
 * 需求: 4.1, 4.2, 4.3, 4.4
 * 
 * 本文件集中管理项目中的所有魔法数字和配置值，
 * 便于查找、修改和维护。
 */

// ============ 文件大小限制 ============

/**
 * 文件大小限制常量
 * 需求: 4.1
 */
export const SIZE_LIMITS = {
  /** 图片文件大小限制（20MB） */
  IMAGE: 20 * 1024 * 1024,
  /** 文档文件大小限制（50MB） */
  DOCUMENT: 50 * 1024 * 1024,
} as const;

// ============ 超时配置 ============

/**
 * 超时和延迟配置
 * 需求: 4.2
 */
export const TIMEOUTS = {
  /** 防抖延迟（毫秒） */
  DEBOUNCE: 300,
  /** 默认动画时长（毫秒） */
  ANIMATION: 200,
  /** 最小加载时间（毫秒），用于避免闪烁 */
  MIN_LOAD_TIME: 500,
  /** 清理定时器间隔（毫秒） */
  CLEANUP_INTERVAL: 60 * 1000,
  /** 缓存过期时间（毫秒） */
  CACHE_TTL: 5 * 60 * 1000,
} as const;

// ============ UI 限制 ============

/**
 * UI 相关限制
 * 需求: 4.1
 */
export const UI_LIMITS = {
  /** 标题最大长度 */
  MAX_TITLE_LENGTH: 30,
  /** 模块最大行数 */
  MAX_MODULE_LINES: 400,
  /** 缓存最大条目数 */
  MAX_CACHE_ENTRIES: 100,
} as const;

// ============ 动画配置 ============

/**
 * 动画持续时间配置
 * 需求: 4.3
 */
export const ANIMATIONS = {
  /** 快速动画（毫秒） */
  FAST: 150,
  /** 普通动画（毫秒） */
  NORMAL: 200,
  /** 慢速动画（毫秒） */
  SLOW: 300,
} as const;

// ============ 图片网格配置 ============

/**
 * 图片网格默认尺寸配置
 */
export const IMAGE_GRID_SIZES = {
  /** 单图最大宽度 */
  SINGLE_MAX_WIDTH: 240,
  /** 单图最大高度 */
  SINGLE_MAX_HEIGHT: 200,
  /** 多图最大宽度 */
  MULTI_MAX_WIDTH: 150,
  /** 多图最大高度 */
  MULTI_MAX_HEIGHT: 130,
} as const;

// ============ 类型导出 ============

/** 文件大小限制类型 */
export type SizeLimitsKey = keyof typeof SIZE_LIMITS;

/** 超时配置类型 */
export type TimeoutsKey = keyof typeof TIMEOUTS;

/** UI 限制类型 */
export type UILimitsKey = keyof typeof UI_LIMITS;

/** 动画配置类型 */
export type AnimationsKey = keyof typeof ANIMATIONS;
