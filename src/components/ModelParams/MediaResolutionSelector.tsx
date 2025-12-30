/**
 * 媒体分辨率选择器组件
 * 用于选择媒体处理分辨率（低/中/高）
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import React from 'react';
import type { MediaResolution } from '../../types/models';

/**
 * 媒体分辨率选择器属性
 */
export interface MediaResolutionSelectorProps {
  /** 当前值（undefined 表示默认） */
  value: MediaResolution | undefined;
  /** 变更回调 */
  onChange: (value: MediaResolution | undefined) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 显示模式：完整或紧凑 */
  variant?: 'full' | 'compact';
}

/**
 * 媒体分辨率选项配置
 * 需求: 4.3, 4.4, 4.5, 4.6, 4.7
 */
const MEDIA_RESOLUTION_OPTIONS: Array<{
  value: MediaResolution | undefined;
  label: string;
  description: string;
}> = [
  {
    value: undefined,
    label: '默认',
    description: '使用 API 默认分辨率',
  },
  {
    value: 'MEDIA_RESOLUTION_LOW',
    label: '低',
    description: '低分辨率，处理更快',
  },
  {
    value: 'MEDIA_RESOLUTION_MEDIUM',
    label: '中',
    description: '中等分辨率，平衡质量和速度',
  },
  {
    value: 'MEDIA_RESOLUTION_HIGH',
    label: '高',
    description: '高分辨率，最佳质量',
  },
];

/**
 * 媒体分辨率选择器组件
 * 支持 full 和 compact 两种显示模式
 * 
 * 需求: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 * - 提供四个选项：默认、低、中、高
 * - 默认选项对应 undefined 值（不在请求中包含参数）
 * - 低/中/高对应 API 参数值
 */
export const MediaResolutionSelector: React.FC<MediaResolutionSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  variant = 'full',
}) => {
  // 紧凑模式：使用简单的按钮组
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-secondary)] mr-1">媒体分辨率:</span>
        <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)]">
          {MEDIA_RESOLUTION_OPTIONS.map((option) => (
            <button
              key={option.label}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`
                px-2 py-0.5 text-xs font-medium transition-colors
                ${value === option.value
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 完整模式：显示详细描述
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        媒体分辨率
      </label>
      <div className="flex gap-2">
        {MEDIA_RESOLUTION_OPTIONS.map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`
              flex-1 px-3 py-2 rounded-lg border-2 transition-all
              ${value === option.value
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]'
                : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-center">
              <div
                className={`
                  text-sm font-medium
                  ${value === option.value
                    ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]'
                    : 'text-[var(--text-primary)]'
                  }
                `}
              >
                {option.label}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {option.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MediaResolutionSelector;
