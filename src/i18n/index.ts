/**
 * 国际化 (i18n) 模块导出入口
 * 
 * 本文件作为 i18n 模块的统一导出入口，提供：
 * - 类型定义导出
 * - 翻译 Hook 导出
 * - 工具函数导出
 * 
 * Requirements: 2.4
 * - 提供翻译函数 t(key: string) 返回翻译后的字符串
 * 
 * 使用示例：
 * ```tsx
 * import { useTranslation } from '@/i18n';
 * import type { Locale, TranslateFunction } from '@/i18n';
 * 
 * function MyComponent() {
 *   const { t, locale, toggleLocale } = useTranslation();
 *   return <p>{t('common.confirm')}</p>;
 * }
 * ```
 */

// ============ 类型定义导出 ============

export type {
  /** 支持的语言区域类型 ('zh-CN' | 'en-US') */
  Locale,
  /** 翻译资源结构接口（支持嵌套） */
  TranslationResource,
  /** 翻译函数类型 */
  TranslateFunction,
  /** i18n Store 状态接口 */
  I18nState,
} from './types';

// ============ 翻译 Hook 导出 ============

export {
  /** 翻译 Hook，提供 t 函数和语言控制方法 */
  useTranslation,
  /** 获取嵌套键的值（工具函数） */
  getNestedValue,
  /** 替换参数占位符（工具函数） */
  interpolate,
  /** 非 Hook 翻译函数（供非组件代码使用） */
  getTranslation,
  /** 翻译资源 */
  translations,
} from './useTranslation';

