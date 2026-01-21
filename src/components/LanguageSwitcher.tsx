/**
 * 语言切换器组件
 * 
 * 提供中英文语言切换功能，包括：
 * - 显示当前语言图标
 * - 显示切换目标语言标签（中文时显示 'EN'，英文时显示 '中'）
 * - 点击切换语言
 * - 提供 tooltip 和 aria-label 用于无障碍访问
 * 
 * Requirements: 3.1, 3.2, 3.3
 * - 3.1: 语言切换器放置在左侧导航栏底部
 * - 3.2: 显示当前语言图标
 * - 3.3: 点击时切换语言（'zh-CN' ↔ 'en-US'）
 */

import { useTranslation } from '../i18n/useTranslation';

// ============ 类型定义 ============

interface LanguageSwitcherProps {
  /** 自定义 CSS 类名 */
  className?: string;
}

interface LanguageIconProps {
  /** 图标的 CSS 类名 */
  className?: string;
}

// ============ 图标组件 ============

/**
 * 语言图标组件
 * 
 * 使用 SVG 绘制的语言/翻译图标
 * 图标设计参考了常见的翻译/语言切换图标样式
 */
function LanguageIcon({ className }: LanguageIconProps) {
  return (
    <svg 
      className={className} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" 
      />
    </svg>
  );
}

// ============ 主组件 ============

/**
 * 语言切换器组件
 * 
 * 用于在界面上切换应用的显示语言
 * 
 * @param props - 组件属性
 * @param props.className - 可选的自定义 CSS 类名
 * @returns 语言切换按钮元素
 * 
 * 使用示例：
 * ```tsx
 * // 基本用法
 * <LanguageSwitcher />
 * 
 * // 带自定义样式
 * <LanguageSwitcher className="flex flex-col items-center p-2" />
 * ```
 */
export function LanguageSwitcher({ className }: LanguageSwitcherProps) {
  // 获取当前语言和切换方法
  const { locale, toggleLocale } = useTranslation();
  
  // 根据当前语言确定 tooltip 文本
  // 中文时提示切换到英文，英文时提示切换到中文
  const tooltipText = locale === 'zh-CN' ? 'Switch to English' : '切换到中文';
  
  // 根据当前语言确定显示的标签
  // 中文时显示 'EN' 表示可切换到英文，英文时显示 '中' 表示可切换到中文
  const labelText = locale === 'zh-CN' ? 'EN' : '中';
  
  return (
    <button
      onClick={toggleLocale}
      className={className}
      title={tooltipText}
      aria-label={tooltipText}
    >
      <LanguageIcon className="w-5 h-5" />
      <span className="text-xs mt-1">
        {labelText}
      </span>
    </button>
  );
}

export default LanguageSwitcher;
