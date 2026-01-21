/**
 * 图片库组件
 * 显示生成的图片历史记录
 * 需求: 2.2, 2.8
 */

import { useEffect, useCallback } from 'react';
import { useImageStore } from '../../stores/image';
import type { GeneratedImage } from '../../types';
import { useTranslation } from '@/i18n';

interface ImageGalleryProps {
  /** 点击图片时的回调 */
  onImageClick: (image: GeneratedImage) => void;
  /** 可选的窗口 ID 过滤 */
  windowId?: string;
}

/**
 * 图片库组件
 * 显示图片缩略图网格，支持点击查看大图
 */
export function ImageGallery({ onImageClick, windowId }: ImageGalleryProps) {
  const { t, locale } = useTranslation();
  const { images, isLoading, loadImages, getImagesByWindow } = useImageStore();

  // 加载图片
  useEffect(() => {
    loadImages();
  }, [loadImages]);

  // 获取要显示的图片列表
  const displayImages = windowId ? getImagesByWindow(windowId) : images;

  // 处理图片点击
  const handleImageClick = useCallback((image: GeneratedImage) => {
    onImageClick(image);
  }, [onImageClick]);

  // 格式化时间
  const formatTime = useCallback((timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const localeStr = locale === 'zh-CN' ? 'zh-CN' : 'en-US';

    if (diffDays === 0) {
      return date.toLocaleTimeString(localeStr, { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return t('common.yesterday');
    } else if (diffDays < 7) {
      return locale === 'zh-CN' ? `${diffDays}天前` : `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString(localeStr, { month: 'short', day: 'numeric' });
    }
  }, [locale, t]);

  // 加载中状态
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  // 空状态
  // 需求: 2.8
  if (displayImages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
        <ImageIcon className="h-16 w-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <p className="text-neutral-500 dark:text-neutral-400 font-medium">
          {t('gallery.noImages')}
        </p>
        <p className="text-sm text-neutral-400 dark:text-neutral-500 mt-1">
          {t('gallery.imageHint')}
        </p>
      </div>
    );
  }

  // 图片网格
  // 需求: 2.2
  return (
    <div className="p-3">
      <div className="grid grid-cols-2 gap-2">
        {displayImages.map((image) => (
          <ImageThumbnail
            key={image.id}
            image={image}
            onClick={() => handleImageClick(image)}
            formatTime={formatTime}
          />
        ))}
      </div>
    </div>
  );
}

interface ImageThumbnailProps {
  image: GeneratedImage;
  onClick: () => void;
  formatTime: (timestamp: number) => string;
}

/**
 * 图片缩略图组件
 */
function ImageThumbnail({ image, onClick, formatTime }: ImageThumbnailProps) {
  const { t } = useTranslation();
  // 构建图片 URL
  const imageUrl = `data:${image.mimeType};base64,${image.data}`;

  return (
    <button
      onClick={onClick}
      className="group relative aspect-square rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-700 hover:ring-2 hover:ring-primary-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
    >
      <img
        src={imageUrl}
        alt={image.prompt || t('gallery.generatedImage')}
        className="w-full h-full object-cover"
        loading="lazy"
      />
      {/* 悬停遮罩 */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-200" />
      {/* 时间标签 */}
      <div className="absolute bottom-0 left-0 right-0 p-1.5 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <p className="text-xs text-white truncate">
          {formatTime(image.createdAt)}
        </p>
      </div>
    </button>
  );
}

/**
 * 图片图标
 */
function ImageIcon({ className }: { className?: string }) {
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

export default ImageGallery;
