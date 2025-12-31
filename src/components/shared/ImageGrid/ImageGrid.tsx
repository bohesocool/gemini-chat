/**
 * 图片网格组件
 * 支持单图和多图布局，支持主题样式
 * Requirements: 3.1, 3.2, 3.3
 */

import { memo } from 'react';
import { ImageItem, type ImageGridTheme } from './ImageItem';
import type { GeneratedImage } from '../../../types/models';
import { IMAGE_GRID_SIZES } from '../../../constants';

// ============ 类型定义 ============

/**
 * 图片网格组件 Props
 */
export interface ImageGridProps {
  /** 图片列表 */
  images: GeneratedImage[];
  /** 图片点击回调 */
  onImageClick?: (index: number) => void;
  /** 主题样式 */
  theme?: ImageGridTheme;
  /** 单图最大尺寸 */
  singleImageSize?: { maxWidth: number; maxHeight: number };
  /** 多图最大尺寸 */
  multiImageSize?: { maxWidth: number; maxHeight: number };
  /** 自定义类名 */
  className?: string;
}

// ============ 默认配置 ============

const DEFAULT_SINGLE_SIZE = { 
  maxWidth: IMAGE_GRID_SIZES.SINGLE_MAX_WIDTH, 
  maxHeight: IMAGE_GRID_SIZES.SINGLE_MAX_HEIGHT 
};
const DEFAULT_MULTI_SIZE = { 
  maxWidth: IMAGE_GRID_SIZES.MULTI_MAX_WIDTH, 
  maxHeight: IMAGE_GRID_SIZES.MULTI_MAX_HEIGHT 
};

// ============ 工具函数 ============

/**
 * 根据图片数量获取网格布局类名
 * Requirements: 3.1
 * @param count 图片数量
 * @returns Tailwind CSS 类名
 */
export function getGridClassName(count: number): string {
  if (count === 1) {
    // 单张图片：不使用网格，直接显示
    return 'flex';
  }
  // 2张以上：2列网格
  return 'grid grid-cols-2';
}

/**
 * 判断是否为单图布局
 * @param count 图片数量
 * @returns 是否为单图布局
 */
export function isSingleImageLayout(count: number): boolean {
  return count === 1;
}

/**
 * 判断是否为多图布局
 * @param count 图片数量
 * @returns 是否为多图布局
 */
export function isMultiImageLayout(count: number): boolean {
  return count > 1;
}

// ============ 主组件 ============

/**
 * 图片网格组件
 * 根据图片数量自适应布局：
 * - 1张: 单列显示 (flex)
 * - 2张以上: 2列网格 (grid)
 * 
 * Requirements: 3.1, 3.2, 3.3
 */
export const ImageGrid = memo(function ImageGrid({
  images,
  onImageClick,
  theme = 'default',
  singleImageSize = DEFAULT_SINGLE_SIZE,
  multiImageSize = DEFAULT_MULTI_SIZE,
  className = '',
}: ImageGridProps) {
  // 如果没有图片，不渲染任何内容
  if (!images || images.length === 0) {
    return null;
  }

  // 根据图片数量决定网格布局类名 - Requirements: 3.1
  const gridClassName = getGridClassName(images.length);

  // 根据主题决定间距样式
  const gapClass = theme === 'purple' ? 'gap-2 mt-3' : 'gap-2 mb-2';

  return (
    <div className={`${gridClassName} ${gapClass} w-fit ${className}`}>
      {images.map((image, index) => (
        <ImageItem
          key={`image-grid-item-${index}`}
          image={image}
          index={index}
          onClick={onImageClick}
          totalCount={images.length}
          theme={theme}
          singleImageSize={singleImageSize}
          multiImageSize={multiImageSize}
        />
      ))}
    </div>
  );
});

export default ImageGrid;
