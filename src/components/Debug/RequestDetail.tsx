/**
 * 请求详情组件
 * 需求: 6.2, 6.4
 * 
 * 显示请求头、请求体、响应内容，支持 JSON 格式化和复制
 */

import { useState, useCallback } from 'react';
import type { ApiRequestRecord } from '../../stores/debug';
import { TokenUsageDisplay } from './TokenUsageDisplay';
import { TimingDisplay } from './TimingDisplay';
import { useTranslation } from '@/i18n';
import { createLogger } from '../../services/logger';

// 模块日志记录器
const logger = createLogger('RequestDetail');

// ============ 类型定义 ============

interface RequestDetailProps {
  /** 请求记录 */
  request: ApiRequestRecord;
}

type TabId = 'headers' | 'body' | 'response';

// ============ 主组件 ============

/**
 * 请求详情
 * 需求: 1.3, 1.4, 6.2
 * 修复: 详情信息溢出/截断问题，响应式布局
 */
export function RequestDetail({ request }: RequestDetailProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabId>('response');

  return (
    <div className="h-full flex flex-col">
      {/* 概览信息 - 修复响应式布局 */}
      <div className="flex-shrink-0 px-4 sm:px-6 py-3 sm:py-4 bg-neutral-50 dark:bg-neutral-900/50 border-b border-neutral-200 dark:border-neutral-700">
        {/* 方法和 URL */}
        <div className="flex items-start gap-2 sm:gap-3">
          <span className="flex-shrink-0 px-2 py-1 text-xs sm:text-sm font-medium rounded bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-white">
            {request.method}
          </span>
          <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 break-all min-w-0">
            {request.url}
          </span>
        </div>

        {/* 统计信息 - 修复响应式布局 */}
        <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 md:gap-6">
          {/* 状态码 */}
          {request.statusCode !== undefined && (
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400">{t('debug.status')}:</span>
              <StatusBadge statusCode={request.statusCode} />
            </div>
          )}

          {/* 耗时 */}
          <TimingDisplay duration={request.duration} ttfb={request.ttfb} compact />

          {/* Token 使用量 */}
          {request.tokenUsage && (
            <TokenUsageDisplay tokenUsage={request.tokenUsage} compact />
          )}
        </div>

        {/* 错误信息 */}
        {request.error && (
          <div className="mt-3 p-2 sm:p-3 bg-red-50 dark:bg-red-900/20 rounded-lg overflow-hidden">
            <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 break-words">
              {request.error}
            </p>
          </div>
        )}
      </div>

      {/* 标签页 - 修复响应式布局 */}
      <div className="flex-shrink-0 flex border-b border-neutral-200 dark:border-neutral-700 overflow-x-auto">
        <TabButton
          label={t('debug.response')}
          isActive={activeTab === 'response'}
          onClick={() => setActiveTab('response')}
        />
        <TabButton
          label={t('debug.body')}
          isActive={activeTab === 'body'}
          onClick={() => setActiveTab('body')}
        />
        <TabButton
          label={t('debug.headers')}
          isActive={activeTab === 'headers'}
          onClick={() => setActiveTab('headers')}
        />
      </div>

      {/* 内容区 */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === 'headers' && (
          <JsonViewer data={request.headers} title={t('debug.headers')} />
        )}
        {activeTab === 'body' && (
          <JsonViewer data={request.body} title={t('debug.body')} />
        )}
        {activeTab === 'response' && (
          <JsonViewer data={request.response} title={t('debug.response')} />
        )}
      </div>
    </div>
  );
}


// ============ 标签按钮组件 ============

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      role="tab"
      aria-selected={isActive}
      className={`
        flex-shrink-0 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap
        ${isActive
          ? 'text-primary-600 dark:text-primary-400 border-b-2 border-primary-500'
          : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
        }
      `}
    >
      {label}
    </button>
  );
}

// ============ 状态徽章组件 ============

interface StatusBadgeProps {
  statusCode: number;
}

function StatusBadge({ statusCode }: StatusBadgeProps) {
  let colorClass = 'bg-neutral-100 text-neutral-700 dark:bg-neutral-700 dark:text-neutral-300';
  
  if (statusCode >= 200 && statusCode < 300) {
    colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  } else if (statusCode >= 400 && statusCode < 500) {
    colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  } else if (statusCode >= 500) {
    colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  }

  return (
    <span className={`px-2 py-0.5 text-sm font-medium rounded ${colorClass}`}>
      {statusCode}
    </span>
  );
}

// ============ JSON 查看器组件 ============

interface JsonViewerProps {
  data: unknown;
  title: string;
}

/**
 * JSON 查看器
 * 需求: 1.3, 1.4, 6.2, 6.4
 * 修复: 内容溢出问题，响应式布局
 */
function JsonViewer({ data, title }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);

  // 格式化 JSON
  const formattedJson = formatJson(data);

  // 复制到剪贴板
  // 需求: 6.4
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error('复制失败:', err);
    }
  }, [formattedJson]);

  if (data === undefined || data === null) {
    return (
      <div className="flex items-center justify-center h-full text-neutral-500 dark:text-neutral-400">
        <p className="text-sm">无{title}数据</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* 工具栏 - 修复响应式布局 */}
      <div className="flex-shrink-0 flex items-center justify-between px-3 sm:px-4 py-2 bg-neutral-50 dark:bg-neutral-900/30 border-b border-neutral-200 dark:border-neutral-700">
        <span className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">{title}</span>
        <button
          onClick={handleCopy}
          aria-label={copied ? '已复制' : '复制内容'}
          className={`
            flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 text-xs sm:text-sm rounded transition-colors
            ${copied
              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
              : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-600'
            }
          `}
        >
          {copied ? <CheckIcon /> : <CopyIcon />}
          <span className="hidden xs:inline">{copied ? '已复制' : '复制'}</span>
        </button>
      </div>

      {/* JSON 内容 - 修复溢出问题 */}
      <div className="flex-1 overflow-auto p-3 sm:p-4 min-h-0">
        <pre className="text-xs sm:text-sm font-mono text-neutral-800 dark:text-neutral-200 whitespace-pre-wrap break-words overflow-wrap-anywhere">
          {formattedJson}
        </pre>
      </div>
    </div>
  );
}

// ============ 辅助函数 ============

/**
 * 格式化 JSON 数据
 */
function formatJson(data: unknown): string {
  if (data === undefined || data === null) {
    return '';
  }

  if (typeof data === 'string') {
    // 尝试解析为 JSON
    try {
      const parsed = JSON.parse(data);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return data;
    }
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

// ============ 图标组件 ============

function CopyIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

export default RequestDetail;
