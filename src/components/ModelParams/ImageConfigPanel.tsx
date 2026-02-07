/**
 * 图片配置面板组件
 * 用于配置 Gemini 3 Pro Image 的图片宽高比和分辨率
 * Requirements: 2.1, 2.2, 2.3, 2.4, 6.5
 */

import React, { useMemo } from 'react';
import type { ImageAspectRatio, ImageSize, ImageGenerationConfig } from '../../types/models';
import { useTranslation } from '../../i18n';

/**
 * 图片配置面板属性
 */
export interface ImageConfigPanelProps {
  /** 当前图片配置 */
  config: ImageGenerationConfig;
  /** 配置变更回调 */
  onChange: (config: Partial<ImageGenerationConfig>) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 显示模式：完整或紧凑 */
  variant?: 'full' | 'compact';
  /** 是否支持图片分辨率设置（默认为 true）
   * Requirements: 3.1, 3.2, 3.3, 3.4
   */
  supportsImageSize?: boolean;
}

/**
 * 图片宽高比选项配置
 * Requirements: 7.1, 7.3
 */
const ASPECT_RATIO_OPTIONS: Array<{
  value: ImageAspectRatio;
  label: string;
  icon: string;
}> = [
    { value: '1:1', label: '1:1', icon: '□' },
    { value: '16:9', label: '16:9', icon: '▭' },
    { value: '9:16', label: '9:16', icon: '▯' },
    { value: '4:3', label: '4:3', icon: '▭' },
    { value: '3:4', label: '3:4', icon: '▯' },
    { value: '3:2', label: '3:2', icon: '▭' },
    { value: '2:3', label: '2:3', icon: '▯' },
    { value: '5:4', label: '5:4', icon: '▭' },
    { value: '4:5', label: '4:5', icon: '▯' },
    { value: '21:9', label: '21:9', icon: '▭' },
  ];

/**
 * 图片分辨率选项配置（动态获取以支持 i18n）
 */
function useImageSizeOptions() {
  const { t } = useTranslation();
  return useMemo(() => [
    { value: '1K' as ImageSize, label: '1K', description: t('chat.resolutionStandard') },
    { value: '2K' as ImageSize, label: '2K', description: t('chat.resolutionHD') },
    { value: '4K' as ImageSize, label: '4K', description: t('chat.resolutionUltraHD') },
  ], [t]);
}

/**
 * 图片配置面板组件
 * 支持 full 和 compact 两种显示模式
 */
export const ImageConfigPanel: React.FC<ImageConfigPanelProps> = ({
  config,
  onChange,
  disabled = false,
  variant = 'full',
  supportsImageSize = true,
}) => {
  const { t } = useTranslation();
  const imageSizeOptions = useImageSizeOptions();
  // 紧凑模式：使用简单的按钮组
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-3">
        {/* 宽高比选择 */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-[var(--text-secondary)]">{t('chat.aspectRatio')}:</span>
          <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)]">
            {ASPECT_RATIO_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ aspectRatio: option.value })}
                className={`
                  px-1.5 py-0.5 text-xs font-medium transition-colors
                  ${config.aspectRatio === option.value
                    ? 'bg-[var(--color-primary-500)] text-white'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                  }
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={option.label}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {supportsImageSize && (
          <div className="flex items-center gap-1">
            <span className="text-xs text-[var(--text-secondary)]">{t('chat.resolution')}:</span>
            <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)]">
              {imageSizeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange({ imageSize: option.value })}
                  className={`
                    px-2 py-0.5 text-xs font-medium transition-colors
                    ${config.imageSize === option.value
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
        )}
      </div>
    );
  }

  // 完整模式：显示详细描述
  return (
    <div className="space-y-4">
      {/* 宽高比选择 */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {t('chat.aspectRatio')}
        </label>
        <div className="flex gap-2">
          {ASPECT_RATIO_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange({ aspectRatio: option.value })}
              className={`
                flex-1 px-2 py-2 rounded-lg border-2 transition-all
                ${config.aspectRatio === option.value
                  ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]'
                  : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="text-center">
                <div className="text-lg mb-0.5">{option.icon}</div>
                <div
                  className={`
                    text-xs font-medium
                    ${config.aspectRatio === option.value
                      ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]'
                      : 'text-[var(--text-primary)]'
                    }
                  `}
                >
                  {option.label}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 分辨率选择 - 仅当 supportsImageSize 为 true 时显示 */}
      {supportsImageSize && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-[var(--text-primary)]">
            {t('chat.imageResolution')}
          </label>
          <div className="flex gap-2">
            {imageSizeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange({ imageSize: option.value })}
                className={`
                  flex-1 px-3 py-2 rounded-lg border-2 transition-all
                  ${config.imageSize === option.value
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
                      ${config.imageSize === option.value
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
      )}
    </div>
  );
};

export default ImageConfigPanel;
