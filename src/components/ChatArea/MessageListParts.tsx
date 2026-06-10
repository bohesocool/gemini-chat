/**
 * 消息列表基础展示组件（头像、气泡、打字指示器、空状态等）
 * 来源：VirtualMessageList.tsx（拆分，逻辑不变）
 */

import { memo } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { UserIcon, BotIcon } from '../icons';

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

export const MessageBubble = memo(function MessageBubble({ isUser, children, isRegenerating = false }: MessageBubbleProps) {
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
 * 头像组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
export const Avatar = memo(function Avatar({ role }: { role: 'user' | 'model' }) {
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
 * 空状态组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
export const EmptyState = memo(function EmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center text-center pt-24 pb-12">
      <div className="
        w-16 h-16 rounded-2xl
        bg-gradient-to-br from-green-500 to-emerald-600
        dark:from-green-700 dark:to-emerald-800
        flex items-center justify-center mb-4
        shadow-lg shadow-green-500/30 dark:shadow-green-900/40
        start-new-chat-icon
      ">
        <BotIcon className="w-8 h-8 text-white" />
      </div>
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        {t('chat.emptyState')}
      </h3>
      <p className="text-neutral-500 dark:text-neutral-400 max-w-sm">
        {t('chat.emptyStateHint')}
      </p>
    </div>
  );
});

/**
 * 打字指示器动画组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
export const TypingIndicator = memo(function TypingIndicator() {
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
export const TypingCursor = memo(function TypingCursor() {
  return (
    <span className="
      inline-block w-0.5 h-4 ml-0.5
      bg-brand
      animate-pulse
    " />
  );
});
