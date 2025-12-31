/**
 * 图片项组件
 * 支持加载状态、错误状态和主题样式
 * Requirements: 3.4, 3.5
 */

import { useState, useCallback, memo } from 'react';
import type { GeneratedImage } from '../../../types/models';
import { IMAGE_GRID_SIZES } from '../../../constants';

// ============ 类型定义 ============

/**
 * 主题类型
 */
export type ImageGridTheme = 'default' | 'purple';

/**
 * 图片项组件 Props
 */
export interface ImageItemProps {
  /** 图片数据 */
  image: GeneratedImage;
  /** 图片索引 */
  index: number;
  /** 点击回调 */
  onClick?: (index: number) => void;
  /** 图片总数（用于布局计算） */
  totalCount: number;
  /** 主题样式 */
  theme?: ImageGridTheme;
  /** 单图最大尺寸 */
  singleImageSize?: { maxWidth: number; maxHeight: number };
  /** 多图最大尺寸 */
  multiImageSize?: { maxWidth: number; maxHeight: number };
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

// ============ 主题样式配置 ============

const THEME_STYLES = {
  default: {
    skeleton: 'bg-neutral-100 dark:bg-neutral-800',
    error: {
      bg: 'bg-neutral-100 dark:bg-neutral-800',
      border: 'border border-neutral-200 dark:border-neutral-700',
      text: 'text-neutral-400 dark:text-neutral-500',
    },
    image: {
      border: '',
      hoverBorder: '',
      shadow: 'shadow-md hover:shadow-lg',
    },
  },
  purple: {
    skeleton: 'bg-purple-100 dark:bg-purple-900/30',
    error: {
      bg: 'bg-purple-100 dark:bg-purple-900/30',
      border: 'border-2 border-purple-200/60 dark:border-purple-700/40',
      text: 'text-purple-400 dark:text-purple-500',
    },
    image: {
      border: 'border-2 border-purple-200/60 dark:border-purple-700/40',
      hoverBorder: 'hover:border-purple-400 dark:hover:border-purple-500',
      shadow: 'hover:shadow-lg',
    },
  },
} as const;

// ============ 主组件 ============

/**
 * 单个图片项组件
 * 支持加载状态、错误处理和主题样式
 * Requirements: 3.4, 3.5
 */
export const ImageItem = memo(function ImageItem({
  image,
  index,
  onClick,
  totalCount,
  theme = 'default',
  singleImageSize = DEFAULT_SINGLE_SIZE,
  multiImageSize = DEFAULT_MULTI_SIZE,
}: ImageItemProps) {
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  // 错误状态
  const [hasError, setHasError] = useState(false);

  // 获取主题样式
  const themeStyles = THEME_STYLES[theme];

  // 根据图片数量决定尺寸
  const size = totalCount === 1 ? singleImageSize : multiImageSize;
  const sizeClass = `max-w-[${size.maxWidth}px] max-h-[${size.maxHeight}px]`;

  // 处理图片加载完成
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // 处理图片加载错误
  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  // 处理图片点击
  const handleClick = useCallback(() => {
    if (onClick && !hasError) {
      onClick(index);
    }
  }, [onClick, index, hasError]);

  // 构建图片 URL
  const imageUrl = `data:${image.mimeType};base64,${image.data}`;

  // 错误状态显示 - Requirements: 3.5
  if (hasError) {
    return (
      <div
        className={`
          ${sizeClass}
          flex items-center justify-center
          ${themeStyles.error.bg}
          rounded-xl ${themeStyles.error.border}
        `}
        style={{ maxWidth: size.maxWidth, maxHeight: size.maxHeight, minWidth: 100, minHeight: 80 }}
      >
        <div className={`flex flex-col items-center gap-2 ${themeStyles.error.text}`}>
          <ErrorIcon className="w-8 h-8" />
          <span className="text-xs">图片加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* 加载状态骨架屏 - Requirements: 3.4 */}
      {isLoading && (
        <div
          className={`
            absolute inset-0
            ${themeStyles.skeleton}
            rounded-xl animate-pulse
          `}
        />
      )}
      
      {/* 图片 */}
      <img
        src={imageUrl}
        alt={`图片 ${index + 1}`}
        title={theme === 'purple' ? '点击放大' : undefined}
        className={`
          h-auto object-contain rounded-xl
          cursor-pointer hover:opacity-90 transition-all duration-200
          hover:scale-[1.02]
          ${themeStyles.image.border}
          ${themeStyles.image.hoverBorder}
          ${themeStyles.image.shadow}
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        style={{ maxWidth: size.maxWidth, maxHeight: size.maxHeight }}
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleClick}
      />
      
      {/* 紫色主题悬停提示 */}
      {theme === 'purple' && (
        <div className="
          absolute bottom-1 left-1/2 -translate-x-1/2
          px-2 py-0.5 rounded text-xs
          bg-purple-500/80 text-white
          opacity-0 group-hover:opacity-100
          transition-opacity duration-200
          pointer-events-none
        ">
          点击放大
        </div>
      )}
    </div>
  );
});

// ============ 图标组件 ============

/**
 * 错误图标
 */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export default ImageItem;
