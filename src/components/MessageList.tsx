/**
 * 消息列表组件
 * 现代化的消息气泡设计，支持流畅动画
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 5.1, 5.3
 */

import { useEffect, useRef, useState } from 'react';
import type { Message, Attachment } from '../types/models';
import { useReducedMotion } from './motion';
import { durationValues, easings } from '../design/tokens';
import { ThoughtSummaryCard } from './ChatArea/ThoughtSummaryCard';
import { FileReferenceList } from './MessageList/FileReferenceList';

interface MessageListProps {
  /** 消息列表 */
  messages: Message[];
  /** 是否正在发送消息 */
  isSending?: boolean;
  /** 流式响应文本 */
  streamingText?: string;
  /** 渲染消息内容的组件 */
  renderContent?: (content: string) => React.ReactNode;
}

/**
 * 消息列表组件
 * 渲染消息历史，区分用户和 AI 消息，支持自动滚动
 * 
 * Requirements:
 * - 8.1: 用户消息右对齐，主题色背景
 * - 8.2: AI 消息左对齐，中性色背景
 * - 8.3: 消息气泡圆角和阴影
 * - 8.4: 流式输出时显示打字指示器
 * - 8.5: 时间戳优雅显示
 * - 8.6: 平滑滚动动画
 */
export function MessageList({
  messages,
  isSending = false,
  streamingText = '',
  renderContent,
}: MessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // 自动滚动到最新消息
  // Requirements: 8.6
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        behavior: reducedMotion ? 'auto' : 'smooth'
      });
    }
  }, [messages, streamingText, reducedMotion]);

  // 渲染内容（默认直接显示文本）
  const renderMessageContent = (content: string) => {
    if (renderContent) {
      return renderContent(content);
    }
    return <p className="whitespace-pre-wrap break-words">{content}</p>;
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scroll-smooth"
    >
      {messages.length === 0 && !isSending && (
        <EmptyState />
      )}

      {messages.map((message, index) => (
        <MessageItem
          key={message.id}
          message={message}
          renderContent={renderMessageContent}
          isLast={index === messages.length - 1}
          reducedMotion={reducedMotion}
        />
      ))}

      {/* 流式响应显示 - Requirements: 8.4 */}
      {isSending && streamingText && (
        <div className="flex gap-3 animate-fadeIn">
          <Avatar role="model" />
          <div className="flex-1 min-w-0 max-w-[85%]">
            <MessageBubble isUser={false}>
              {renderMessageContent(streamingText)}
              <TypingCursor />
            </MessageBubble>
          </div>
        </div>
      )}

      {/* 加载指示器 - Requirements: 8.4 */}
      {isSending && !streamingText && (
        <div className="flex gap-3 animate-fadeIn">
          <Avatar role="model" />
          <div className="flex-1 min-w-0">
            <MessageBubble isUser={false}>
              <TypingIndicator />
            </MessageBubble>
          </div>
        </div>
      )}

      {/* 滚动锚点 */}
      <div ref={messagesEndRef} />
    </div>
  );
}

/**
 * 消息气泡组件
 * Requirements: 7.7, 8.3 - 消息气泡使用柔和的背景色，用户消息和 AI 消息使用不同色调
 */
interface MessageBubbleProps {
  isUser: boolean;
  children: React.ReactNode;
}

function MessageBubble({ isUser, children }: MessageBubbleProps) {
  return (
    <div
      className={`
        px-4 py-3 rounded-2xl
        ${isUser
          ? 'message-user rounded-br-md shadow-md shadow-green-500/20 dark:shadow-green-400/10'
          : 'message-ai rounded-bl-md shadow-sm shadow-neutral-200/50 dark:shadow-neutral-900/50'
        }
      `}
    >
      {children}
    </div>
  );
}

/**
 * 单条消息组件
 */
interface MessageItemProps {
  message: Message;
  renderContent: (content: string) => React.ReactNode;
  isLast: boolean;
  reducedMotion: boolean;
}

function MessageItem({ message, renderContent, isLast, reducedMotion }: MessageItemProps) {
  const isUser = message.role === 'user';
  const [showTimestamp, setShowTimestamp] = useState(false);

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <div
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
      onMouseEnter={() => setShowTimestamp(true)}
      onMouseLeave={() => setShowTimestamp(false)}
    >
      <Avatar role={message.role} />
      <div className={`flex-1 min-w-0 max-w-[85%] ${isUser ? 'flex flex-col items-end' : ''}`}>
        {/* 文件引用预览 - Requirements: 5.1, 5.3 */}
        {message.fileReferences && message.fileReferences.length > 0 && (
          <FileReferenceList fileReferences={message.fileReferences} isUser={isUser} />
        )}

        {/* 附件预览 */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentList attachments={message.attachments} isUser={isUser} />
        )}

        {/* 思维链卡片 - Requirements: 4.3, 6.1 */}
        {!isUser && message.thoughtSummary && (
          <ThoughtSummaryCard
            content={message.thoughtSummary}
            images={message.thoughtImages}
          />
        )}

        {/* 消息内容 - Requirements: 8.1, 8.2, 8.3 */}
        {message.content && (
          <MessageBubble isUser={isUser}>
            {renderContent(message.content)}
          </MessageBubble>
        )}

        {/* 时间戳 - Requirements: 8.5 悬停显示 */}
        <div
          className={`
            text-xs text-neutral-400 dark:text-neutral-500 mt-1 px-1
            ${isUser ? 'text-right' : 'text-left'}
          `}
          style={{
            ...transitionStyle,
            opacity: showTimestamp || isLast ? 1 : 0,
            transform: showTimestamp || isLast ? 'translateY(0)' : 'translateY(-4px)',
          }}
        >
          {formatTime(message.timestamp)}
        </div>
      </div>
    </div>
  );
}

/**
 * 头像组件
 * Requirements: 7.1 - 使用主题色（绿色）作为品牌色
 */
function Avatar({ role }: { role: 'user' | 'model' }) {
  const isUser = role === 'user';

  return (
    <div
      className={`
        flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center shadow-sm
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
}

/**
 * 附件列表组件
 */
interface AttachmentListProps {
  attachments: Attachment[];
  isUser: boolean;
}

function AttachmentList({ attachments, isUser }: AttachmentListProps) {
  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
      {attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}

/**
 * 附件预览组件
 */
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
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

  // 文件类型附件
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
}

/**
 * 空状态组件
 * Requirements: 7.1 - 使用主题色（绿色）作为品牌色
 * 注意：不使用 h-full 和 justify-center，让内容自然流动，输入框保持在底部
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center pt-24 pb-12">
      <div className="
        w-16 h-16 rounded-2xl 
        bg-gradient-to-br from-green-500 to-emerald-600 
        flex items-center justify-center mb-4
        shadow-lg shadow-green-500/30
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
}

/**
 * 打字指示器动画组件
 * Requirements: 8.4
 */
function TypingIndicator() {
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
}

/**
 * 打字光标组件
 * Requirements: 8.4, 7.1 - 使用主题色
 */
function TypingCursor() {
  return (
    <span className="
      inline-block w-0.5 h-4 ml-0.5 
      bg-brand
      animate-pulse
    " />
  );
}

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

export default MessageList;
