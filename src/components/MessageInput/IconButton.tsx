/**
 * 图标按钮组件
 * 从 MessageInput.tsx 拆分而来
 */

import { memo } from 'react';
import { durationValues, easings, touchTargets } from '../../design/tokens';

/**
 * IconButton 组件属性
 */
export interface IconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
  reducedMotion: boolean;
}

/**
 * 图标按钮
 * 使用 React.memo 包裹，隔离输入框打字时的重渲染范围
 */
export const IconButton = memo(function IconButton({ onClick, disabled, title, children, className = '', reducedMotion }: IconButtonProps) {
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-xl flex items-center justify-center touch-manipulation
        text-neutral-500 dark:text-neutral-400
        hover:text-neutral-700 dark:hover:text-neutral-200
        hover:bg-neutral-100 dark:hover:bg-neutral-800
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
      title={title}
    >
      {children}
    </button>
  );
});

export default IconButton;
