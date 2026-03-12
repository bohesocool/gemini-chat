/**
 * 设计令牌 - Gemini Chat 应用设计系统
 * 定义统一的颜色、间距、圆角、阴影、字体和动画系统
 */

// ============================================
// 颜色系统
// ============================================

/**
 * 薄荷绿主题色
 * 清新、舒适的绿色调
 * Requirements: 1.1, 1.2 - 使用薄荷绿作为主题色
 */
export const mintColors = {
  50: '#f0fdf4',   // 最浅 - 背景色
  100: '#dcfce7',  // 浅色 - 悬停背景
  200: '#bbf7d0',  // 较浅 - 选中背景
  300: '#86efac',  // 中浅 - 边框
  400: '#4ade80',  // 中等 - 次要按钮
  500: '#22c55e',  // 主色 - 主要按钮
  600: '#16a34a',  // 较深 - 悬停状态
  700: '#15803d',  // 深色 - 按下状态
  800: '#166534',  // 很深 - 文字
  900: '#14532d',  // 最深 - 强调文字
} as const;

/**
 * 品牌主题色 - 薄荷绿色系
 * Requirements: 1.1, 1.2 - 使用薄荷绿作为品牌色
 */
export const brandColors = mintColors;

/**
 * 主色调色板 - 薄荷绿色系
 * Requirements: 1.3, 1.4, 1.5 - 所有使用主色的 UI 元素显示薄荷绿色
 */
export const primaryColors = mintColors;

/**
 * 信息色调色板 - 蓝色系（用于信息提示等）
 */
export const infoColors = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
} as const;

/**
 * 中性色调色板 - 灰色系
 */
export const neutralColors = {
  50: '#fafafa',
  100: '#f4f4f5',
  200: '#e4e4e7',
  300: '#d4d4d8',
  400: '#a1a1aa',
  500: '#71717a',
  600: '#52525b',
  700: '#3f3f46',
  800: '#27272a',
  900: '#18181b',
} as const;

/**
 * 语义色 - 成功、警告、错误、信息
 */
export const semanticColors = {
  success: {
    light: '#10b981',
    dark: '#34d399',
  },
  warning: {
    light: '#f59e0b',
    dark: '#fbbf24',
  },
  error: {
    light: '#ef4444',
    dark: '#f87171',
  },
  info: {
    light: '#3b82f6',
    dark: '#60a5fa',
  },
} as const;


/**
 * 模型标签颜色映射
 * Requirements: 7.6 - 不同模型使用不同颜色区分
 */
export const modelColors = {
  // Gemini 3 系列 - 绿色系
  'gemini-3-pro': {
    bg: '#dcfce7',
    text: '#166534',
    darkBg: '#166534',
    darkText: '#dcfce7',
  },
  'gemini-3-pro-preview': {
    bg: '#dcfce7',
    text: '#166534',
    darkBg: '#166534',
    darkText: '#dcfce7',
  },
  'gemini-3-pro-image': {
    bg: '#fce7f3',
    text: '#9d174d',
    darkBg: '#9d174d',
    darkText: '#fce7f3',
  },
  'gemini-3-pro-image-preview': {
    bg: '#fce7f3',
    text: '#9d174d',
    darkBg: '#9d174d',
    darkText: '#fce7f3',
  },
  'gemini-3.1-flash-image': {
    bg: '#fce7f3',
    text: '#9d174d',
    darkBg: '#9d174d',
    darkText: '#fce7f3',
  },
  'gemini-3.1-flash-image-preview': {
    bg: '#fce7f3',
    text: '#9d174d',
    darkBg: '#9d174d',
    darkText: '#fce7f3',
  },
  // Gemini 2 系列 - 蓝色系
  'gemini-2': {
    bg: '#dbeafe',
    text: '#1e40af',
    darkBg: '#1e40af',
    darkText: '#dbeafe',
  },
  'gemini-2.0-flash': {
    bg: '#dbeafe',
    text: '#1e40af',
    darkBg: '#1e40af',
    darkText: '#dbeafe',
  },
  'gemini-2.0-flash-lite': {
    bg: '#e0e7ff',
    text: '#3730a3',
    darkBg: '#3730a3',
    darkText: '#e0e7ff',
  },
  // Gemini 1.5 系列 - 紫色系
  'gemini-1.5': {
    bg: '#f3e8ff',
    text: '#6b21a8',
    darkBg: '#6b21a8',
    darkText: '#f3e8ff',
  },
  'gemini-1.5-pro': {
    bg: '#f3e8ff',
    text: '#6b21a8',
    darkBg: '#6b21a8',
    darkText: '#f3e8ff',
  },
  'gemini-1.5-flash': {
    bg: '#fae8ff',
    text: '#86198f',
    darkBg: '#86198f',
    darkText: '#fae8ff',
  },
  // 默认颜色
  default: {
    bg: '#f4f4f5',
    text: '#3f3f46',
    darkBg: '#3f3f46',
    darkText: '#f4f4f5',
  },
} as const;

