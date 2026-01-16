/**
 * Live API 历史查看组件
 * 需求: 6.1, 6.2, 6.3, 6.4, 6.5
 * 
 * 只读模式显示历史对话，包含语音消息卡片列表
 * 底部显示"返回实时对话"按钮
 */

import { useEffect, useRef } from 'react';
import type { LiveSessionRecord, LiveVoiceMessage } from '../../types/liveApi';
import { VoiceMessageCard } from './VoiceMessageCard';

/**
 * 历史查看组件属性
 */
export interface LiveHistoryViewProps {
  /** 会话记录 */
  session: LiveSessionRecord | null;
  /** 语音消息列表（包含音频 Blob） */
  messages: LiveVoiceMessage[];
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 当前播放的消息 ID */
  playingMessageId: string | null;
  /** 播放进度 (0-1) */
  playProgress: number;
  /** 播放消息回调 */
  onPlayMessage: (messageId: string) => void;
  /** 停止播放回调 */
  onStopPlayback: () => void;
  /** 返回实时对话回调 */
  onBackToLive: () => void;
  /** 返回列表回调（兼容） */
  onBack: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化日期时间
 */
function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Live API 历史查看组件
 * 需求: 6.1 - 隐藏实时对话控制按钮（只读模式）
 * 需求: 6.2 - 显示"查看历史记录"标识
 * 需求: 6.4, 6.5 - 底部显示"返回实时对话"按钮
 */
export function LiveHistoryView({
  session,
  messages,
  isLoading = false,
  playingMessageId,
  playProgress,
  onPlayMessage,
  onStopPlayback,
  onBackToLive,
  onBack,
  className = '',
}: LiveHistoryViewProps): JSX.Element {
  // 消息列表容器引用
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // 滚动到底部
  useEffect(() => {
    if (messagesContainerRef.current && messages.length > 0) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-neutral-900 ${className}`}>
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          {/* 返回按钮 */}
          <button
            onClick={onBack}
            className="
              p-1.5 rounded-lg
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              text-neutral-500 dark:text-neutral-400
              transition-colors
            "
            title="返回列表"
          >
            <BackIcon className="w-5 h-5" />
          </button>

          {/* 需求: 6.2 - 显示"查看历史记录"标识 */}
          <div className="flex items-center gap-2">
            <HistoryIcon className="w-5 h-5 text-amber-500" />
            <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              查看历史记录
            </span>
          </div>
        </div>

        {/* 会话时间 */}
        {session && (
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {formatDateTime(session.createdAt)}
          </span>
        )}
      </div>

      {/* 消息列表 */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-4"
      >
        {isLoading ? (
          // 加载状态
          <div className="flex items-center justify-center h-full">
            <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
              <LoadingSpinner className="w-5 h-5" />
              <span className="text-sm">加载中...</span>
            </div>
          </div>
        ) : messages.length === 0 ? (
          // 空状态
          <div className="flex flex-col items-center justify-center h-full text-neutral-400 dark:text-neutral-500">
            <EmptyIcon className="w-12 h-12 mb-3 opacity-50" />
            <p className="text-sm">此会话暂无消息</p>
          </div>
        ) : (
          // 消息列表
          <div className="flex flex-col gap-4">
            {messages.map((message) => (
              <VoiceMessageCard
                key={message.id}
                message={message}
                isPlaying={playingMessageId === message.id}
                playProgress={playingMessageId === message.id ? playProgress : 0}
                onPlay={() => onPlayMessage(message.id)}
                onStop={onStopPlayback}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部操作栏 */}
      {/* 需求: 6.4, 6.5 - 底部显示"返回实时对话"按钮 */}
      <div className="px-4 py-3 border-t border-neutral-200 dark:border-neutral-700">
        {/* 需求: 6.1 - 只读模式提示 */}
        <div className="flex items-center justify-center gap-2 mb-3">
          <InfoIcon className="w-4 h-4 text-neutral-400" />
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            这是历史记录，无法继续对话
          </span>
        </div>

        {/* 需求: 6.5 - 点击"返回实时对话"返回实时对话界面 */}
        <button
          onClick={onBackToLive}
          className="
            w-full flex items-center justify-center gap-2
            px-4 py-3 rounded-xl
            bg-primary-500 hover:bg-primary-600
            text-white font-medium
            transition-colors
          "
          data-testid="back-to-live-btn"
        >
          <BackToLiveIcon className="w-5 h-5" />
          返回实时对话
        </button>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function HistoryIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

// 返回实时对话图标
function BackToLiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z"
      />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function EmptyIcon({ className }: { className?: string }) {
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

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default LiveHistoryView;
