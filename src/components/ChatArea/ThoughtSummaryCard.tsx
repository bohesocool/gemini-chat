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
import { ImageGrid } from '../shared/ImageGrid';
import type { GeneratedImage } from '../../types/models';
import { useTranslation } from '../../i18n';

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
  // i18n
  const { t } = useTranslation();

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
            {t('chat.thinkingProcess')}
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

          {/* 思维链图片网格 - 使用共享 ImageGrid 组件，紫色主题 */}
          {/* Requirements: 1.1, 1.3, 3.2 */}
          <ImageGrid
            images={images || []}
            onImageClick={handleImageClick}
            theme="purple"
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
