/**
 * 生成图片网格组件
 * 用于在消息气泡内显示 AI 生成的图片
 * 需求: 2.2, 2.3
 */

import { useState, useCallback, memo } from 'react';
import type { GeneratedImage } from '../../types/models';

// ============ 类型定义 ============

/**
 * 生成图片网格组件 Props
 */
export interface GeneratedImageGridProps {
  /** 生成的图片列表 */
  images: GeneratedImage[];
  /** 图片点击回调，传入点击的图片索引 */
  onImageClick?: (index: number) => void;
}

// ============ 主组件 ============

/**
 * 生成图片网格组件
 * 根据图片数量自适应布局：
 * - 1张: 单列显示
 * - 2张: 2列显示
 * - 3张以上: 2列网格
 * 
 * 需求: 2.2, 2.3
 */
export const GeneratedImageGrid = memo(function GeneratedImageGrid({
  images,
  onImageClick,
}: GeneratedImageGridProps) {
  // 如果没有图片，不渲染任何内容
  if (!images || images.length === 0) {
    return null;
  }

  // 根据图片数量决定网格布局类名
  const gridClassName = getGridClassName(images.length);

  // 需求 10.3, 10.4, 10.5: 使用 w-fit max-w-full 让网格宽度自适应内容
  return (
    <div className={`${gridClassName} gap-2 mb-2 w-fit`}>
      {images.map((image, index) => (
        <ImageItem
          key={`generated-image-${index}`}
          image={image}
          index={index}
          onClick={onImageClick}
          totalCount={images.length}
        />
      ))}
    </div>
  );
});

// ============ 子组件 ============

/**
 * 单个图片项组件 Props
 */
interface ImageItemProps {
  /** 图片数据 */
  image: GeneratedImage;
  /** 图片索引 */
  index: number;
  /** 点击回调 */
  onClick?: (index: number) => void;
  /** 图片总数（用于布局计算） */
  totalCount: number;
}

/**
 * 单个图片项组件
 * 支持加载状态、错误处理和点击预览
 */
const ImageItem = memo(function ImageItem({
  image,
  index,
  onClick,
  totalCount,
}: ImageItemProps) {
  // 加载状态
  const [isLoading, setIsLoading] = useState(true);
  // 错误状态
  const [hasError, setHasError] = useState(false);

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

  // 根据图片数量决定单个图片的样式
  const imageClassName = getImageClassName(totalCount);

  // 错误状态显示
  if (hasError) {
    return (
      <div
        className={`
          ${imageClassName}
          flex items-center justify-center
          bg-neutral-100 dark:bg-neutral-800
          rounded-xl border border-neutral-200 dark:border-neutral-700
        `}
      >
        <div className="flex flex-col items-center gap-2 text-neutral-400 dark:text-neutral-500">
          <ErrorIcon className="w-8 h-8" />
          <span className="text-xs">图片加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative`}>
      {/* 加载状态骨架屏 */}
      {isLoading && (
        <div
          className="
            absolute inset-0
            bg-neutral-100 dark:bg-neutral-800
            rounded-xl animate-pulse
          "
        />
      )}
      
      {/* 图片 */}
      {/* 需求 6.1, 6.2: 使用 object-contain 保持原始比例，不强制 1:1 */}
      {/* 需求 7.6: 悬停时显示可点击反馈 */}
      <img
        src={imageUrl}
        alt={`生成的图片 ${index + 1}`}
        className={`
          ${imageClassName}
          h-auto object-contain rounded-xl
          cursor-pointer hover:opacity-90 transition-all duration-200
          shadow-md hover:shadow-lg hover:scale-[1.02]
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleClick}
      />
    </div>
  );
});

// ============ 工具函数 ============

/**
 * 根据图片数量获取网格布局类名
 * @param count 图片数量
 * @returns Tailwind CSS 类名
 */
function getGridClassName(count: number): string {
  if (count === 1) {
    // 单张图片：不使用网格，直接显示
    return 'flex';
  }
  if (count === 2) {
    // 2张图片：2列网格
    return 'grid grid-cols-2';
  }
  // 3张以上：2列网格
  return 'grid grid-cols-2';
}

/**
 * 根据图片总数获取单个图片的样式类名
 * 聊天页面图片应该适中大小，点击可放大查看详情
 * @param totalCount 图片总数
 * @returns Tailwind CSS 类名
 */
function getImageClassName(totalCount: number): string {
  if (totalCount === 1) {
    // 单张图片：限制最大宽度和高度，保持适中大小
    // 最大宽度 240px，最大高度 200px，适合聊天界面
    return 'max-w-[240px] max-h-[200px]';
  }
  // 多张图片：使用更小的尺寸
  // 最大宽度 150px，最大高度 130px
  return 'max-w-[150px] max-h-[130px]';
}

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

// ============ 导出 ============

export default GeneratedImageGrid;
