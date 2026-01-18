/**
 * 转录显示组件
 * 需求: 6.1-6.4
 * 
 * 实现对话形式的转录显示，区分用户和 AI 的发言样式，
 * 支持滚动查看历史，显示实时转录（pending）
 */

import { useEffect, useRef } from 'react';
import type { TranscriptMessage } from '../../types/liveApi';

/**
 * 转录显示属性
 */
export interface TranscriptDisplayProps {
  /** 转录消息列表 */
  messages: TranscriptMessage[];
  /** 待处理的输入转录（实时） */
  pendingInputTranscript?: string;
  /** 待处理的输出转录（实时） */
  pendingOutputTranscript?: string;
  /** 用户是否正在说话 */
  isUserSpeaking?: boolean;
  /** AI 是否正在说话 */
  isAiSpeaking?: boolean;
  /** 是否自动滚动到底部 */
  autoScroll?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 转录显示组件
 * 以对话形式展示转录内容
 */
export function TranscriptDisplay({
  messages,
  pendingInputTranscript = '',
  pendingOutputTranscript = '',
  isUserSpeaking = false,
  isAiSpeaking = false,
  autoScroll = true,
  className = '',
}: TranscriptDisplayProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, pendingInputTranscript, pendingOutputTranscript, autoScroll]);

  // 格式化时间戳
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // 检查是否有内容
  const hasContent = messages.length > 0 || pendingInputTranscript || pendingOutputTranscript;

  return (
    <div
      ref={containerRef}
      className={`flex flex-col gap-3 overflow-y-auto custom-scrollbar p-4 ${className}`}
    >
      {/* 空状态 */}
      {!hasContent && (
        <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
          <TranscriptEmptyIcon className="w-12 h-12 mb-3 opacity-50" />
          <p className="text-sm">开始对话后，转录内容将显示在这里</p>
        </div>
      )}

      {/* 历史消息 */}
      {messages.map((message) => (
        <TranscriptMessageItem
          key={message.id}
          message={message}
          formatTime={formatTime}
        />
      ))}

      {/* 实时输入转录（用户正在说话） */}
      {pendingInputTranscript && (
        <PendingTranscriptItem
          text={pendingInputTranscript}
          role="user"
          isActive={isUserSpeaking}
        />
      )}

      {/* 实时输出转录（AI 正在说话） */}
      {pendingOutputTranscript && (
        <PendingTranscriptItem
          text={pendingOutputTranscript}
          role="model"
          isActive={isAiSpeaking}
        />
      )}

      {/* 说话指示器（无转录文本时） */}
      {isUserSpeaking && !pendingInputTranscript && (
        <SpeakingIndicator role="user" />
      )}
      {isAiSpeaking && !pendingOutputTranscript && (
        <SpeakingIndicator role="model" />
      )}

      {/* 滚动锚点 */}
      <div ref={bottomRef} />
    </div>
  );
}

/**
 * 转录消息项属性
 */
interface TranscriptMessageItemProps {
  message: TranscriptMessage;
  formatTime: (timestamp: number) => string;
}

/**
 * 转录消息项组件
 * 需求: 6.3 - 区分用户和 AI 的发言样式
 */
function TranscriptMessageItem({ message, formatTime }: TranscriptMessageItemProps): JSX.Element {
  const isUser = message.role === 'user';

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      data-role={message.role}
      data-testid={`transcript-message-${message.role}`}
    >
      {/* 角色标签和时间 */}
      <div className={`flex items-center gap-2 text-xs ${isUser ? 'flex-row-reverse' : ''}`}>
        <span className={`font-medium ${isUser ? 'text-primary-600 dark:text-primary-400' : 'text-purple-600 dark:text-purple-400'}`}>
          {isUser ? '你' : 'AI'}
        </span>
        <span className="text-neutral-400 dark:text-neutral-500">
          {formatTime(message.timestamp)}
        </span>
      </div>

      {/* 消息内容 */}
      <div
        className={`
          max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-primary-500 text-white rounded-br-md'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-md'
          }
        `}
      >
        {message.text}
      </div>
    </div>
  );
}

/**
 * 待处理转录项属性
 */
interface PendingTranscriptItemProps {
  text: string;
  role: 'user' | 'model';
  isActive: boolean;
}

/**
 * 待处理转录项组件
 * 显示实时转录内容
 */
function PendingTranscriptItem({ text, role, isActive }: PendingTranscriptItemProps): JSX.Element {
  const isUser = role === 'user';

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      data-role={role}
      data-pending="true"
      data-testid={`pending-transcript-${role}`}
    >
      {/* 角色标签 */}
      <div className={`flex items-center gap-2 text-xs ${isUser ? 'flex-row-reverse' : ''}`}>
        <span className={`font-medium ${isUser ? 'text-primary-600 dark:text-primary-400' : 'text-purple-600 dark:text-purple-400'}`}>
          {isUser ? '你' : 'AI'}
        </span>
        {isActive && (
          <span className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
            正在说话
          </span>
        )}
      </div>

      {/* 消息内容 */}
      <div
        className={`
          max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${isUser
            ? 'bg-primary-400/80 text-white rounded-br-md'
            : 'bg-neutral-100/80 dark:bg-neutral-800/80 text-neutral-700 dark:text-neutral-300 rounded-bl-md'
          }
          ${isActive ? 'animate-pulse' : ''}
        `}
      >
        {text}
        {isActive && <span className="inline-block w-1 h-4 ml-0.5 bg-current animate-blink" />}
      </div>
    </div>
  );
}

/**
 * 说话指示器属性
 */
interface SpeakingIndicatorProps {
  role: 'user' | 'model';
}

/**
 * 说话指示器组件
 * 当没有转录文本但正在说话时显示
 */
function SpeakingIndicator({ role }: SpeakingIndicatorProps): JSX.Element {
  const isUser = role === 'user';

  return (
    <div
      className={`flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`}
      data-testid={`speaking-indicator-${role}`}
    >
      {/* 角色标签 */}
      <div className={`flex items-center gap-2 text-xs ${isUser ? 'flex-row-reverse' : ''}`}>
        <span className={`font-medium ${isUser ? 'text-primary-600 dark:text-primary-400' : 'text-purple-600 dark:text-purple-400'}`}>
          {isUser ? '你' : 'AI'}
        </span>
      </div>

      {/* 说话动画 */}
      <div
        className={`
          px-4 py-3 rounded-2xl
          ${isUser
            ? 'bg-primary-400/50 rounded-br-md'
            : 'bg-neutral-100/50 dark:bg-neutral-800/50 rounded-bl-md'
          }
        `}
      >
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 rounded-full bg-current opacity-60 animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

/**
 * 空状态图标
 */
function TranscriptEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

/**
 * 获取消息的角色样式类名
 * 用于属性测试验证角色区分
 * 需求: 6.3
 */
export function getMessageRoleClassName(role: 'user' | 'model'): {
  containerAlign: string;
  labelColor: string;
  bubbleColor: string;
} {
  if (role === 'user') {
    return {
      containerAlign: 'items-end',
      labelColor: 'text-primary-600 dark:text-primary-400',
      bubbleColor: 'bg-primary-500 text-white',
    };
  }
  return {
    containerAlign: 'items-start',
    labelColor: 'text-purple-600 dark:text-purple-400',
    bubbleColor: 'bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200',
  };
}

export default TranscriptDisplay;
