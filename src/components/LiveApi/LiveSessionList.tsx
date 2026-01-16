/**
 * Live API 会话列表组件
 * 需求: 1.2, 1.4, 1.7, 7.1, 7.4
 * 
 * 显示历史会话列表，支持选择、删除会话
 * 注意：开始会话按钮在底部控制面板中，不在此组件
 */

import { useState, useCallback } from 'react';
import type { LiveSessionSummary } from '../../types/liveApi';

/**
 * 会话列表组件属性
 */
export interface LiveSessionListProps {
  /** 会话摘要列表 */
  sessions: LiveSessionSummary[];
  /** 当前选中的会话 ID */
  selectedSessionId: string | null;
  /** 是否正在加载 */
  isLoading?: boolean;
  /** 选择会话回调 */
  onSelectSession: (sessionId: string) => void;
  /** 删除会话回调 */
  onDeleteSession: (sessionId: string) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化时间显示
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  
  // 判断是否是今年
  const isThisYear = date.getFullYear() === now.getFullYear();
  
  if (isThisYear) {
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
    });
  }
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Live API 会话列表组件
 * 需求: 1.2 - 按时间倒序排列
 * 需求: 1.7 - 开始会话按钮在底部控制面板中
 */
export function LiveSessionList({
  sessions,
  selectedSessionId,
  isLoading = false,
  onSelectSession,
  onDeleteSession,
  className = '',
}: LiveSessionListProps): JSX.Element {
  // 删除确认对话框状态
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // 处理删除点击
  // 需求: 7.4 - 删除前显示确认对话框
  const handleDeleteClick = useCallback((e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(sessionId);
  }, []);

  // 确认删除
  // 需求: 7.1 - 支持删除单个会话
  const handleConfirmDelete = useCallback(() => {
    if (deleteConfirmId) {
      onDeleteSession(deleteConfirmId);
      setDeleteConfirmId(null);
    }
  }, [deleteConfirmId, onDeleteSession]);

  // 取消删除
  const handleCancelDelete = useCallback(() => {
    setDeleteConfirmId(null);
  }, []);

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* 顶部标题栏 - 简化版，移除新建会话按钮 */}
      {/* 需求: 1.7 - 开始会话按钮在底部控制面板中 */}
      <div className="flex items-center px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          历史会话
        </h2>
      </div>

      {/* 会话列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          // 加载状态
          <div className="flex items-center justify-center h-32">
            <div className="flex items-center gap-2 text-neutral-400 dark:text-neutral-500">
              <LoadingSpinner className="w-5 h-5" />
              <span className="text-sm">加载中...</span>
            </div>
          </div>
        ) : sessions.length === 0 ? (
          // 空状态
          <div className="flex flex-col items-center justify-center h-32 text-neutral-400 dark:text-neutral-500">
            <EmptyIcon className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm">暂无历史会话</p>
            <p className="text-xs mt-1">点击上方按钮开始新会话</p>
          </div>
        ) : (
          // 会话列表
          // 需求: 1.2 - 按时间倒序排列（由 store 保证）
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {sessions.map((session) => (
              <SessionItem
                key={session.id}
                session={session}
                isSelected={session.id === selectedSessionId}
                onSelect={() => onSelectSession(session.id)}
                onDelete={(e) => handleDeleteClick(e, session.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      {/* 需求: 7.4 */}
      {deleteConfirmId && (
        <DeleteConfirmDialog
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </div>
  );
}

/**
 * 会话项属性
 */
interface SessionItemProps {
  session: LiveSessionSummary;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

/**
 * 会话项组件
 * 需求: 1.3 - 显示创建时间和简要摘要
 * 需求: 1.4 - 点击显示完整对话记录
 */
function SessionItem({
  session,
  isSelected,
  onSelect,
  onDelete,
}: SessionItemProps): JSX.Element {
  return (
    <div
      onClick={onSelect}
      className={`
        group flex items-start gap-3 px-4 py-3 cursor-pointer
        transition-colors
        ${isSelected
          ? 'bg-primary-50 dark:bg-primary-900/20'
          : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
        }
      `}
      data-testid={`session-item-${session.id}`}
    >
      {/* 语音图标 */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${isSelected
            ? 'bg-primary-100 dark:bg-primary-800/50 text-primary-600 dark:text-primary-400'
            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
          }
        `}
      >
        <VoiceIcon className="w-4 h-4" />
      </div>

      {/* 会话信息 */}
      <div className="flex-1 min-w-0">
        {/* 需求: 1.3 - 显示简要摘要 */}
        <p
          className={`
            text-sm truncate
            ${isSelected
              ? 'text-primary-700 dark:text-primary-300 font-medium'
              : 'text-neutral-700 dark:text-neutral-300'
            }
          `}
        >
          {session.summary || '（无消息）'}
        </p>
        {/* 需求: 1.3 - 显示创建时间 */}
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {formatTime(session.createdAt)}
          </span>
          <span className="text-xs text-neutral-300 dark:text-neutral-600">•</span>
          <span className="text-xs text-neutral-400 dark:text-neutral-500">
            {session.messageCount} 条消息
          </span>
        </div>
      </div>

      {/* 删除按钮 */}
      {/* 需求: 7.1 */}
      <button
        onClick={onDelete}
        className="
          flex-shrink-0 p-1.5 rounded-lg
          opacity-0 group-hover:opacity-100
          hover:bg-red-100 dark:hover:bg-red-900/30
          text-neutral-400 hover:text-red-500 dark:hover:text-red-400
          transition-all
        "
        title="删除会话"
        data-testid={`delete-session-${session.id}`}
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * 删除确认对话框属性
 */
interface DeleteConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * 删除确认对话框
 * 需求: 7.4 - 删除前显示确认对话框
 */
function DeleteConfirmDialog({
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="
          bg-white dark:bg-neutral-800 rounded-xl shadow-xl
          p-6 mx-4 max-w-sm w-full
        "
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
          确认删除
        </h3>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          删除后将无法恢复此会话及其语音记录，确定要删除吗？
        </p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="
              px-4 py-2 rounded-lg
              bg-neutral-100 dark:bg-neutral-700
              text-neutral-700 dark:text-neutral-300
              hover:bg-neutral-200 dark:hover:bg-neutral-600
              transition-colors text-sm font-medium
            "
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="
              px-4 py-2 rounded-lg
              bg-red-500 hover:bg-red-600
              text-white
              transition-colors text-sm font-medium
            "
            data-testid="confirm-delete-btn"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

function VoiceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
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

export default LiveSessionList;
