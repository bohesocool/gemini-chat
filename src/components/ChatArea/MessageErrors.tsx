/**
 * 消息列表错误展示组件
 * 来源：VirtualMessageList.tsx（拆分，逻辑不变）
 */

import { memo } from 'react';
import { ErrorIcon, RetryIcon } from '../icons';
import { Avatar } from './MessageListParts';

/**
 * 错误消息组件
 * 显示API错误信息，提供重试和关闭选项
 */
interface ErrorMessageProps {
  error: string;
  onRetry?: (messageId: string) => void;
  onDismiss?: (messageId: string) => void;
}

export const ErrorMessage = memo(function ErrorMessage({ error, onRetry, onDismiss }: ErrorMessageProps) {
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

export const MessageError = memo(function MessageError({ error, onRetry, onDismiss }: MessageErrorProps) {
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
