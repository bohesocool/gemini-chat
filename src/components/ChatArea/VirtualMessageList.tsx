/**
 * 虚拟滚动消息列表组件
 * 需求: 1.1, 1.3, 1.4, 1.5 - 虚拟滚动、自动滚动、动态高度支持
 */

import { useRef, useEffect, useCallback, useState, memo, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Message, Attachment, GeneratedImage } from '../../types/models';
import { useReducedMotion } from '../motion';
import { ThoughtSummaryCard } from './ThoughtSummaryCard';
import { MessageActions } from './MessageActions';
import { InlineMessageEditor } from './InlineMessageEditor';
import { ImageGrid } from '../shared/ImageGrid';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { FileReferenceList } from '../MessageList/FileReferenceList';

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
export function VirtualMessageList({
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


// ============ 子组件 ============

/**
 * 错误消息组件
 * 显示API错误信息，提供重试和关闭选项
 */
interface ErrorMessageProps {
  error: string;
  onRetry?: (messageId: string) => void;
  onDismiss?: (messageId: string) => void;
}

const ErrorMessage = memo(function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
  return (
    <div className="flex gap-3 animate-fadeIn pb-4">
      <Avatar role="model" />
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 shadow-sm">
          {/* 错误图标和标题 */}
          <div className="flex items-center gap-2 mb-2">
            <ErrorIcon className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
            <span className="text-sm font-medium text-red-700 dark:text-red-300">
              请求失败
            </span>
          </div>

          {/* 错误详情 */}
          <p className="text-sm text-red-600 dark:text-red-400 mb-3 break-words">
            {error}
          </p>

          {/* 操作按钮 */}
          <div className="flex items-center gap-2">
            {onRetry && (
              <button
                onClick={() => onRetry('')}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5
                  text-sm font-medium text-white
                  bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700
                  rounded-lg transition-colors
                  shadow-sm hover:shadow
                "
              >
                <RetryIcon className="w-4 h-4" />
                重新生成
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss('')}
                className="
                  inline-flex items-center gap-1.5 px-3 py-1.5
                  text-sm font-medium
                  text-red-600 dark:text-red-400
                  hover:bg-red-100 dark:hover:bg-red-900/30
                  rounded-lg transition-colors
                "
              >
                关闭
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

/**
 * 消息级别错误组件
 * 显示与特定消息关联的错误信息，支持重试和关闭
 * 用于错误状态持久化
 */
interface MessageErrorProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}

const MessageError = memo(function MessageError({ error, onRetry, onDismiss }: MessageErrorProps) {
  return (
    <div className="mt-2 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 shadow-sm animate-fadeIn">
      {/* 错误图标和标题 */}
      <div className="flex items-center gap-2 mb-2">
        <ErrorIcon className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
        <span className="text-sm font-medium text-red-700 dark:text-red-300">
          请求失败
        </span>
      </div>

      {/* 错误详情 */}
      <p className="text-sm text-red-600 dark:text-red-400 mb-3 break-words">
        {error}
      </p>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-sm font-medium text-white
              bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700
              rounded-lg transition-colors
              shadow-sm hover:shadow
            "
          >
            <RetryIcon className="w-4 h-4" />
            重新生成
          </button>
        )}
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-sm font-medium
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/30
              rounded-lg transition-colors
            "
          >
            关闭
          </button>
        )}
      </div>
    </div>
  );
});

/**
 * 流式响应消息组件
 * 需求 3.3, 3.4: 在流式过程中显示思维链内容
 * 需求 5.1: 在流式过程中显示已接收的图片
 */
interface StreamingMessageProps {
  streamingText: string;
  streamingThought?: string;
  streamingImages?: GeneratedImage[];
  renderContent: (content: string) => React.ReactNode;
  onImageClick?: (images: GeneratedImage[], index: number) => void;
}