/**
 * 模型颜色配置类型
 */
export interface ModelColorConfig {
  bg: string;
  text: string;
  darkBg: string;
  darkText: string;
}

/**
 * 获取模型标签颜色
 * @param modelId 模型 ID
 * @returns 模型颜色配置
 */
export function getModelColor(modelId: string): ModelColorConfig {
  // 精确匹配
  if (modelId in modelColors) {
    return modelColors[modelId as keyof typeof modelColors];
  }
  
  // 前缀匹配
  if (modelId.startsWith('gemini-3.1-flash-image')) {
    return modelColors['gemini-3.1-flash-image'];
  }
  if (modelId.startsWith('gemini-3-pro-image')) {
    return modelColors['gemini-3-pro-image'];
  }
  if (modelId.startsWith('gemini-3')) {
    return modelColors['gemini-3-pro'];
  }
  if (modelId.startsWith('gemini-2.0-flash-lite')) {
    return modelColors['gemini-2.0-flash-lite'];
  }
  if (modelId.startsWith('gemini-2')) {
    return modelColors['gemini-2'];
  }
  if (modelId.startsWith('gemini-1.5-flash')) {
    return modelColors['gemini-1.5-flash'];
  }
  if (modelId.startsWith('gemini-1.5')) {
    return modelColors['gemini-1.5'];
  }
  
  return modelColors.default;
}

/**
 * 完整颜色系统
 */
export const colors = {
  mint: mintColors,
  brand: brandColors,
  primary: primaryColors,
  infoScale: infoColors,
  neutral: neutralColors,
  model: modelColors,
  ...semanticColors,
} as const;

// ============================================
// 间距系统（基于 4px 基础单位）
// ============================================

/**
 * 间距令牌
 * 使用 4px 作为基础单位的倍数
 */
export const spacing = {
  0: '0',
  1: '4px',    // 4px
  2: '8px',    // 8px
  3: '12px',   // 12px
  4: '16px',   // 16px
  6: '24px',   // 24px
  8: '32px',   // 32px
  12: '48px',  // 48px
  16: '64px',  // 64px
} as const;

/**
 * 间距数值（用于计算）
 */
export const spacingValues = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
} as const;

// ============================================
// 圆角系统
// ============================================

/**
 * 圆角令牌
 * 小：4px、中：8px、大：12px、超大：16px
 */
export const borderRadius = {
  none: '0',
  sm: '4px',    // 小圆角
  md: '8px',    // 中圆角
  lg: '12px',   // 大圆角
  xl: '16px',   // 超大圆角
  full: '9999px', // 完全圆形
} as const;

// ============================================
// 阴影系统
// ============================================

/**
 * 阴影令牌
 * 层次分明的阴影系统：无、小、中、大、超大
 */
