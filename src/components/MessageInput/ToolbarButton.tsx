/**
 * 工具栏按钮组件 - Requirements: 9.2
 * 从 MessageInput.tsx 拆分而来
 */

import { memo } from 'react';
import { durationValues, easings } from '../../design/tokens';

/**
 * ToolbarButton 组件属性
 */
export interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  reducedMotion: boolean;
}

/**
 * 工具栏按钮
 * 使用 React.memo 包裹，隔离输入框打字时的重渲染范围
 */
export const ToolbarButton = memo(function ToolbarButton({ onClick, disabled, title, children, active = false, reducedMotion }: ToolbarButtonProps) {
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg flex items-center justify-center touch-manipulation
        ${active
          ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={transitionStyle}
      title={title}
    >
      {children}
    </button>
  );
});

export default ToolbarButton;
