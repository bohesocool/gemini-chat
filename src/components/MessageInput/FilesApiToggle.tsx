/**
 * Files API 开关按钮组件
 * 显示在 MessageInput 工具栏中，用于切换 Files API 上传模式
 * 
 * Requirements: 1.1, 1.3, 1.4, 1.6
 */

import { durationValues, easings } from '../../design/tokens';
import { useReducedMotion } from '../motion';

/**
 * FilesApiToggle 组件属性
 */
export interface FilesApiToggleProps {
  /** 是否启用 Files API 模式 */
  enabled: boolean;
  /** 切换回调 */
  onToggle: () => void;
  /** 是否禁用按钮 */
  disabled?: boolean;
}

/**
 * Files API 开关按钮
 * 
 * Requirements:
 * - 1.1: 显示在 MessageInput 工具栏区域
 * - 1.3: 点击切换 Files API 模式开关
 * - 1.4: 启用时显示激活状态视觉指示
 * - 1.6: 启用时显示状态指示文本
 */
export function FilesApiToggle({
  enabled,
  onToggle,
  disabled = false,
}: FilesApiToggleProps) {
  const reducedMotion = useReducedMotion();

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`
        p-2 rounded-lg flex items-center justify-center touch-manipulation
        ${enabled
          ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={transitionStyle}
      title={enabled ? '关闭 Files API 模式' : '开启 Files API 模式'}
      aria-pressed={enabled}
      aria-label="Files API 上传模式"
    >
      <CloudUploadIcon className="w-4 h-4" />
    </button>
  );
}

/**
 * 云上传图标 - 表示 Files API 上传功能
 */
function CloudUploadIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
      />
    </svg>
  );
}

export default FilesApiToggle;
