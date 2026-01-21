/**
 * 图片库工具栏组件
 * 包含视图模式切换和返回按钮
 * 需求: 3.1
 * 需求: 1.4 (响应式布局优化)
 */

import { memo } from 'react';
import { useTranslation } from '@/i18n';

// ============ 类型定义 ============

export type ViewMode = 'small' | 'large';

export interface GalleryToolbarProps {
  /** 当前视图模式 */
  viewMode: ViewMode;
  /** 视图模式变更回调 */
  onViewModeChange: (mode: ViewMode) => void;
  /** 返回对话回调 */
  onBackToChat: () => void;
  /** 图片总数 */
  imageCount: number;
}

// ============ 图标组件 ============

/** 返回箭头图标 */
function ArrowLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
    </svg>
  );
}

/** 小图标视图图标 */
function GridSmallIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  );
}

/** 大图标视图图标 */
function GridLargeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 6a2 2 0 012-2h5a2 2 0 012 2v5a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h5a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM15 4a2 2 0 012-2h1a2 2 0 012 2v14a2 2 0 01-2 2h-1a2 2 0 01-2-2V4z" />
    </svg>
  );
}

// ============ 主组件 ============

/**
 * 图片库工具栏
 * 提供视图模式切换按钮、返回按钮和图片计数
 * 需求: 1.4 响应式布局
 */
export const GalleryToolbar = memo(function GalleryToolbar({
  viewMode,
  onViewModeChange,
  onBackToChat,
  imageCount,
}: GalleryToolbarProps) {
  const { t } = useTranslation();
  
  return (
    <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 transition-colors duration-200">
      {/* 左侧：返回按钮和标题 - 响应式布局 */}
      <div className="flex items-center gap-1.5 sm:gap-3">
        <button
          onClick={onBackToChat}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm font-medium text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-700 rounded-md sm:rounded-lg transition-colors active:scale-95 sm:active:scale-100"
          aria-label={t('gallery.backToChat')}
        >
          <ArrowLeftIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="hidden xs:inline">{t('gallery.backToChat')}</span>
          <span className="xs:hidden">{t('gallery.back')}</span>
        </button>
        <div className="hidden sm:block h-5 w-px bg-neutral-200 dark:bg-neutral-600" />
        <h2 className="text-sm sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100">
          {t('gallery.title')}
        </h2>
        <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">
          ({imageCount})
        </span>
      </div>

      {/* 右侧：视图模式切换 - 响应式布局 */}
      <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-neutral-100 dark:bg-neutral-700 rounded-md sm:rounded-lg transition-colors duration-200">
        <button
          onClick={() => onViewModeChange('small')}
          className={`p-1.5 sm:p-2 rounded-md transition-all duration-200 ${
            viewMode === 'small'
              ? 'bg-white dark:bg-neutral-600 text-primary-600 dark:text-primary-400 shadow-sm scale-100'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-105'
          }`}
          aria-label="小图标视图"
          aria-pressed={viewMode === 'small'}
        >
          <GridSmallIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <button
          onClick={() => onViewModeChange('large')}
          className={`p-1.5 sm:p-2 rounded-md transition-all duration-200 ${
            viewMode === 'large'
              ? 'bg-white dark:bg-neutral-600 text-primary-600 dark:text-primary-400 shadow-sm scale-100'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:scale-105'
          }`}
          aria-label="大图标视图"
          aria-pressed={viewMode === 'large'}
        >
          <GridLargeIcon className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
    </div>
  );
});

export default GalleryToolbar;
