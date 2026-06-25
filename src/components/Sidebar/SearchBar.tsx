/**
 * 搜索栏组件
 * 需求: 7.6, 10.5
 */

import React, { useCallback } from 'react';
import { touchTargets } from '../../design/tokens';

// ============ 组件接口 ============

interface SearchBarProps {
  /** 搜索值 */
  value: string;
  /** 值变化回调 */
  onChange: (value: string) => void;
  /** 占位符文本 */
  placeholder?: string;
  /** 自定义类名 */
  className?: string;
}

// ============ 搜索过滤工具函数 ============

/**
 * 过滤聊天窗口列表
 * 根据搜索关键词过滤，匹配标题
 * @param windows 聊天窗口列表
 * @param searchTerm 搜索关键词
 * @returns 过滤后的聊天窗口列表
 */
export function filterChatWindows<T extends { title: string }>(
  windows: T[],
  searchTerm: string
): T[] {
  // 空搜索词返回全部
  if (!searchTerm.trim()) {
    return windows;
  }

  const normalizedSearch = searchTerm.toLowerCase().trim();
  
  return windows.filter((window) => {
    const normalizedTitle = window.title.toLowerCase();
    return normalizedTitle.includes(normalizedSearch);
  });
}

// ============ 搜索栏组件 ============

/**
 * 搜索栏
 * 实现搜索输入框，支持清除按钮
 */
export function SearchBar({
  value,
  onChange,
  placeholder = '搜索对话...',
  className = '',
}: SearchBarProps) {
  // 处理输入变化
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  // 处理清除
  const handleClear = useCallback(() => {
    onChange('');
  }, [onChange]);

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Escape') {
        onChange('');
      }
    },
    [onChange]
  );

  return (
    <div className={`relative ${className}`}>
      {/* 搜索图标 */}
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-4 w-4 text-neutral-400 dark:text-neutral-500" />
      </div>

      {/* 输入框 */}
      <input
        type="text"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="
          w-full pl-9 pr-9 text-sm
          bg-neutral-100 dark:bg-neutral-800
          border border-transparent
          rounded-lg
          text-neutral-900 dark:text-neutral-100
          placeholder-neutral-500 dark:placeholder-neutral-400
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          transition-all duration-normal
        "
        style={{ minHeight: touchTargets.minimum }}
      />

      {/* 清除按钮 */}
      {value && (
        <button
          onClick={handleClear}
          className="absolute inset-y-0 right-0 pr-1 flex items-center touch-manipulation"
          style={{ minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
          title="清除搜索"
        >
          <ClearIcon className="h-4 w-4 text-neutral-400 dark:text-neutral-500 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors" />
        </button>
      )}
    </div>
  );
}

// ============ 图标组件 ============

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default SearchBar;
