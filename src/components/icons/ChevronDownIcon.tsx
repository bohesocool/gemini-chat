import React from 'react';

/**
 * 下拉箭头图标
 * 来源：DropdownButton.tsx、ChatHeader.tsx（SVG 路径一致，合并为一个）
 * 支持 className 和 style 属性
 */
export function ChevronDownIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={className}
      style={style}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
