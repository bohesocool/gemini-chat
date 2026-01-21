/**
 * 国际化类型定义
 * 
 * 本文件定义了 i18n 系统所需的所有类型接口
 */

/**
 * 支持的语言区域类型
 * - 'zh-CN': 简体中文
 * - 'en-US': 英文
 */
export type Locale = 'zh-CN' | 'en-US';

/**
 * 翻译资源结构接口（支持嵌套）
 * 
 * 翻译资源可以是简单的字符串，也可以是嵌套的对象结构
 * 例如：
 * {
 *   "common": {
 *     "confirm": "确定",
 *     "cancel": "取消"
 *   },
 *   "sidebar": {
 *     "assistants": "助手"
 *   }
 * }
 */
export interface TranslationResource {
  [key: string]: string | TranslationResource;
}

/**
 * 翻译函数类型
 * 
 * @param key - 翻译键，支持点号分隔的嵌套键（如 'sidebar.assistants'）
 * @param params - 可选的参数对象，用于替换翻译文本中的占位符
 * @returns 翻译后的字符串
 * 
 * 示例：
 * - t('common.confirm') => '确定'
 * - t('chat.messageCount', { count: '5' }) => '共 5 条消息'
 */
export type TranslateFunction = (key: string, params?: Record<string, string>) => string;

/**
 * i18n Store 状态接口
 * 
 * 定义了语言状态管理所需的状态和方法
 */
export interface I18nState {
  /** 当前语言区域 */
  locale: Locale;
  
  /** 设置语言区域 */
  setLocale: (locale: Locale) => void;
  
  /** 切换语言（在 zh-CN 和 en-US 之间切换） */
  toggleLocale: () => void;
}
