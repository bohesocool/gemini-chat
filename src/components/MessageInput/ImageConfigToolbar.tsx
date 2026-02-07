/**
 * 图片配置工具栏组件
 * 在消息输入框工具栏中显示宽高比和分辨率选择按钮
 * 
 * Requirements: 2.2, 2.3, 2.4, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 6.4
 */

import { useCallback, useMemo } from 'react';
import { DropdownButton, type DropdownOption } from './DropdownButton';
import type { ImageGenerationConfig, ImageAspectRatio, ImageSize } from '../../types/models';
import { useTranslation } from '../../i18n';

/**
 * 图片配置工具栏属性
 */
export interface ImageConfigToolbarProps {
  /** 当前图片配置 */
  config: ImageGenerationConfig;
  /** 配置变更回调 */
  onChange: (config: Partial<ImageGenerationConfig>) => void;
  /** 是否禁用 - Requirements: 6.4 */
  disabled?: boolean;
  /** 是否支持图片分辨率设置 - Requirements: 3.1, 3.4 */
  supportsImageSize?: boolean;
}

/**
 * 宽高比选项列表
 * Requirements: 2.2
 */
const ASPECT_RATIO_OPTIONS: DropdownOption<ImageAspectRatio>[] = [
  { value: '1:1', label: '1:1' },
  { value: '16:9', label: '16:9' },
  { value: '9:16', label: '9:16' },
  { value: '4:3', label: '4:3' },
  { value: '3:4', label: '3:4' },
  { value: '3:2', label: '3:2' },
  { value: '2:3', label: '2:3' },
  { value: '5:4', label: '5:4' },
  { value: '4:5', label: '4:5' },
  { value: '21:9', label: '21:9' },
];

/**
 * 分辨率选项列表（动态获取以支持 i18n）
 * Requirements: 3.2
 */
function useImageSizeOptions(): DropdownOption<ImageSize>[] {
  const { t } = useTranslation();
  return useMemo(() => [
    { value: '1K', label: '1K', description: t('chat.resolutionStandard') },
    { value: '2K', label: '2K', description: t('chat.resolutionHD') },
    { value: '4K', label: '4K', description: t('chat.resolutionUltraHD') },
  ], [t]);
}

/**
 * 图片配置工具栏组件
 * 在消息输入框工具栏中显示宽高比和分辨率选择按钮
 * 
 * Requirements:
 * - 2.2, 2.3, 2.4: 宽高比选择功能
 * - 3.2, 3.3, 3.4: 分辨率选择功能
 * - 4.1, 4.2, 4.3: 配置状态显示
 * - 6.4: 禁用状态传递
 */
export function ImageConfigToolbar({
  config,
  onChange,
  disabled = false,
  supportsImageSize = true,
}: ImageConfigToolbarProps) {
  const { t } = useTranslation();
  const imageSizeOptions = useImageSizeOptions();
  /**
   * 处理宽高比选择
   * Requirements: 2.3, 2.4, 4.1, 4.3
   */
  const handleAspectRatioChange = useCallback(
    (aspectRatio: ImageAspectRatio) => {
      onChange({ aspectRatio });
    },
    [onChange]
  );

  /**
   * 处理分辨率选择
   * Requirements: 3.3, 3.4, 4.2, 4.3
   */
  const handleImageSizeChange = useCallback(
    (imageSize: ImageSize) => {
      onChange({ imageSize });
    },
    [onChange]
  );

  return (
    <div className="flex items-center gap-1">
      {/* 宽高比选择按钮 - Requirements: 2.2, 2.3, 2.4, 4.1 */}
      <DropdownButton
        value={config.aspectRatio}
        options={ASPECT_RATIO_OPTIONS}
        onSelect={handleAspectRatioChange}
        label={t('chat.aspectRatio')}
        disabled={disabled}
      />

      {/* 分辨率选择按钮 - Requirements: 3.2, 3.3, 3.4, 4.2 */}
      {supportsImageSize && (
        <DropdownButton
          value={config.imageSize}
          options={imageSizeOptions}
          onSelect={handleImageSizeChange}
          label={t('chat.resolution')}
          disabled={disabled}
        />
      )}
    </div>
  );
}

export default ImageConfigToolbar;
