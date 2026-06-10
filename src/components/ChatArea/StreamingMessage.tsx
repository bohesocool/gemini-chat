/**
 * 流式响应消息组件
 * 来源：VirtualMessageList.tsx（拆分，逻辑不变）
 * 需求 3.3, 3.4: 在流式过程中显示思维链内容
 * 需求 5.1: 在流式过程中显示已接收的图片
 */

import { useCallback, memo } from 'react';
import type { GeneratedImage } from '../../types/models';
import { ThoughtSummaryCard } from './ThoughtSummaryCard';
import { ImageGrid } from '../shared/ImageGrid';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { Avatar, MessageBubble, TypingIndicator, TypingCursor } from './MessageListParts';

interface StreamingMessageProps {
  streamingText: string;
  streamingThought?: string;
  streamingImages?: GeneratedImage[];
  renderContent: (content: string) => React.ReactNode;
  onImageClick?: (images: GeneratedImage[], index: number) => void;
  // 新增：用于防抖刷新控制，流式结束时立即刷新
  isSending?: boolean;
}

export const StreamingMessage = memo(function StreamingMessage({
  streamingText,
  streamingThought = '',
  streamingImages = [],
  renderContent,
  onImageClick,
  isSending = true,
}: StreamingMessageProps) {
  // 流式结束时（!isSending）通过 immediate 参数立即刷新，确保最终内容完整显示
  // 防抖默认延迟 80ms，在响应速度和性能之间取得平衡
  // 需求: 1.1, 1.2, 1.3, 2.1
  const debouncedText = useDebouncedValue(streamingText, 80, !isSending);

  // 处理图片点击
  const handleImageClick = useCallback((index: number) => {
    if (onImageClick && streamingImages.length > 0) {
      onImageClick(streamingImages, index);
    }
  }, [onImageClick, streamingImages]);

  // 判断是否有内容（文本或图片）
  // 注意：使用原始 streamingText 判断，确保 UI 状态（如 TypingIndicator）响应及时
  // 需求: 4.1, 4.2
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

          {/* 文本内容 - 使用防抖后的 debouncedText 进行渲染，减少昂贵的 Markdown 重新解析 */}
          {debouncedText ? (
            <>
              {renderContent(debouncedText)}
              <TypingCursor />
            </>
          ) : !hasContent ? (
            <TypingIndicator />
          ) : null}
        </MessageBubble>
      </div>
    </div>
  );
});
