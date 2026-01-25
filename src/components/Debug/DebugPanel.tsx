/**
 * 调试面板组件
 * 需求: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2
 * 
 * 显示 API 请求历史列表和请求详情
 * 修复: 模态框定位、列表项对齐、响应式布局
 */

import { useCallback } from 'react';
import { useDebugStore, type ApiRequestRecord } from '../../stores/debug';
import { RequestDetail } from './RequestDetail';
import { formatDuration } from '../../services/timeTracker';
import { useTranslation } from '@/i18n';

// ============ 类型定义 ============

interface DebugPanelProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

// ============ 主组件 ============

/**
 * 调试面板
 * 需求: 1.1, 1.2, 1.3, 1.4, 6.1, 6.2
 */
export function DebugPanel({ isOpen, onClose }: DebugPanelProps) {
  const { t } = useTranslation();
  
  const {
    requestHistory,
    selectedRequestId,
    debugEnabled,
    setDebugEnabled,
    selectRequest,
    clearHistory,
  } = useDebugStore();

  // 获取选中的请求记录
  const selectedRequest = requestHistory.find((r) => r.id === selectedRequestId);

  // 切换调试模式
  const handleToggleDebug = useCallback(() => {
    setDebugEnabled(!debugEnabled);
  }, [debugEnabled, setDebugEnabled]);

  // 清除历史记录
  const handleClearHistory = useCallback(() => {
    if (window.confirm(t('debug.clearConfirm'))) {
      clearHistory();
    }
  }, [clearHistory, t]);

  // 返回列表
  const handleBackToList = useCallback(() => {
    selectRequest(null);
  }, [selectRequest]);

  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="debug-panel-title"
    >
      {/* 背景遮罩 */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 面板内容 - 修复定位和响应式尺寸 */}
      <div className="relative w-full max-w-4xl h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] md:h-[80vh] max-h-[800px] bg-white dark:bg-neutral-800 rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* 头部 - 修复对齐和响应式布局 */}
        <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-neutral-200 dark:border-neutral-700">
          <div className="flex items-center gap-3 min-w-0">
            {selectedRequest && (
              <button
                onClick={handleBackToList}
                className="flex-shrink-0 p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                title={t('debug.backToList')}
                aria-label={t('debug.backToList')}
              >
                <BackIcon />
              </button>
            )}
            <h2 
              id="debug-panel-title"
              className="text-base sm:text-lg font-semibold text-neutral-900 dark:text-white truncate"
            >
              {selectedRequest ? t('debug.requestDetail') : t('debug.title')}
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            {/* 调试模式开关 */}
            <label className="flex items-center gap-2 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
              <span className="hidden xs:inline">{t('debug.debugMode')}</span>
              <span className="xs:hidden">{t('debug.debugMode')}</span>
              <button
                onClick={handleToggleDebug}
                role="switch"
                aria-checked={debugEnabled}
                aria-label={t('debug.debugMode')}
                className={`
                  relative w-9 sm:w-10 h-5 rounded-full transition-colors duration-200 flex-shrink-0
                  ${debugEnabled ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600'}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200
                    ${debugEnabled ? 'translate-x-4 sm:translate-x-5' : 'translate-x-0'}
                  `}
                />
              </button>
            </label>

            {/* 清除按钮 */}
            {!selectedRequest && requestHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors whitespace-nowrap"
              >
                {t('debug.clear')}
              </button>
            )}

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="p-1.5 rounded hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors flex-shrink-0"
              title={t('common.close')}
              aria-label={t('common.close')}
            >
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex-1 overflow-hidden min-h-0">
          {selectedRequest ? (
            <RequestDetail request={selectedRequest} />
          ) : (
            <RequestHistoryList
              requests={requestHistory}
              selectedId={selectedRequestId}
              onSelect={selectRequest}
              debugEnabled={debugEnabled}
              t={t}
            />
          )}
        </div>
      </div>
    </div>
  );
}


// ============ 请求历史列表组件 ============

