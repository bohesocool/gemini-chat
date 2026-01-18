/**
 * 连接状态显示组件
 * 需求: 9.1
 * 
 * 显示 Live API 连接状态，支持四种状态：未连接、连接中、已连接、错误
 */


import type { ConnectionStatus as ConnectionStatusType } from '../../types/liveApi';
import { getConnectionStatusText } from '../../stores/live';

/**
 * 连接状态显示属性
 */
export interface ConnectionStatusProps {
  /** 连接状态 */
  status: ConnectionStatusType;
  /** 错误消息（仅在 error 状态时显示） */
  errorMessage?: string | null;
  /** 是否显示详细信息 */
  showDetails?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 状态配置映射
 */
const STATUS_CONFIG: Record<ConnectionStatusType, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  pulseAnimation: boolean;
}> = {
  disconnected: {
    color: 'text-neutral-500 dark:text-neutral-400',
    bgColor: 'bg-neutral-100 dark:bg-neutral-800',
    borderColor: 'border-neutral-300 dark:border-neutral-600',
    icon: <DisconnectedIcon />,
    pulseAnimation: false,
  },
  connecting: {
    color: 'text-yellow-600 dark:text-yellow-400',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-300 dark:border-yellow-600',
    icon: <ConnectingIcon />,
    pulseAnimation: true,
  },
  connected: {
    color: 'text-primary-600 dark:text-primary-400',
    bgColor: 'bg-primary-50 dark:bg-primary-900/20',
    borderColor: 'border-primary-300 dark:border-primary-600',
    icon: <ConnectedIcon />,
    pulseAnimation: false,
  },
  error: {
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-300 dark:border-red-600',
    icon: <ErrorIcon />,
    pulseAnimation: false,
  },
};

/**
 * 连接状态显示组件
 */
export function ConnectionStatus({
  status,
  errorMessage,
  showDetails = false,
  className = '',
}: ConnectionStatusProps): JSX.Element {
  const config = STATUS_CONFIG[status];
  const statusText = getConnectionStatusText(status);

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-full border
          ${config.bgColor} ${config.borderColor}
        `}
      >
        {/* 状态图标 */}
        <span className={`w-4 h-4 ${config.color} ${config.pulseAnimation ? 'animate-pulse' : ''}`}>
          {config.icon}
        </span>

        {/* 状态文本 */}
        <span className={`text-sm font-medium ${config.color}`}>
          {statusText}
        </span>
      </div>

      {/* 错误详情 */}
      {showDetails && status === 'error' && errorMessage && (
        <p className="text-xs text-red-600 dark:text-red-400 px-3">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

/**
 * 紧凑型连接状态指示器
 * 仅显示图标和颜色指示
 */
export interface CompactConnectionStatusProps {
  /** 连接状态 */
  status: ConnectionStatusType;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * 紧凑型连接状态指示器
 */
export function CompactConnectionStatus({
  status,
  size = 'md',
  className = '',
}: CompactConnectionStatusProps): JSX.Element {
  const statusText = getConnectionStatusText(status);

  // 尺寸映射
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4',
  };

  // 颜色映射（仅圆点颜色）
  const dotColors: Record<ConnectionStatusType, string> = {
    disconnected: 'bg-neutral-400 dark:bg-neutral-500',
    connecting: 'bg-yellow-500',
    connected: 'bg-primary-500',
    error: 'bg-red-500',
  };

  return (
    <div
      className={`relative ${sizeClasses[size]} ${className}`}
      title={statusText}
      role="status"
      aria-label={statusText}
    >
      {/* 脉冲动画（连接中状态） */}
      {status === 'connecting' && (
        <span
          className={`absolute inset-0 rounded-full ${dotColors[status]} animate-ping opacity-75`}
        />
      )}
      {/* 主圆点 */}
      <span
        className={`absolute inset-0 rounded-full ${dotColors[status]}`}
      />
    </div>
  );
}

/**
 * 连接状态徽章
 * 带有背景色的状态显示
 */
export interface ConnectionStatusBadgeProps {
  /** 连接状态 */
  status: ConnectionStatusType;
  /** 自定义类名 */
  className?: string;
}

/**
 * 连接状态徽章组件
 */
export function ConnectionStatusBadge({
  status,
  className = '',
}: ConnectionStatusBadgeProps): JSX.Element {
  const config = STATUS_CONFIG[status];
  const statusText = getConnectionStatusText(status);

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium
        ${config.bgColor} ${config.color}
        ${className}
      `}
      role="status"
    >
      <CompactConnectionStatus status={status} size="sm" />
      {statusText}
    </span>
  );
}

// ============ 图标组件 ============

function DisconnectedIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3"
      />
    </svg>
  );
}

function ConnectingIcon() {
  return (
    <svg className="w-full h-full animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function ConnectedIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

export default ConnectionStatus;
