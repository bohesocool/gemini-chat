/**
 * 思维链卡片组件
 * 显示模型的思考过程摘要，支持折叠/展开
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4
 * Requirements: 1.1, 1.2, 1.3, 2.1, 3.1, 3.2, 4.1, 4.2 (思维链自动折叠)
 * Requirements: 1.1, 1.3, 3.2 (思维链图片网格布局)
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ImagePreviewModal } from '../ImagePreviewModal';
import type { GeneratedImage } from '../../types/models';

// ============ 思维链图片组件 ============

/**
 * 思维链图片网格组件 Props
 * 复用 GeneratedImageGrid 的布局逻辑，使用紫色主题样式
 * Requirements: 1.1, 1.3, 3.2
 */
interface ThinkingImageGridProps {
  /** 思维链中的图片列表 */
  images: GeneratedImage[];
  /** 图片点击回调 */
  onImageClick: (index: number) => void;
}

/**
 * 思维链图片网格组件
 * 复用 GeneratedImageGrid 的布局逻辑：单图 flex，多图 grid-cols-2
 * 使用紫色主题边框样式
 * Requirements: 1.1, 1.3, 3.2
 */
function ThinkingImageGrid({ images, onImageClick }: ThinkingImageGridProps) {
  if (!images || images.length === 0) return null;

  // 复用 GeneratedImageGrid 的网格布局逻辑
  const gridClassName = images.length === 1 
    ? 'flex' 
    : 'grid grid-cols-2 gap-2';

  return (
    <div className={`${gridClassName} mt-3 w-fit`}>
      {images.map((image, index) => (
        <ThinkingImageItem
          key={`thinking-image-${index}`}
          image={image}
          index={index}
          onClick={onImageClick}
          totalCount={images.length}
        />
      ))}
    </div>
  );
}

/**
 * 单个思维链图片项 Props
 * Requirements: 1.2, 1.4, 3.1, 3.3
 */
interface ThinkingImageItemProps {
  /** 图片数据 */
  image: GeneratedImage;
  /** 图片索引 */
  index: number;
  /** 点击回调 */
  onClick: (index: number) => void;
  /** 图片总数（用于布局计算） */
  totalCount: number;
}

/**
 * 单个思维链图片项组件
 * 使用紫色主题样式，支持加载状态和错误处理
 * Requirements: 1.2, 1.4, 3.1, 3.3
 */
function ThinkingImageItem({ image, index, onClick, totalCount }: ThinkingImageItemProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const imageUrl = `data:${image.mimeType};base64,${image.data}`;
  
  // 根据图片数量决定尺寸（与 GeneratedImageGrid 一致）
  // 单图: 240x200，多图: 150x130
  const sizeClass = totalCount === 1 
    ? 'max-w-[240px] max-h-[200px]' 
    : 'max-w-[150px] max-h-[130px]';

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
    if (!hasError) {
      onClick(index);
    }
  }, [onClick, index, hasError]);

  // 错误状态显示
  if (hasError) {
    return (
      <div
        className={`
          ${sizeClass}
          flex items-center justify-center
          bg-purple-100 dark:bg-purple-900/30
          rounded-lg border-2 border-purple-200/60 dark:border-purple-700/40
        `}
      >
        <div className="flex flex-col items-center gap-2 text-purple-400 dark:text-purple-500">
          <ErrorIcon className="w-8 h-8" />
          <span className="text-xs">图片加载失败</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* 加载骨架屏 */}
      {isLoading && (
        <div className="absolute inset-0 bg-purple-100 dark:bg-purple-900/30 rounded-lg animate-pulse" />
      )}
      
      <img
        src={imageUrl}
        alt={`思维链图片 ${index + 1}`}
        title="点击放大"
        className={`
          ${sizeClass}
          h-auto object-contain rounded-lg
          cursor-pointer transition-all duration-200
          border-2 border-purple-200/60 dark:border-purple-700/40
          hover:border-purple-400 dark:hover:border-purple-500
          hover:shadow-lg hover:scale-[1.02]
          ${isLoading ? 'opacity-0' : 'opacity-100'}
        `}
        onLoad={handleLoad}
        onError={handleError}
        onClick={handleClick}
      />
      
      {/* 悬停提示 - Requirements: 3.3 */}
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
    </div>
  );
}

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

// ============ 类型定义 ============

export interface ThoughtSummaryCardProps {
  /** 思维链内容 */
  content: string;
  /** 是否正在流式输出 - Requirements: 1.1, 3.1 */
  isStreaming?: boolean;
  /** 思维链中的图片（不进入图片库，仅在思维链区域显示） */
  images?: GeneratedImage[];
}

// ============ 主组件 ============

