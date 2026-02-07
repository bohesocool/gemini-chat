/**
 * 翻译 Hook
 * 
 * 提供国际化翻译功能，包括：
 * - 嵌套键解析（如 'sidebar.assistants'）
 * - 参数占位符替换（如 '{count}' -> '5'）
 * - 缺失键回退（返回键本身）
 * 
 * Requirements: 2.2, 2.3, 2.4
 * - 2.2: 支持使用点号分隔的嵌套翻译键
 * - 2.3: 当翻译键不存在时，返回键本身作为回退
 * - 2.4: 提供翻译函数 t(key: string) 返回翻译后的字符串
 */

import { useCallback } from 'react';
import { useI18nStore } from '../stores/i18n';
import zhCN from './translations/zh-CN.json';
import enUS from './translations/en-US.json';
import type { Locale, TranslateFunction, TranslationResource } from './types';

// ============ 翻译资源映射 ============

/**
 * 翻译资源映射表
 * 将语言区域映射到对应的翻译资源
 */
const translations: Record<Locale, TranslationResource> = {
  'zh-CN': zhCN,
  'en-US': enUS,
};

// ============ 工具函数 ============

/**
 * 获取嵌套键的值
 * 
 * 解析点号分隔的键路径，从翻译资源中获取对应的值
 * 
 * @param obj - 翻译资源对象
 * @param path - 点号分隔的键路径（如 'sidebar.assistants'）
 * @returns 找到的字符串值，如果路径无效则返回 undefined
 * 
 * 示例：
 * - getNestedValue({ sidebar: { assistants: '助手' } }, 'sidebar.assistants') => '助手'
 * - getNestedValue({ common: { confirm: '确定' } }, 'common.invalid') => undefined
 */
export function getNestedValue(obj: TranslationResource, path: string): string | undefined {
  const keys = path.split('.');
  let current: TranslationResource | string | undefined = obj;

  for (const key of keys) {
    // 如果当前值不是对象，无法继续解析
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }
    current = current[key];
    // 如果当前值为 undefined，提前返回
    if (current === undefined) {
      return undefined;
    }
  }

  // 只有当最终值是字符串时才返回
  return typeof current === 'string' ? current : undefined;
}

/**
 * 替换参数占位符
 * 
 * 将模板字符串中的 {key} 占位符替换为对应的参数值
 * 
 * @param template - 包含占位符的模板字符串
 * @param params - 参数对象，键为占位符名称，值为替换内容
 * @returns 替换后的字符串
 * 
 * 示例：
 * - interpolate('共 {count} 条消息', { count: '5' }) => '共 5 条消息'
 * - interpolate('Hello {name}!', { name: 'World' }) => 'Hello World!'
 * - interpolate('Missing {key}', {}) => 'Missing {key}' （未找到的占位符保持原样）
 */
export function interpolate(template: string, params?: Record<string, string | number>): string {
  // 如果没有参数，直接返回模板
  if (!params) return template;

  // 使用正则表达式匹配 {key} 格式的占位符
  // \w+ 匹配一个或多个单词字符（字母、数字、下划线）
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    // 如果参数中存在该键，返回对应值；否则保持原占位符
    const value = params[key];
    return value !== undefined ? String(value) : `{${key}}`;
  });
}

// ============ 翻译 Hook ============

/**
 * 翻译 Hook
 * 
 * 提供国际化翻译功能的 React Hook
 * 
 * @returns 包含翻译函数和语言控制方法的对象
 * - t: 翻译函数，根据键获取当前语言的翻译文本
 * - locale: 当前语言区域
 * - setLocale: 设置语言区域
 * - toggleLocale: 切换语言（中英文切换）
 * 
 * 使用示例：
 * ```tsx
 * function MyComponent() {
 *   const { t, locale, toggleLocale } = useTranslation();
 *   
 *   return (
 *     <div>
 *       <p>{t('common.confirm')}</p>
 *       <p>当前语言: {locale}</p>
 *       <button onClick={toggleLocale}>切换语言</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useTranslation() {
  // 从 i18n Store 获取当前语言状态和控制方法
  const { locale, setLocale, toggleLocale } = useI18nStore();

  /**
   * 翻译函数
   * 
   * 根据键获取当前语言的翻译文本，支持参数插值
   * 
   * @param key - 翻译键，支持点号分隔的嵌套键
   * @param params - 可选的参数对象，用于替换占位符
   * @returns 翻译后的字符串，如果键不存在则返回键本身
   */
  const t: TranslateFunction = useCallback((key: string, params?: Record<string, string | number>) => {
    // 获取当前语言的翻译资源
    const resource = translations[locale];

    // 解析嵌套键获取翻译值
    const value = getNestedValue(resource, key);

    // 如果翻译键不存在，返回键本身作为回退
    if (value === undefined) {
      // 在开发环境下输出警告，帮助开发者发现缺失的翻译
      console.warn(`Translation key not found: ${key}`);
      return key;
    }

    // 替换参数占位符并返回
    return interpolate(value, params);
  }, [locale]);

  return { t, locale, setLocale, toggleLocale };
}

// ============ 非 Hook 翻译函数（供非组件代码使用） ============

/**
 * 获取当前语言的翻译
 * 
 * 用于非 React 组件的代码（如工具函数、store 等）
 * 注意：此函数会在每次调用时获取当前语言，不会自动响应语言变化
 * 
 * @param key - 翻译键，支持点号分隔的嵌套键
 * @param params - 可选的参数对象，用于替换占位符
 * @returns 翻译后的字符串，如果键不存在则返回键本身
 */
export function getTranslation(key: string, params?: Record<string, string | number>): string {
  // 获取当前语言
  const locale = useI18nStore.getState().locale;

  // 获取当前语言的翻译资源
  const resource = translations[locale];

  // 解析嵌套键获取翻译值
  const value = getNestedValue(resource, key);

  // 如果翻译键不存在，返回键本身作为回退
  if (value === undefined) {
    console.warn(`Translation key not found: ${key}`);
    return key;
  }

  // 替换参数占位符并返回
  return interpolate(value, params);
}

/**
 * 导出翻译资源（用于需要直接访问的场景）
 */
export { translations };