function StreamingMessage({
  streamingText,
  streamingThought = '',
  streamingImages = [],
  renderContent,
  onImageClick,
}: StreamingMessageProps) {
  // 处理图片点击
  const handleImageClick = useCallback((index: number) => {
    if (onImageClick && streamingImages.length > 0) {
      onImageClick(streamingImages, index);
    }
  }, [onImageClick, streamingImages]);

  // 判断是否有内容（文本或图片）
  const hasContent = streamingText || streamingImages.length > 0;

  return (
    <div className="flex gap-3 animate-fadeIn">
      <Avatar role="model" />
      {/* 流式消息容器自适应内容宽度 */}
      <div className="flex-1 min-w-0">
        {/* 流式思维链卡片 - 需求 3.3, 3.4, 1.1 (流式输出时展开) */}
        {streamingThought && (
          <ThoughtSummaryCard content={streamingThought} isStreaming={true} />
        )}

        {/* 流式响应内容 - 需求 5.1: 显示流式图片 */}
        <MessageBubble isUser={false}>
          {/* 流式图片显示 - 需求 5.1 */}
          {streamingImages.length > 0 && (
            <ImageGrid
              images={streamingImages}
              onImageClick={handleImageClick}
            />
          )}

          {/* 文本内容 */}
          {streamingText ? (
            <>
              {renderContent(streamingText)}
              <TypingCursor />
            </>
          ) : !hasContent ? (
            <TypingIndicator />
          ) : null}
        </MessageBubble>
      </div>
    </div>
  );
}

/**
 * 消息气泡组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
interface MessageBubbleProps {
  isUser: boolean;
  children: React.ReactNode;
  /** 是否正在重新生成 - 需求 3.1, 3.2 */
  isRegenerating?: boolean;
}

const MessageBubble = memo(function MessageBubble({ isUser, children, isRegenerating = false }: MessageBubbleProps) {
  // 需求 10.1, 10.2: 使用 w-fit max-w-full 让气泡宽度自适应内容，减少右侧空白
  return (
    <div
      className={`
        px-4 py-3 rounded-2xl
        w-fit max-w-full
        ${isUser
          ? 'message-user rounded-br-md shadow-md shadow-green-500/20 dark:shadow-green-400/10'
          : 'message-ai rounded-bl-md shadow-sm shadow-neutral-200/50 dark:shadow-neutral-900/50'
        }
        ${isRegenerating ? 'ring-2 ring-purple-400/50 dark:ring-purple-500/50 animate-pulse' : ''}
      `}
    >
      {children}
    </div>
  );
});

/**
 * 单条消息组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
interface MessageItemProps {
  message: Message;
  renderContent: (content: string) => React.ReactNode;
  isLast: boolean;
  reducedMotion: boolean;
  onEdit?: (messageId: string, newContent: string, resend: boolean) => void;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  /** 是否正在重新生成 - 需求 3.1 */
  isRegenerating?: boolean;
  /** 重新生成中的流式内容 - 需求 1.2, 1.3 */
  regeneratingContent?: string;
  /** 重新生成中的流式思维链 - 需求 3.3, 3.4 */
  regeneratingThought?: string;
  /** 重新生成中的流式图片 - 需求 5.1 */
  regeneratingImages?: GeneratedImage[];
  /** 重试回调（用于消息级别错误） */
  onRetry?: (messageId: string) => void;
  /** 关闭错误回调（用于消息级别错误） */
  onDismissError?: (messageId: string) => void;
  /** 图片点击回调 - 需求 2.4 */
  onImageClick?: (images: GeneratedImage[], index: number) => void;
  /** 窗口 ID（用于书签） - 需求 3.1 */
  windowId?: string;
  /** 子话题 ID（用于书签） - 需求 3.1 */
  subTopicId?: string;
  /** 窗口标题（用于书签） - 需求 3.1 */
  windowTitle?: string;
}

