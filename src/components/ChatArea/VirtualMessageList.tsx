/**
 * 虚拟滚动消息列表组件
 * 需求: 1.1, 1.3, 1.4, 1.5 - 虚拟滚动、自动滚动、动态高度支持
 *
 * 子组件拆分见：MessageItem.tsx、StreamingMessage.tsx、MessageListParts.tsx、
 * MessageErrors.tsx、MessageAttachments.tsx
 */

import { useRef, useEffect, useCallback, useState, memo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message, GeneratedImage } from '../../types/models';
import { useReducedMotion } from '../motion';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { MessageItem } from './MessageItem';
import { StreamingMessage } from './StreamingMessage';
import { EmptyState } from './MessageListParts';
import { ErrorMessage } from './MessageErrors';

// ============ 类型定义 ============

/**
 * 虚拟滚动配置接口
 */
export interface VirtualScrollConfig {
  /** 预渲染缓冲区大小（上下各多渲染的项数） */
  overscan: number;
  /** 估算的单项高度（用于初始计算） */
  estimatedItemHeight: number;
}

/**
 * 虚拟消息列表 Props
 */
export interface VirtualMessageListProps {
  /** 消息列表 */
  messages: Message[];
  /** 是否正在发送 */
  isSending?: boolean;
  /** 流式响应文本 */
  streamingText?: string;
  /** 流式思维链内容 - 需求 3.3, 3.4 */
  streamingThought?: string;
  /** 流式生成的图片 - 需求 5.1: 流式响应图片显示 */
  streamingImages?: GeneratedImage[];
  /** 错误信息（已废弃，改用消息级别的错误） */
  error?: string | null;
  /** 重试回调（接收 messageId 参数） */
  onRetry?: (messageId: string) => void;
  /** 关闭错误提示回调（接收 messageId 参数） */
  onDismissError?: (messageId: string) => void;
  /** 渲染消息内容的函数 */
  renderContent?: (content: string) => React.ReactNode;
  /** 消息编辑回调 - 需求 1.4, 1.5: 支持 resend 参数 */
  onEditMessage?: (messageId: string, newContent: string, resend: boolean) => void;
  /** 消息重新生成回调 */
  onRegenerateMessage?: (messageId: string) => void;
  /** 消息删除回调 */
  onDeleteMessage?: (messageId: string) => void;
  /** 虚拟滚动配置 */
  config?: Partial<VirtualScrollConfig>;
  /** 正在重新生成的消息 ID - 需求 1.1, 2.1 */
  regeneratingMessageId?: string | null;
  /** 图片点击回调 - 需求 2.4: 点击图片打开预览 */
  onImageClick?: (images: GeneratedImage[], index: number) => void;
  /** 窗口 ID（用于书签） - 需求 3.1 */
  windowId?: string;
  /** 子话题 ID（用于书签） - 需求 3.1 */
  subTopicId?: string;
  /** 窗口标题（用于书签） - 需求 3.1 */
  windowTitle?: string;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: VirtualScrollConfig = {
  overscan: 5,
  estimatedItemHeight: 120,
};

// ============ 主组件 ============

/**
 * 虚拟滚动消息列表组件
 *
 * 需求:
 * - 1.1: 使用虚拟滚动技术只渲染可视区域内的消息项
 * - 1.3: 新消息到达时自动滚动到底部
 * - 1.4: 用户向上滚动时暂停自动滚动
 * - 1.5: 正确计算并渲染动态高度的消息项
 */
function VirtualMessageListInner({
  messages,
  isSending = false,
  streamingText = '',
  streamingThought = '',
  streamingImages = [],
  error = null,
  onRetry,
  onDismissError,
  renderContent,
  onEditMessage,
  onRegenerateMessage,
  onDeleteMessage,
  config: userConfig,
  regeneratingMessageId = null,
  onImageClick,
  windowId,
  subTopicId,
  windowTitle,
}: VirtualMessageListProps) {
  const config = { ...DEFAULT_CONFIG, ...userConfig };
  const parentRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // 是否在底部状态（用于自动滚动控制）
  const [isAtBottom, setIsAtBottom] = useState(true);
  // 上一次消息数量（用于检测新消息）
  const prevMessageCountRef = useRef(messages.length);

  // 需求 7.1, 7.2: 图片预览状态
  const [previewImages, setPreviewImages] = useState<GeneratedImage[]>([]);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 判断是否为新消息发送（而非重新生成）- 需求 2.1, 2.2, 2.3
  const isNewMessageSending = isSending && !regeneratingMessageId;

  // 计算总项数（消息 + 流式响应 + 加载指示器）
  // 只有在发送新消息时才增加行数，重新生成时保持不变
  const totalCount = messages.length + (isNewMessageSending ? 1 : 0);

  // 虚拟化器配置
  const virtualizer = useVirtualizer({
    count: totalCount,
    getScrollElement: () => parentRef.current,
    estimateSize: () => config.estimatedItemHeight,
    overscan: config.overscan,
    // 启用动态高度测量
    measureElement: (element) => {
      return element.getBoundingClientRect().height;
    },
  });

  // 检测滚动位置，判断是否在底部
  const handleScroll = useCallback(() => {
    const container = parentRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    // 允许 50px 的误差范围
    const atBottom = scrollHeight - scrollTop - clientHeight < 50;
    setIsAtBottom(atBottom);
  }, []);

  // 滚动到底部
  const scrollToBottom = useCallback((smooth = true) => {
    if (!parentRef.current) return;

    const container = parentRef.current;
    container.scrollTo({
      top: container.scrollHeight,
      behavior: reducedMotion || !smooth ? 'auto' : 'smooth',
    });
  }, [reducedMotion]);

  // 新消息到达时自动滚动（仅当在底部时）
  // 需求: 1.3, 1.4
  useEffect(() => {
    const currentCount = messages.length;
    const prevCount = prevMessageCountRef.current;

    // 检测到新消息
    if (currentCount > prevCount) {
      if (isAtBottom) {
        // 在底部时自动滚动
        requestAnimationFrame(() => scrollToBottom(true));
      }
    }

    prevMessageCountRef.current = currentCount;
  }, [messages.length, isAtBottom, scrollToBottom]);

  // 流式响应时持续滚动到底部
  useEffect(() => {
    if (isSending && streamingText && isAtBottom) {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [streamingText, isSending, isAtBottom, scrollToBottom]);

  // 渲染内容（默认直接显示文本）
  const renderMessageContent = useCallback((content: string) => {
    if (renderContent) {
      return renderContent(content);
    }
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  }, [renderContent]);

  // 需求 7.1: 处理图片点击，打开预览模态框
  const handleImagePreview = useCallback((images: GeneratedImage[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
    setIsPreviewOpen(true);
  }, []);

  // 关闭图片预览
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewImages([]);
    setPreviewIndex(0);
  }, []);

  // 获取虚拟项
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-y-auto px-4 py-6 scroll-smooth"
      onScroll={handleScroll}
    >
      {/* 空状态 */}
      {messages.length === 0 && !isSending && (
        <EmptyState />
      )}

      {/* 虚拟滚动容器 */}
      {totalCount > 0 && (
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualItems.map((virtualItem) => {
            const index = virtualItem.index;
            // 更新 isStreamingItem 判断 - 需求 1.1, 2.1
            const isStreamingItem = index === messages.length && isNewMessageSending;
            const message = isStreamingItem ? null : messages[index];

            // 检查当前消息是否正在重新生成 - 需求 1.1, 1.2, 1.3
            const isRegeneratingThis = message?.id === regeneratingMessageId && isSending;

            return (
              <div
                key={virtualItem.key}
                data-index={index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                className="pb-4"
              >
                {isStreamingItem ? (
                  // 新消息的流式响应或加载指示器 - 需求 3.3, 3.4, 5.1
                  <StreamingMessage
                    streamingText={streamingText}
                    streamingThought={streamingThought}
                    streamingImages={streamingImages}
                    renderContent={renderMessageContent}
                    onImageClick={onImageClick || handleImagePreview}
                    isSending={isSending}
                  />
                ) : message ? (
                  // 普通消息或重新生成中的消息
                  <MessageItem
                    message={message}
                    renderContent={renderMessageContent}
                    isLast={index === messages.length - 1}
                    reducedMotion={reducedMotion}
                    onEdit={onEditMessage}
                    onRegenerate={onRegenerateMessage}
                    onDelete={onDeleteMessage}
                    isRegenerating={isRegeneratingThis}
                    regeneratingContent={isRegeneratingThis ? streamingText : ''}
                    regeneratingThought={isRegeneratingThis ? streamingThought : ''}
                    regeneratingImages={isRegeneratingThis ? streamingImages : []}
                    onRetry={onRetry}
                    onDismissError={onDismissError}
                    onImageClick={onImageClick || handleImagePreview}
                    windowId={windowId}
                    subTopicId={subTopicId}
                    windowTitle={windowTitle}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* 错误提示 - 显示API错误并提供重试选项 */}
      {error && !isSending && (
        <ErrorMessage
          error={error}
          onRetry={onRetry}
          onDismiss={onDismissError}
        />
      )}

      {/* 需求 7.1, 7.2: 图片预览模态框 */}
      <ImagePreviewModal
        image={previewImages[previewIndex] || null}
        isOpen={isPreviewOpen}
        onClose={handleClosePreview}
      />
    </div>
  );
}

// ============ 导出工具函数（用于测试） ============
// 已拆分至 VirtualMessageList.testHelpers.ts，此处重新导出以保持原有导入路径兼容

export {
  calculateVisibleCount,
  calculateTotalCount,
  isMessageRegenerating,
  getDisplayContent,
  shouldShowRegeneratingIndicator,
  isIndicatorProperlyCleared,
  handleCancelOperation,
  isRegeneratingIdClearedAfterCancel,
  validateCancelOperation,
} from './VirtualMessageList.testHelpers';
export type { CancelOperationResult } from './VirtualMessageList.testHelpers';

/**
 * memo 包裹：当父组件（ChatArea）因无关状态（如配置面板开关、侧边栏折叠）重渲染、
 * 而本组件 props 未变化时，跳过整个虚拟列表的重渲染。
 */
export const VirtualMessageList = memo(VirtualMessageListInner);

export default VirtualMessageList;
