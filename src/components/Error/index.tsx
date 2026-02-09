/**
 * 错误提示组件库
 * 提供友好的错误信息显示和重试功能
 * 
 * Requirements: 11.6
 */

import React from 'react';
import { useReducedMotion } from '../motion';
import { useTranslation } from '@/i18n';
import { createLogger } from '../../services/logger';

// 模块日志记录器
const logger = createLogger('ErrorBoundary');

// ============================================
// 错误图标组件
// ============================================

function ErrorIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

// ============================================
// 重试图标组件
// ============================================

function RetryIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

// ============================================
// 错误提示组件
// ============================================

export interface ErrorMessageProps {
  /** 错误标题 */
  title?: string;
  /** 错误描述 */
  message: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 重试按钮文本 */
  retryText?: string;
  /** 是否正在重试 */
  isRetrying?: boolean;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * 错误提示组件
 * 显示友好的错误信息和重试按钮
 * 
 * Requirements: 11.6 - 加载失败时显示友好的错误提示和重试按钮
 */
export function ErrorMessage({
  title,
  message,
  onRetry,
  retryText,
  isRetrying = false,
  size = 'md',
  className = '',
}: ErrorMessageProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  
  // 使用翻译后的默认值
  const displayTitle = title ?? t('common.somethingWentWrong');
  const displayRetryText = retryText ?? t('common.retry');
  
  const sizeClasses = {
    sm: {
      container: 'p-4',
      icon: 'w-8 h-8',
      title: 'text-base',
      message: 'text-sm',
      button: 'px-3 py-1.5 text-sm',
    },
    md: {
      container: 'p-6',
      icon: 'w-12 h-12',
      title: 'text-lg',
      message: 'text-base',
      button: 'px-4 py-2 text-base',
    },
    lg: {
      container: 'p-8',
      icon: 'w-16 h-16',
      title: 'text-xl',
      message: 'text-lg',
      button: 'px-6 py-3 text-lg',
    },
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center
        ${classes.container}
        ${className}
      `}
    >
      {/* 错误图标 */}
      <div className="mb-4">
        <ErrorIcon
          className={`
            ${classes.icon}
            text-red-500 dark:text-red-400
          `}
        />
      </div>
      
      {/* 错误标题 */}
      <h3
        className={`
          ${classes.title}
          font-semibold text-slate-900 dark:text-slate-100
          mb-2
        `}
      >
        {displayTitle}
      </h3>
      
      {/* 错误描述 */}
      <p
        className={`
          ${classes.message}
          text-slate-600 dark:text-slate-400
          mb-6 max-w-md
        `}
      >
        {message}
      </p>
      
      {/* 重试按钮 */}
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={isRetrying}
          className={`
            ${classes.button}
            inline-flex items-center gap-2
            bg-blue-500 hover:bg-blue-600
            disabled:bg-blue-400 disabled:cursor-not-allowed
            text-white font-medium
            rounded-lg
            ${prefersReducedMotion ? '' : 'transition-colors duration-200'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            dark:focus:ring-offset-slate-900
          `}
        >
          <RetryIcon
            className={`
              w-4 h-4
              ${isRetrying && !prefersReducedMotion ? 'animate-spin' : ''}
            `}
          />
          {isRetrying ? t('common.retrying') : displayRetryText}
        </button>
      )}
    </div>
  );
}


// ============================================
// 错误边界组件
// ============================================

export interface ErrorBoundaryProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 自定义错误渲染 */
  fallback?: React.ReactNode | ((error: Error, reset: () => void) => React.ReactNode);
  /** 错误回调 */
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * 错误边界默认 UI 组件
 * 用于在类组件中使用翻译 Hook
 */
function ErrorBoundaryFallback({ 
  error, 
  onReset 
}: { 
  error: Error; 
  onReset: () => void;
}) {
  const { t } = useTranslation();
  
  return (
    <ErrorMessage
      title={t('common.appError')}
      message={error.message || t('common.unknownErrorMessage')}
      onRetry={onReset}
      retryText={t('common.reload')}
      size="lg"
      className="min-h-[300px]"
    />
  );
}

/**
 * 错误边界组件
 * 捕获子组件的 JavaScript 错误并显示备用 UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.props.onError?.(error, errorInfo);
    logger.error('ErrorBoundary caught an error:', { error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        if (typeof this.props.fallback === 'function') {
          return this.props.fallback(this.state.error, this.handleReset);
        }
        return this.props.fallback;
      }

      return (
        <ErrorBoundaryFallback 
          error={this.state.error} 
          onReset={this.handleReset} 
        />
      );
    }

    return this.props.children;
  }
}

// ============================================
// 内联错误提示
// ============================================

export interface InlineErrorProps {
  /** 错误信息 */
  message: string;
  /** 重试回调 */
  onRetry?: () => void;
  /** 关闭回调 */
  onDismiss?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 内联错误提示组件
 * 用于表单或小区域的错误提示
 */
export function InlineError({
  message,
  onRetry,
  onDismiss,
  className = '',
}: InlineErrorProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <div
      className={`
        flex items-center gap-3 p-3
        bg-red-50 dark:bg-red-900/20
        border border-red-200 dark:border-red-800
        rounded-lg
        ${className}
      `}
    >
      <ErrorIcon className="w-5 h-5 text-red-500 dark:text-red-400 flex-shrink-0" />
      
      <p className="flex-1 text-sm text-red-700 dark:text-red-300">
        {message}
      </p>
      
      <div className="flex items-center gap-2">
        {onRetry && (
          <button
            onClick={onRetry}
            className={`
              p-1.5 rounded-md
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/30
              ${prefersReducedMotion ? '' : 'transition-colors duration-200'}
            `}
            title={t('common.retry')}
          >
            <RetryIcon className="w-4 h-4" />
          </button>
        )}
        
        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`
              p-1.5 rounded-md
              text-red-600 dark:text-red-400
              hover:bg-red-100 dark:hover:bg-red-900/30
              ${prefersReducedMotion ? '' : 'transition-colors duration-200'}
            `}
            title={t('common.close')}
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// 空状态组件
// ============================================

export interface EmptyStateProps {
  /** 标题 */
  title?: string;
  /** 描述 */
  description?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 操作按钮 */
  action?: {
    label: string;
    onClick: () => void;
  };
  /** 自定义类名 */
  className?: string;
}

/**
 * 空状态组件
 * 当列表为空或没有数据时显示
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  const { t } = useTranslation();
  const prefersReducedMotion = useReducedMotion();
  
  // 使用翻译后的默认值
  const displayTitle = title ?? t('common.noData');

  return (
    <div
      className={`
        flex flex-col items-center justify-center text-center p-8
        ${className}
      `}
    >
      {/* 图标 */}
      {icon ? (
        <div className="mb-4 text-slate-400 dark:text-slate-500">
          {icon}
        </div>
      ) : (
        <div className="mb-4">
          <svg
            className="w-16 h-16 text-slate-300 dark:text-slate-600"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
      )}
      
      {/* 标题 */}
      <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-2">
        {displayTitle}
      </h3>
      
      {/* 描述 */}
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-sm">
          {description}
        </p>
      )}
      
      {/* 操作按钮 */}
      {action && (
        <button
          onClick={action.onClick}
          className={`
            px-4 py-2
            bg-blue-500 hover:bg-blue-600
            text-white font-medium text-sm
            rounded-lg
            ${prefersReducedMotion ? '' : 'transition-colors duration-200'}
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
            dark:focus:ring-offset-slate-900
          `}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
