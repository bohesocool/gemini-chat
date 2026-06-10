/**
 * 单条消息组件（消息行）
 * 来源：VirtualMessageList.tsx（拆分，逻辑不变）
 * 性能优化：使用 memo 避免不必要的重渲染
 */

import { useState, useCallback, useMemo, memo } from 'react';
import type { Message, GeneratedImage } from '../../types/models';
import { ThoughtSummaryCard } from './ThoughtSummaryCard';
import { MessageActions } from './MessageActions';
import { InlineMessageEditor } from './InlineMessageEditor';
import { ImageGrid } from '../shared/ImageGrid';
import { FileReferenceList } from '../MessageList/FileReferenceList';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Avatar, MessageBubble, TypingIndicator, TypingCursor } from './MessageListParts';
import { MessageError } from './MessageErrors';
import { AttachmentList } from './MessageAttachments';

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

export const MessageItem = memo(function MessageItem({
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

  // 对重新生成的流式内容进行防抖，减少昂贵的 Markdown 重新解析
  // 重新生成结束时（!isRegenerating）通过 immediate 参数立即刷新
  // 需求: 1.1, 1.2, 1.3, 2.1
  const debouncedRegeneratingContent = useDebouncedValue(regeneratingContent, 80, !isRegenerating);

  // 确定要显示的内容 - 需求 1.2, 1.3
  // 重新生成时使用防抖后的内容，减少渲染频率
  const displayContent = isRegenerating ? debouncedRegeneratingContent : message.content;

  // 确定要显示的图片 - 需求 2.2, 5.1
  const displayImages = isRegenerating ? regeneratingImages : (message.generatedImages || []);

  // 判断是否有内容（文本或图片）- 需求 3.1, 3.2
  // 注意：使用原始 regeneratingContent 判断，确保 UI 状态（如 TypingIndicator）响应及时
  const hasContent = (isRegenerating ? regeneratingContent : displayContent) || displayImages.length > 0;

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
