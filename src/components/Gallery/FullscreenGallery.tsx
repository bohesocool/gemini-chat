/**
 * 全屏图片库组件
 * 替代侧边栏图片库，提供全屏展示模式
 * 需求: 2.1, 3.2, 3.3, 4.4, 5.3, 5.4
 * 需求: 1.4, 3.4 (视图切换动画和响应式布局)
 */

import { useState, useEffect, useCallback, memo, useRef } from 'react';
import { useImageStore } from '../../stores/image';
import { groupImagesByDate } from '../../utils/galleryUtils';
import { GalleryToolbar, type ViewMode } from './GalleryToolbar';
import { ImageCard } from './ImageCard';
import { useTranslation } from '@/i18n';
import type { GeneratedImage } from '../../types';

// ============ 类型定义 ============

export interface FullscreenGalleryProps {
  /** 点击图片的回调 */
  onImageClick?: (image: GeneratedImage) => void;
}

// ============ 视图模式配置 ============

/** 获取网格列数配置 */
export function getGridColumns(viewMode: ViewMode): number {
  return viewMode === 'small' ? 4 : 2;
}

/** 获取网格样式类 - 需求: 1.4 响应式布局优化 */
function getGridClasses(viewMode: ViewMode): string {
  // 响应式网格布局，根据屏幕尺寸自动调整列数
  return viewMode === 'small'
    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8 gap-2 sm:gap-3'
    : 'grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-4';
}

// ============ 图标组件 ============

/** 空状态图标 */
function EmptyIcon({ className }: { className?: string }) {
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

// ============ 子组件 ============

/** 加载状态组件 - 需求: 5.4 */
const LoadingState = memo(function LoadingState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
        <p className="text-neutral-500 dark:text-neutral-400">{t('gallery.loading')}</p>
      </div>
    </div>
  );
});

/** 空状态组件 - 需求: 5.3 */
export const EmptyState = memo(function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex-1 flex items-center justify-center" data-testid="empty-state">
      <div className="flex flex-col items-center gap-4 text-center px-4">
        <EmptyIcon className="w-24 h-24 text-neutral-300 dark:text-neutral-600" />
        <div>
          <h3 className="text-lg font-semibold text-neutral-700 dark:text-neutral-300">
            {t('gallery.noImages')}
          </h3>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {t('gallery.imageHint')}
          </p>
        </div>
      </div>
    </div>
  );
});

// ============ 主组件 ============

/**
 * 全屏图片库组件
 * 集成工具栏和图片网格，支持视图模式切换和日期分组
 * 需求: 3.4 视图切换动画
 */
export const FullscreenGallery = memo(function FullscreenGallery({
  onImageClick,
}: FullscreenGalleryProps) {
  // 状态
  const [viewMode, setViewMode] = useState<ViewMode>('small');
  // 动画状态 - 需求: 3.4
  const [isTransitioning, setIsTransitioning] = useState(false);

  // 滚动容器引用 - 需求: 3.4 保持滚动位置
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);

  // 从 store 获取图片数据
  const { images, isLoading, loadImages } = useImageStore();

  // 加载图片
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // 处理视图模式切换 - 需求: 3.4 保持滚动位置和添加动画
  const handleViewModeChange = useCallback((mode: ViewMode) => {
    // 保存当前滚动位置
    if (scrollContainerRef.current) {
      scrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }

    // 开始过渡动画
    setIsTransitioning(true);

    // 短暂延迟后切换模式，让淡出动画完成
    setTimeout(() => {
      setViewMode(mode);

      // 恢复滚动位置
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = scrollPositionRef.current;
      }

      // 结束过渡动画
      setTimeout(() => {
        setIsTransitioning(false);
      }, 50);
    }, 150);
  }, []);

  // 处理图片点击
  const handleImageClick = useCallback((image: GeneratedImage) => {
    onImageClick?.(image);
  }, [onImageClick]);

  // 按日期分组图片 - 需求: 4.4
  const imageGroups = groupImagesByDate(images);

  // 加载状态 - 需求: 5.4
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900">
        <GalleryToolbar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          imageCount={0}
        />
        <LoadingState />
      </div>
    );
  }

  // 空状态 - 需求: 5.3
  if (images.length === 0) {
    return (
      <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900">
        <GalleryToolbar
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          imageCount={0}
        />
        <EmptyState />
      </div>
    );
  }

  // 图片网格 - 需求: 2.1, 3.2, 3.3, 3.4
  return (
    <div className="flex flex-col h-full bg-neutral-50 dark:bg-neutral-900">
      <GalleryToolbar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        imageCount={images.length}
      />

      {/* 图片内容区 - 需求: 1.4 响应式布局, 3.4 视图切换动画 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div
          className={`transition-opacity duration-150 ease-in-out ${isTransitioning ? 'opacity-0' : 'opacity-100'
            }`}
        >
          {imageGroups.map((group) => (
            <div key={group.dateKey} className="last:mb-0">
              {/* 日期分组标题 - 粘性定位在滚动容器顶部 */}
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-600 dark:text-neutral-400 sticky top-0 bg-neutral-50 dark:bg-neutral-900 py-2 z-10 px-3 sm:px-4 md:px-6 border-b border-neutral-100 dark:border-neutral-800">
                {group.date}
                <span className="ml-2 text-neutral-400 dark:text-neutral-500 font-normal">
                  ({group.images.length})
                </span>
              </h3>

              {/* 图片网格 - 带过渡动画 */}
              <div className={`grid ${getGridClasses(viewMode)} transition-all duration-200 ease-out p-3 sm:p-4 md:p-6`}>
                {group.images.map((image, index) => (
                  <div
                    key={image.id}
                    className="transform transition-all duration-200 ease-out"
                    style={{
                      // 交错动画延迟，让图片依次出现
                      animationDelay: `${Math.min(index * 20, 200)}ms`,
                    }}
                  >
                    <ImageCard
                      image={image}
                      viewMode={viewMode}
                      onClick={() => handleImageClick(image)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

export default FullscreenGallery;