/**
 * 思维链卡片组件
 * 
 * Requirements:
 * - 6.1: 使用不同的背景色和边框样式与普通内容区分
 * - 6.2: 在摘要前显示"思考过程"标题
 * - 6.3: 支持折叠/展开功能
 * - 6.4: 平滑动画切换显示状态
 * - 1.1, 3.1: 流式输出时保持展开状态
 * - 1.2, 3.2: 流式完成后自动折叠
 * - 1.3, 4.2: 用户手动操作覆盖自动行为
 * - 2.1, 4.1: 非流式/历史消息默认折叠
 */
export function ThoughtSummaryCard({
  content,
  isStreaming = false,
  images,
}: ThoughtSummaryCardProps) {
  // 初始展开状态：流式输出时展开，否则折叠 - Requirements: 1.1, 2.1, 3.1, 4.1
  const [isExpanded, setIsExpanded] = useState(isStreaming ? true : false);
  // 追踪用户是否手动操作过 - Requirements: 1.3, 4.2
  const [userHasInteracted, setUserHasInteracted] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  // 追踪上一次的 isStreaming 值，用于检测状态变化
  const prevIsStreamingRef = useRef(isStreaming);
  // 图片预览状态
  const [previewImageIndex, setPreviewImageIndex] = useState<number | null>(null);

  // 监听 isStreaming 从 true 变为 false，自动折叠 - Requirements: 1.2, 3.2
  useEffect(() => {
    const prevIsStreaming = prevIsStreamingRef.current;
    
    // 当 isStreaming 从 true 变为 false 且用户未手动操作时，自动折叠
    if (prevIsStreaming && !isStreaming && !userHasInteracted) {
      setIsExpanded(false);
    }
    
    // 更新 ref 以便下次比较
    prevIsStreamingRef.current = isStreaming;
  }, [isStreaming, userHasInteracted]);

  // 切换展开/折叠状态 - Requirements: 1.3, 4.2
  const handleToggle = () => {
    // 标记用户已手动操作，后续自动折叠不再生效
    setUserHasInteracted(true);
    setIsExpanded(!isExpanded);
  };

  // 处理图片点击
  const handleImageClick = useCallback((index: number) => {
    setPreviewImageIndex(index);
  }, []);

  // 关闭图片预览
  const handleClosePreview = useCallback(() => {
    setPreviewImageIndex(null);
  }, []);

  // 获取当前预览的图片
  const previewImage = previewImageIndex !== null && images && images[previewImageIndex]
    ? images[previewImageIndex] 
    : null;

  return (
    <div
      className="
        mb-3 rounded-xl overflow-hidden
        bg-gradient-to-r from-purple-50 to-indigo-50
        dark:from-purple-900/20 dark:to-indigo-900/20
        border border-purple-200/60 dark:border-purple-700/40
        shadow-sm
      "
    >
      {/* 标题栏 - Requirements: 6.2, 6.3 */}
      <button
        onClick={handleToggle}
        className="
          w-full flex items-center justify-between
          px-4 py-3
          text-left
          hover:bg-purple-100/50 dark:hover:bg-purple-800/20
          transition-colors duration-150
          focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50
        "
        aria-expanded={isExpanded}
        aria-controls="thought-content"
      >
        <div className="flex items-center gap-2">
          <ThinkingIcon className="w-4 h-4 text-purple-500 dark:text-purple-400" />
          <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
            思考过程
          </span>
        </div>
        <ChevronIcon
          className={`
            w-4 h-4 text-purple-500 dark:text-purple-400
            transform transition-transform duration-200
            ${isExpanded ? 'rotate-180' : 'rotate-0'}
          `}
        />
      </button>

      {/* 内容区域 - Requirements: 6.3, 6.4 */}
      <div
        id="thought-content"
        className={`
          overflow-hidden
          transition-all duration-300 ease-in-out
          ${isExpanded ? 'max-h-[5000px] opacity-100' : 'max-h-0 opacity-0'}
        `}
      >
        <div
          ref={contentRef}
          className="
            px-4 pb-4 pt-1
            text-sm text-purple-800/80 dark:text-purple-200/80
            leading-relaxed
            whitespace-pre-wrap break-words
          "
        >
          {content}
          
          {/* 思维链图片网格 - 使用新组件 Requirements: 1.1, 1.3, 3.2 */}
          <ThinkingImageGrid 
            images={images || []} 
            onImageClick={handleImageClick} 
          />
        </div>
      </div>
      
      {/* 图片预览模态框 - 复用 ImagePreviewModal Requirements: 2.1 */}
      <ImagePreviewModal
        image={previewImage}
        isOpen={previewImageIndex !== null}
        onClose={handleClosePreview}
      />
    </div>
  );
}

// ============ 图标组件 ============

/**
 * 思考图标 - 大脑/灯泡样式
 */
function ThinkingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

/**
 * 展开/折叠箭头图标
 */
function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}

export default ThoughtSummaryCard;
