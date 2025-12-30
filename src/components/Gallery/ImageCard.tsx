/**
 * 图片卡片组件
 * 显示单张图片的缩略图和日期信息
 * 需求: 4.1, 5.1, 5.2, 5.3
 * 需求: 1.4, 3.4 (响应式布局和动画优化)
 */

import { memo, useState, useCallback } from 'react';
import type { GeneratedImage } from '../../types';
import { formatImageDate } from '../../utils/galleryUtils';
import type { ViewMode } from './GalleryToolbar';

// ============ 类型定义 ============

export interface ImageCardProps {
  /** 图片数据 */
  image: GeneratedImage;
  /** 视图模式 */
  viewMode: ViewMode;
  /** 点击回调 */
  onClick: () => void;
}

// ============ 图标组件 ============

/** 图片占位图标 */
function ImagePlaceholderIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

// ============ 主组件 ============

/**
 * 图片卡片组件
 * 显示图片缩略图、日期信息、规格信息，支持悬停效果
 */
export const ImageCard = memo(function ImageCard({
  image,
  viewMode,
  onClick,
}: ImageCardProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // 构建图片 URL
  const imageUrl = `data:${image.mimeType};base64,${image.data}`;

  // 格式化日期
  const dateText = formatImageDate(image.createdAt);

  // 处理图片加载完成
  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  // 处理图片加载错误
  const handleError = useCallback(() => {
    setHasError(true);
  }, []);

  // 根据视图模式设置样式 - 需求: 1.4 响应式布局
  const sizeClasses = 'aspect-square w-full';
  
  // 响应式圆角 - 小屏幕使用较小圆角
  const roundedClasses = viewMode === 'large' 
    ? 'rounded-lg sm:rounded-xl' 
    : 'rounded-md sm:rounded-lg';

  // 是否有规格信息 - 需求: 5.1, 5.2
  const hasSpecs = image.aspectRatio || image.imageSize;

  return (
    <button
      onClick={onClick}
      className={`
        group relative ${sizeClasses} ${roundedClasses} overflow-hidden 
        bg-neutral-100 dark:bg-neutral-700 
        hover:ring-2 hover:ring-primary-500 hover:ring-offset-1 sm:hover:ring-offset-2 
        dark:hover:ring-offset-neutral-800 
        transition-all duration-200 ease-out
        focus:outline-none focus:ring-2 focus:ring-primary-500 
        focus:ring-offset-1 sm:focus:ring-offset-2 dark:focus:ring-offset-neutral-800
        active:scale-[0.98] sm:active:scale-100
      `}
      aria-label={image.prompt || '查看图片'}
    >
      {/* 加载占位符 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700">
          <div className="animate-pulse">
            <ImagePlaceholderIcon className="w-12 h-12 text-neutral-300 dark:text-neutral-500" />
          </div>
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-100 dark:bg-neutral-700">
          <ImagePlaceholderIcon className="w-12 h-12 text-neutral-400 dark:text-neutral-500" />
        </div>
      )}

      {/* 图片 */}
      {!hasError && (
        <img
          src={imageUrl}
          alt={image.prompt || '生成的图片'}
          className={`w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          loading="lazy"
          onLoad={handleLoad}
          onError={handleError}
        />
      )}

      {/* 规格标签 - 需求: 5.1, 5.2 */}
      {hasSpecs && (
        <div className="absolute top-2 left-2 flex gap-1">
          {image.aspectRatio && (
            <span className="px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-xs text-white font-medium">
              {image.aspectRatio}
            </span>
          )}
          {image.imageSize && (
            <span className="px-1.5 py-0.5 bg-black/50 backdrop-blur-sm rounded text-xs text-white font-medium">
              {image.imageSize}
            </span>
          )}
        </div>
      )}

      {/* 悬停遮罩 - 需求: 5.1, 5.3 */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />

      {/* 日期和规格信息 - 需求: 4.1, 1.4, 5.3 响应式布局 */}
      <div className="absolute bottom-0 left-0 right-0 p-2 sm:p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-xs sm:text-sm font-medium text-white truncate">
          {dateText}
        </p>
        {/* 悬停时显示完整规格信息 - 需求: 5.3 */}
        {hasSpecs && (
          <p className="text-[10px] sm:text-xs text-white/80 mt-0.5">
            {[image.aspectRatio, image.imageSize].filter(Boolean).join(' · ')}
          </p>
        )}
        {image.prompt && viewMode === 'large' && (
          <p className="text-[10px] sm:text-xs text-white/80 truncate mt-0.5">
            {image.prompt}
          </p>
        )}
      </div>

      {/* 始终显示的日期角标（小图标模式）- 需求: 1.4 响应式布局 */}
      {viewMode === 'small' && (
        <div className="absolute top-1 right-1 sm:top-2 sm:right-2 px-1.5 sm:px-2 py-0.5 bg-black/50 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <span className="text-[10px] sm:text-xs text-white font-medium">{dateText}</span>
        </div>
      )}
    </button>
  );
});

export default ImageCard;