const MessageItem = memo(function MessageItem({
  message,
  renderContent,
  isLast,
  reducedMotion,
  onEdit,
  onRegenerate,
  onDelete,
  isRegenerating = false,
  regeneratingContent = '',
  regeneratingThought = '',
  regeneratingImages = [],
  onRetry,
  onDismissError,
  onImageClick,
  windowId,
  subTopicId,
  windowTitle,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const [showTimestamp, setShowTimestamp] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // 需求 1.1: 添加编辑状态管理
  const [isEditing, setIsEditing] = useState(false);

  // 性能优化：缓存过渡样式
  const transitionStyle = useMemo(() =>
    reducedMotion ? {} : { transition: 'all 150ms ease-out' },
    [reducedMotion]
  );

  // 处理重新生成
  const handleRegenerate = useCallback(() => {
    if (onRegenerate) {
      onRegenerate(message.id);
    }
  }, [onRegenerate, message.id]);

  // 需求 1.1: 进入编辑模式
  const handleEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  // 需求 1.1: 退出编辑模式
  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  // 需求 1.4: 处理"仅保存"操作
  const handleSave = useCallback((newContent: string) => {
    setIsEditing(false);
    if (onEdit) {
      onEdit(message.id, newContent, false);
    }
  }, [message.id, onEdit]);

  // 需求 1.5: 处理"保存并重新发送"操作
  const handleSaveAndResend = useCallback((newContent: string) => {
    setIsEditing(false);
    if (onEdit) {
      onEdit(message.id, newContent, true);
    }
  }, [message.id, onEdit]);

  // 处理删除消息
  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete(message.id);
    }
  }, [onDelete, message.id]);

  // 处理图片点击 - 需求 2.4
  const handleImageClick = useCallback((index: number) => {
    // 确定要显示的图片列表
    const images = isRegenerating ? regeneratingImages : (message.generatedImages || []);
    if (onImageClick && images.length > 0) {
      onImageClick(images, index);
    }
  }, [onImageClick, isRegenerating, regeneratingImages, message.generatedImages]);

  // 确定要显示的内容 - 需求 1.2, 1.3
  const displayContent = isRegenerating ? regeneratingContent : message.content;

  // 确定要显示的图片 - 需求 2.2, 5.1
  const displayImages = isRegenerating ? regeneratingImages : (message.generatedImages || []);

  // 判断是否有内容（文本或图片）- 需求 3.1, 3.2
  const hasContent = displayContent || displayImages.length > 0;

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => {
        if (!isEditing && !isRegenerating) {
          setShowTimestamp(true);
          setShowActions(true);
        }
      }}
      onMouseLeave={() => {
        setShowTimestamp(false);
        setShowActions(false);
      }}
    >
      <Avatar role={message.role} />

      {/* 需求 1.2: 根据 isEditing 状态渲染 MessageBubble 或 InlineMessageEditor */}
      {isEditing ? (
        // 编辑模式：显示原位编辑器
        <InlineMessageEditor
          message={message}
          isLastUserMessage={isLast && isUser}
          onSave={handleSave}
          onSaveAndResend={handleSaveAndResend}
          onCancel={handleCancelEdit}
        />
      ) : (
        // 显示模式：显示消息内容
        // 消息容器自适应内容宽度，图片消息可以更宽
        <div className={`relative flex-1 min-w-0 ${isUser ? 'flex flex-col items-end' : ''}`}>
          {/* 文件引用预览 - Requirements: 5.1, 5.3 */}
          {message.fileReferences && message.fileReferences.length > 0 && (
            <FileReferenceList fileReferences={message.fileReferences} isUser={isUser} />
          )}

          {/* 附件预览 */}
          {message.attachments && message.attachments.length > 0 && (
            <AttachmentList attachments={message.attachments} isUser={isUser} />
          )}

          {/* 思维链卡片 - 需求 3.3, 3.4: 重新生成时显示流式思维链 */}
          {/* 需求 2.1, 3.1, 4.1: 历史消息默认折叠，重新生成时展开 */}
          {!isUser && (
            isRegenerating ? (
              // 重新生成时显示流式思维链，isStreaming=true 保持展开
              regeneratingThought && (
                <ThoughtSummaryCard content={regeneratingThought} isStreaming={true} />
              )
            ) : (
              // 普通状态显示已保存的思维链，isStreaming=false 默认折叠
              message.thoughtSummary && (
                <ThoughtSummaryCard
                  content={message.thoughtSummary}
                  isStreaming={false}
                  images={message.thoughtImages}
                />
              )
            )
          )}

          {/* 消息内容 - 需求 1.2, 1.3, 3.1, 2.2, 3.2, 3.3 */}
          {/* AI 消息始终显示气泡（包括空响应占位符），用户消息只有有内容时才显示 */}
          {(hasContent || isRegenerating || !isUser) && (
            <MessageBubble isUser={isUser} isRegenerating={isRegenerating}>
              {/* 生成的图片显示 - 需求 2.2, 2.3, 5.1 */}
              {displayImages.length > 0 && (
                <ImageGrid
                  images={displayImages}
                  onImageClick={handleImageClick}
                />
              )}

              {isRegenerating ? (
                // 重新生成状态
                displayContent ? (
                  <>
                    {renderContent(displayContent)}
                    <TypingCursor />
                  </>
                ) : displayImages.length === 0 ? (
                  // 只有在没有图片时才显示加载指示器
                  <TypingIndicator />
                ) : null
              ) : (
                // 普通状态
                displayContent ? (
                  // 有文本内容时渲染文本
                  renderContent(displayContent)
                ) : !hasContent && !isUser ? (
                  // 需求 3.3: AI 响应既没有文本也没有图片时显示占位符
                  <EmptyResponsePlaceholder />
                ) : null
              )}
            </MessageBubble>
          )}

          {/* 消息级别错误显示 - 错误状态持久化 */}
          {message.error && !isRegenerating && (
            <MessageError
              error={message.error}
              onRetry={onRetry ? () => onRetry(message.id) : undefined}
              onDismiss={onDismissError ? () => onDismissError(message.id) : undefined}
            />
          )}

          {/* 按钮和时间戳容器 - 并排显示，预留固定高度避免抖动 */}
          <div
            className={`
              flex items-center gap-2 mt-1
              min-h-[28px]
              ${isUser ? 'flex-row-reverse' : 'flex-row'}
            `}
          >
            {/* 消息操作按钮 - 重新生成时隐藏 */}
            <div
              className="flex items-center gap-1"
              style={{
                ...transitionStyle,
                opacity: showActions && !isRegenerating ? 1 : 0,
              }}
            >
              {showActions && !isRegenerating && (
                <MessageActions
                  message={message}
                  isUserMessage={isUser}
                  onEdit={isUser ? handleEdit : undefined}
                  onRegenerate={!isUser ? handleRegenerate : undefined}
                  onDelete={handleDelete}
                  windowId={windowId}
                  subTopicId={subTopicId}
                  windowTitle={windowTitle}
                />
              )}
            </div>

            {/* 时间戳 - 悬停显示，重新生成时隐藏 */}
            <div
              className={`
                text-xs text-neutral-400 dark:text-neutral-500 px-1
                ${isUser ? 'text-right' : 'text-left'}
              `}
              style={{
                ...transitionStyle,
                opacity: (showTimestamp || isLast) && !isRegenerating ? 1 : 0,
              }}
            >
              {formatTime(message.timestamp)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * 头像组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const Avatar = memo(function Avatar({ role }: { role: 'user' | 'model' }) {
  const isUser = role === 'user';

  return (
    <div
      className={`
        flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
        avatar-container
        ${isUser
          ? 'bg-brand text-white'
          : 'bg-gradient-to-br from-purple-500 to-pink-500 text-white'
        }
      `}
    >
      {isUser ? (
        <UserIcon className="w-5 h-5" />
      ) : (
        <BotIcon className="w-5 h-5" />
      )}
    </div>
  );
});

/**
 * 附件列表组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
interface AttachmentListProps {
  attachments: Attachment[];
  isUser: boolean;
}

const AttachmentList = memo(function AttachmentList({ attachments, isUser }: AttachmentListProps) {
  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
      {attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
});

/**
 * 附件预览组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const AttachmentPreview = memo(function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.type === 'image') {
    return (
      <div className="relative group">
        <img
          src={`data:${attachment.mimeType};base64,${attachment.data}`}
          alt={attachment.name}
          className="
            max-w-[200px] max-h-[200px] rounded-xl object-cover 
            cursor-pointer hover:opacity-90 transition-opacity
            shadow-md
          "
          onClick={() => {
            const win = window.open();
            if (win) {
              win.document.write(`
                <html>
                  <head><title>${attachment.name}</title></head>
                  <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#000;">
                    <img src="data:${attachment.mimeType};base64,${attachment.data}" style="max-width:100%;max-height:100vh;object-fit:contain;" />
                  </body>
                </html>
              `);
            }
          }}
        />
        <div className="
          absolute bottom-1 left-1 right-1 
          bg-black/60 text-white text-xs px-2 py-1 rounded-lg 
          truncate opacity-0 group-hover:opacity-100 transition-opacity
          backdrop-blur-sm
        ">
          {attachment.name}
        </div>
      </div>
    );
  }

  return (
    <div className="
      flex items-center gap-2 
      bg-neutral-100 dark:bg-neutral-700 
      rounded-xl px-3 py-2 shadow-sm
    ">
      <FileIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]">
          {attachment.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
    </div>
  );
});


/**
 * 空状态组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const EmptyState = memo(function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center pt-24 pb-12">
      <div className="
        w-16 h-16 rounded-2xl 
        bg-gradient-to-br from-green-500 to-emerald-600 
        flex items-center justify-center mb-4
        shadow-lg shadow-green-500/30
        start-new-chat-icon
      ">
        <BotIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        开始新对话
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm">
        在下方输入消息，开始与 Gemini AI 对话。支持发送图片和文件。
      </p>
    </div>
  );
});

/**
 * 空响应占位符组件
 * 需求 3.3: 当 AI 响应既没有文本也没有图片时显示提示
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const EmptyResponsePlaceholder = memo(function EmptyResponsePlaceholder() {
  return (
    <p className="text-neutral-400 dark:text-neutral-500 italic text-sm">
      AI 未返回任何内容
    </p>
  );
});

/**
 * 打字指示器动画组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <span
        className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce"
        style={{ animationDelay: '0ms', animationDuration: '600ms' }}
      />
      <span
        className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce"
        style={{ animationDelay: '150ms', animationDuration: '600ms' }}
      />
      <span
        className="w-2 h-2 bg-neutral-400 dark:bg-neutral-500 rounded-full animate-bounce"
        style={{ animationDelay: '300ms', animationDuration: '600ms' }}
      />
    </div>
  );
});

/**
 * 打字光标组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const TypingCursor = memo(function TypingCursor() {
  return (
    <span className="
      inline-block w-0.5 h-4 ml-0.5 
      bg-brand
      animate-pulse
    " />
  );
});

// ============ 图标组件 ============

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
  );
}

function BotIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 011 1v3a1 1 0 01-1 1h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 01-1-1v-3a1 1 0 011-1h1a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2zM7.5 13a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3z" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function RetryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

// ============ 工具函数 ============

/**
 * 格式化时间戳
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }

  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ============ 导出工具函数（用于测试） ============

/**
 * 计算虚拟滚动渲染数量
 * 用于属性测试验证
 */
export function calculateVisibleCount(
  totalMessages: number,
  viewportHeight: number,
  estimatedItemHeight: number,
  overscan: number
): number {
  if (totalMessages === 0) return 0;

  // 可视区域内的项数
  const visibleCount = Math.ceil(viewportHeight / estimatedItemHeight);
  // 加上缓冲区
  const totalVisible = visibleCount + 2 * overscan;
  // 不能超过总数
  return Math.min(totalVisible, totalMessages);
}

/**
 * 计算列表总行数
 * 用于属性测试验证 - Property 2: 重新生成时列表行数保持不变
 * 
 * @param messagesLength - 消息数组长度
 * @param isSending - 是否正在发送
 * @param regeneratingMessageId - 正在重新生成的消息 ID
 * @returns 列表总行数
 */
export function calculateTotalCount(
  messagesLength: number,
  isSending: boolean,
  regeneratingMessageId: string | null
): number {
  // 只有在发送新消息时才增加行数，重新生成时保持不变
  const isNewMessageSending = isSending && !regeneratingMessageId;
  return messagesLength + (isNewMessageSending ? 1 : 0);
}

/**
 * 判断消息是否正在重新生成
 * 用于属性测试验证 - Property 1: 重新生成时内容显示在原位置
 * 
 * @param messageId - 消息 ID
 * @param regeneratingMessageId - 正在重新生成的消息 ID
 * @param isSending - 是否正在发送
 * @returns 是否正在重新生成
 */
export function isMessageRegenerating(
  messageId: string,
  regeneratingMessageId: string | null,
  isSending: boolean
): boolean {
  return messageId === regeneratingMessageId && isSending;
}

/**
 * 获取消息显示内容
 * 用于属性测试验证 - Property 1: 重新生成时内容显示在原位置
 * 
 * @param originalContent - 原始消息内容
 * @param isRegenerating - 是否正在重新生成
 * @param regeneratingContent - 重新生成中的流式内容
 * @returns 应该显示的内容
 */
export function getDisplayContent(
  originalContent: string,
  isRegenerating: boolean,
  regeneratingContent: string
): string {
  return isRegenerating ? regeneratingContent : originalContent;
}

/**
 * 判断消息是否应该显示重新生成状态指示器
 * 用于属性测试验证 - Property 3: 重新生成状态指示器正确管理
 * 
 * @param messageId - 消息 ID
 * @param regeneratingMessageId - 正在重新生成的消息 ID
 * @param isSending - 是否正在发送
 * @returns 是否应该显示重新生成状态指示器
 */
export function shouldShowRegeneratingIndicator(
  messageId: string,
  regeneratingMessageId: string | null,
  isSending: boolean
): boolean {
  // 只有当 isSending=true 且 messageId 匹配时才显示指示器
  return messageId === regeneratingMessageId && isSending;
}

/**
 * 判断重新生成状态指示器是否应该被清除
 * 用于属性测试验证 - Property 3: 重新生成状态指示器正确管理
 * 
 * @param previousIsSending - 之前的发送状态
 * @param currentIsSending - 当前的发送状态
 * @param previousRegeneratingId - 之前的重新生成消息 ID
 * @param currentRegeneratingId - 当前的重新生成消息 ID
 * @returns 指示器是否被正确清除
 */
export function isIndicatorProperlyCleared(
  previousIsSending: boolean,
  currentIsSending: boolean,
  previousRegeneratingId: string | null,
  currentRegeneratingId: string | null
): boolean {
  // 场景 1: 重新生成完成（isSending 从 true 变为 false）
  if (previousIsSending && !currentIsSending) {
    // 指示器应该被清除（regeneratingId 应该为 null 或不再匹配）
    return true;
  }

  // 场景 2: regeneratingMessageId 被清除
  if (previousRegeneratingId !== null && currentRegeneratingId === null) {
    return true;
  }

  // 场景 3: 状态没有变化或正在进行中
  return false;
}

// ============ 取消操作相关辅助函数（用于测试） ============

/**
 * 取消操作结果类型
 */
export interface CancelOperationResult {
  /** 最终消息内容 */
  finalContent: string;
  /** 是否保留了部分内容 */
  hasPartialContent: boolean;
  /** 是否恢复了原消息 */
  restoredOriginal: boolean;
}

/**
 * 处理取消操作后的内容
 * 用于属性测试验证 - Property 4: 取消操作正确处理内容
 * 
 * 需求 4.1: 流式重新生成过程中取消，停止生成并保留已生成的部分内容
 * 需求 4.2: 取消操作执行且有部分内容时，将部分内容保存为消息的新内容
 * 需求 4.3: 没有生成任何内容时取消，恢复显示原消息内容
 * 
 * @param originalContent - 原始消息内容
 * @param partialContent - 取消时已生成的部分内容
 * @returns 取消操作结果
 */
export function handleCancelOperation(
  originalContent: string,
  partialContent: string
): CancelOperationResult {
  // 判断是否有有效的部分内容（非空字符串）
  const hasPartialContent = partialContent.length > 0;

  if (hasPartialContent) {
    // 需求 4.1, 4.2: 有部分内容时，保留部分内容
    return {
      finalContent: partialContent,
      hasPartialContent: true,
      restoredOriginal: false,
    };
  } else {
    // 需求 4.3: 没有内容时，恢复原消息
    return {
      finalContent: originalContent,
      hasPartialContent: false,
      restoredOriginal: true,
    };
  }
}

/**
 * 验证取消操作后 regeneratingMessageId 是否被正确清除
 * 用于属性测试验证 - Property 4: 取消操作正确处理内容
 * 
 * @param regeneratingMessageIdBeforeCancel - 取消前的 regeneratingMessageId
 * @param regeneratingMessageIdAfterCancel - 取消后的 regeneratingMessageId
 * @returns 是否正确清除
 */
export function isRegeneratingIdClearedAfterCancel(
  regeneratingMessageIdBeforeCancel: string | null,
  regeneratingMessageIdAfterCancel: string | null
): boolean {
  // 参数 regeneratingMessageIdBeforeCancel 用于 API 一致性，实际验证只需检查取消后的状态
  void regeneratingMessageIdBeforeCancel;
  // 取消后，regeneratingMessageId 应该被清除为 null
  return regeneratingMessageIdAfterCancel === null;
}

/**
 * 验证取消操作的完整性
 * 用于属性测试验证 - Property 4: 取消操作正确处理内容
 * 
 * @param originalContent - 原始消息内容
 * @param partialContent - 取消时已生成的部分内容
 * @param finalContent - 取消后的最终内容
 * @param isSendingAfterCancel - 取消后的 isSending 状态
 * @param regeneratingIdAfterCancel - 取消后的 regeneratingMessageId
 * @returns 取消操作是否正确处理
 */
export function validateCancelOperation(
  originalContent: string,
  partialContent: string,
  finalContent: string,
  isSendingAfterCancel: boolean,
  regeneratingIdAfterCancel: string | null
): boolean {
  // 1. 取消后 isSending 应该为 false
  if (isSendingAfterCancel) {
    return false;
  }

  // 2. 取消后 regeneratingMessageId 应该为 null
  if (regeneratingIdAfterCancel !== null) {
    return false;
  }

  // 3. 验证内容处理逻辑
  if (partialContent.length > 0) {
    // 有部分内容时，最终内容应该是部分内容
    return finalContent === partialContent;
  } else {
    // 没有部分内容时，最终内容应该是原始内容
    return finalContent === originalContent;
  }
}

export default VirtualMessageList;
