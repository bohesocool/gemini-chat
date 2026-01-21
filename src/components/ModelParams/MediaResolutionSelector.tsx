/**
 * 媒体分辨率选择器组件
 * 用于选择媒体处理分辨率（低/中/高）
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
 */

import React from 'react';
import type { MediaResolution } from '../../types/models';
import { useTranslation } from '../../i18n/useTranslation';

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
 * 媒体分辨率选项配置（使用翻译键）
 * 需求: 4.3, 4.4, 4.5, 4.6, 4.7
 */
interface MediaResolutionOption {
  value: MediaResolution | undefined;
  labelKey: string;
  descriptionKey: string;
}

const MEDIA_RESOLUTION_OPTIONS: MediaResolutionOption[] = [
  {
    value: undefined,
    labelKey: 'modelParams.mediaResolutionDefault',
    descriptionKey: 'modelParams.mediaResolutionDefaultDesc',
  },
  {
    value: 'MEDIA_RESOLUTION_LOW',
    labelKey: 'modelParams.mediaResolutionLow',
    descriptionKey: 'modelParams.mediaResolutionLowDesc',
  },
  {
    value: 'MEDIA_RESOLUTION_MEDIUM',
    labelKey: 'modelParams.mediaResolutionMedium',
    descriptionKey: 'modelParams.mediaResolutionMediumDesc',
  },
  {
    value: 'MEDIA_RESOLUTION_HIGH',
    labelKey: 'modelParams.mediaResolutionHigh',
    descriptionKey: 'modelParams.mediaResolutionHighDesc',
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
  const { t } = useTranslation();

  // 紧凑模式：使用简单的按钮组
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-secondary)] mr-1">{t('modelParams.mediaResolution')}:</span>
        <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)]">
          {MEDIA_RESOLUTION_OPTIONS.map((option) => (
            <button
              key={option.labelKey}
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
              title={t(option.descriptionKey)}
            >
              {t(option.labelKey)}
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
        {t('modelParams.mediaResolution')}
      </label>
      <div className="flex gap-2">
        {MEDIA_RESOLUTION_OPTIONS.map((option) => (
          <button
            key={option.labelKey}
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
                {t(option.labelKey)}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {t(option.descriptionKey)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MediaResolutionSelector;
