/**
 * 国际化状态管理 Store
 * 
 * 使用 Zustand 管理当前语言状态，并通过 persist 中间件持久化到 localStorage
 * 
 * Requirements: 1.2, 1.3, 1.4, 1.5
 * - 1.2: 持久化当前语言到 localStorage
 * - 1.3: 应用启动时从 localStorage 加载之前保存的语言
 * - 1.4: 如果没有保存的语言，默认使用 'zh-CN'
 * - 1.5: 提供切换语言的函数
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Locale, I18nState } from '../i18n/types';

// ============ 常量定义 ============

/** localStorage 存储键名 */
const STORAGE_KEY = 'gemini-chat-locale';

/** 默认语言区域 */
const DEFAULT_LOCALE: Locale = 'zh-CN';

// ============ Store 创建 ============

/**
 * 国际化状态 Store
 * 
 * 提供语言状态管理功能：
 * - locale: 当前语言区域
 * - setLocale: 设置指定语言
 * - toggleLocale: 在中英文之间切换
 * 
 * 状态会自动持久化到 localStorage，应用重启后自动恢复
 */
export const useI18nStore = create<I18nState>()(
  persist(
    (set, get) => ({
      // 初始状态：默认语言为中文
      locale: DEFAULT_LOCALE,
      
      /**
       * 设置语言区域
       * @param locale - 目标语言区域
       */
      setLocale: (locale: Locale) => {
        set({ locale });
      },
      
      /**
       * 切换语言
       * 在 'zh-CN' 和 'en-US' 之间切换
       */
      toggleLocale: () => {
        const current = get().locale;
        const next: Locale = current === 'zh-CN' ? 'en-US' : 'zh-CN';
        set({ locale: next });
      },
    }),
    {
      // 持久化配置
      name: STORAGE_KEY,
      // 只持久化 locale 字段，不持久化方法
      partialize: (state) => ({ locale: state.locale }),
    }
  )
);