interface RequestHistoryListProps {
  requests: ApiRequestRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  debugEnabled: boolean;
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * 请求历史列表
 * 需求: 6.1
 */
function RequestHistoryList({
  requests,
  selectedId,
  onSelect,
  debugEnabled,
  t,
}: RequestHistoryListProps) {
  if (!debugEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
        <DebugOffIcon />
        <p className="mt-4 text-lg">{t('debug.debugModeOff')}</p>
        <p className="mt-2 text-sm">{t('debug.enableDebugHint')}</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
        <EmptyIcon />
        <p className="mt-4 text-lg">{t('debug.noRequests')}</p>
        <p className="mt-2 text-sm">{t('debug.sendMessageHint')}</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="divide-y divide-neutral-200 dark:divide-neutral-700">
        {requests.map((request) => (
          <RequestListItem
            key={request.id}
            request={request}
            isSelected={request.id === selectedId}
            onClick={() => onSelect(request.id)}
          />
        ))}
      </div>
    </div>
  );
}

// ============ 请求列表项组件 ============

interface RequestListItemProps {
  request: ApiRequestRecord;
  isSelected: boolean;
  onClick: () => void;
}

/**
 * 请求列表项
 * 需求: 1.2, 6.1
 * 修复: 列表项对齐问题，响应式布局
 */
function RequestListItem({ request, isSelected, onClick }: RequestListItemProps) {
  const timestamp = new Date(request.timestamp).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // 状态颜色
  const statusColor = getStatusColor(request.statusCode);

  return (
    <button
      onClick={onClick}
      className={`
        w-full px-4 sm:px-6 py-3 sm:py-4 text-left transition-colors
        ${isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-700/50'
        }
      `}
    >
      {/* 主行 - 修复对齐 */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* 方法标签 - 固定宽度确保对齐 */}
        <span className="flex-shrink-0 w-12 sm:w-14 px-1.5 sm:px-2 py-0.5 text-xs font-medium rounded bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-white text-center">
          {request.method}
        </span>

        {/* URL - 自适应宽度 */}
        <span className="flex-1 min-w-0 text-xs sm:text-sm text-neutral-700 dark:text-neutral-300 truncate">
          {truncateUrl(request.url)}
        </span>

        {/* 右侧信息 - 固定宽度确保对齐 */}
        <div className="flex-shrink-0 flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
          {/* 状态码 */}
          {request.statusCode !== undefined && (
            <span className={`w-8 sm:w-10 text-center font-medium ${statusColor}`}>
              {request.statusCode}
            </span>
          )}

          {/* 耗时 */}
          {request.duration !== undefined && (
            <span className="w-14 sm:w-16 text-right text-neutral-500 dark:text-neutral-400">
              {formatDuration(request.duration)}
            </span>
          )}

          {/* 时间戳 - 在小屏幕上隐藏 */}
          <span className="hidden md:block w-24 text-right text-neutral-400 dark:text-neutral-500 text-xs">
            {timestamp}
          </span>

          {/* 箭头 */}
          <ChevronRightIcon />
        </div>
      </div>

      {/* 错误信息 */}
      {request.error && (
        <p className="mt-2 ml-14 sm:ml-16 text-xs sm:text-sm text-red-600 dark:text-red-400 truncate">
          {request.error}
        </p>
      )}
    </button>
  );
}

// ============ 辅助函数 ============

/**
 * 获取状态码颜色
 */
function getStatusColor(statusCode?: number): string {
  if (statusCode === undefined) {
    return 'text-neutral-500';
  }
  if (statusCode >= 200 && statusCode < 300) {
    return 'text-green-600 dark:text-green-400';
  }
  if (statusCode >= 400 && statusCode < 500) {
    return 'text-yellow-600 dark:text-yellow-400';
  }
  if (statusCode >= 500) {
    return 'text-red-600 dark:text-red-400';
  }
  return 'text-neutral-500';
}

/**
 * 截断 URL 显示
 */
function truncateUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname + urlObj.search;
  } catch {
    return url.length > 60 ? url.substring(0, 60) + '...' : url;
  }
}

// ============ 图标组件 ============

function BackIcon() {
  return (
    <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-5 h-5 text-neutral-600 dark:text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function EmptyIcon() {
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function DebugOffIcon() {
  return (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default DebugPanel;