export const shadows = {
  none: 'none',
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

// ============================================
// 字体系统
// ============================================

/**
 * 字体层级
 * 标题、副标题、正文、辅助文字、标签
 */
export const typography = {
  h1: {
    size: '2rem',      // 32px
    weight: 700,
    lineHeight: 1.2,
  },
  h2: {
    size: '1.5rem',    // 24px
    weight: 600,
    lineHeight: 1.3,
  },
  h3: {
    size: '1.25rem',   // 20px
    weight: 600,
    lineHeight: 1.4,
  },
  body: {
    size: '1rem',      // 16px
    weight: 400,
    lineHeight: 1.5,
  },
  small: {
    size: '0.875rem',  // 14px
    weight: 400,
    lineHeight: 1.5,
  },
  caption: {
    size: '0.75rem',   // 12px
    weight: 400,
    lineHeight: 1.4,
  },
} as const;

/**
 * 字体族
 */
export const fontFamily = {
  sans: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
} as const;

// ============================================
// 动画系统
// ============================================

/**
 * 动画时长
 */
export const durations = {
  fast: '150ms',    // 快速动画（按钮反馈）
  normal: '200ms',  // 正常动画（淡入淡出）
  slow: '300ms',    // 慢速动画（页面过渡）
} as const;

/**
 * 动画时长数值（毫秒）
 */
export const durationValues = {
  fast: 150,
  normal: 200,
  slow: 300,
} as const;

/**
 * 缓动函数
 */
export const easings = {
  easeOut: 'cubic-bezier(0.0, 0, 0.2, 1)',      // 减速
  easeIn: 'cubic-bezier(0.4, 0, 1, 1)',         // 加速
  easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',    // 先加速后减速
} as const;

/**
 * 预定义动画
 */
export const animations = {
  fadeIn: {
    from: { opacity: 0 },
    to: { opacity: 1 },
    duration: durations.normal,
    easing: easings.easeOut,
  },
  fadeOut: {
    from: { opacity: 1 },
    to: { opacity: 0 },
    duration: durations.normal,
    easing: easings.easeIn,
  },
  scaleIn: {
    from: { transform: 'scale(0.95)', opacity: 0 },
    to: { transform: 'scale(1)', opacity: 1 },
    duration: durations.normal,
    easing: easings.easeOut,
  },
  scaleOut: {
    from: { transform: 'scale(1)', opacity: 1 },
    to: { transform: 'scale(0.95)', opacity: 0 },
    duration: durations.normal,
    easing: easings.easeIn,
  },
  slideInRight: {
    from: { transform: 'translateX(100%)', opacity: 0 },
    to: { transform: 'translateX(0)', opacity: 1 },
    duration: durations.slow,
    easing: easings.easeOut,
  },
  slideOutRight: {
    from: { transform: 'translateX(0)', opacity: 1 },
    to: { transform: 'translateX(100%)', opacity: 0 },
    duration: durations.slow,
    easing: easings.easeIn,
  },
} as const;

// ============================================
// 类型导出
// ============================================

// ============================================
// 响应式断点系统
// ============================================

/**
 * 响应式断点
 * 用于响应式布局的屏幕宽度断点
 */
export const breakpoints = {
  sm: '640px',   // 小屏幕（手机横屏）
  md: '768px',   // 中等屏幕（平板）
  lg: '1024px',  // 大屏幕（小型桌面）
  xl: '1280px',  // 超大屏幕（桌面）
  '2xl': '1536px', // 超超大屏幕（大型桌面）
} as const;

/**
 * 断点数值（用于 JS 计算）
 */
export const breakpointValues = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

/**
 * 触摸目标最小尺寸
 * 根据 WCAG 2.1 和 Apple HIG 指南
 */
export const touchTargets = {
  minimum: '44px',  // 最小触摸目标尺寸
  minimumValue: 44, // 数值版本
} as const;

// ============================================
// 类型导出
// ============================================

export type MintColorKey = keyof typeof mintColors;
export type BrandColorKey = keyof typeof brandColors;
export type PrimaryColorKey = keyof typeof primaryColors;
export type InfoColorKey = keyof typeof infoColors;
export type NeutralColorKey = keyof typeof neutralColors;
export type SemanticColorKey = keyof typeof semanticColors;
export type ModelColorKey = keyof typeof modelColors;
export type SpacingKey = keyof typeof spacing;
export type BorderRadiusKey = keyof typeof borderRadius;
export type ShadowKey = keyof typeof shadows;
export type TypographyKey = keyof typeof typography;
export type DurationKey = keyof typeof durations;
export type EasingKey = keyof typeof easings;
export type BreakpointKey = keyof typeof breakpoints;
