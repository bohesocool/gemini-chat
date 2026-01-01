/**
 * 书签详情视图组件
 * 需求: 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
 * 
 * 在主内容区显示选中书签的详细信息，包括：
 * - 消息内容（使用 MarkdownRenderer 渲染）
 * - 元数据（角色标签、时间戳、来源对话名称）
 * - 跳转原消息、删除书签按钮
 * - 空状态提示
 */

import { useCallback } from 'react';
import { useBookmarkStore } from '../../stores/bookmark';
import type { Bookmark } from '../../stores/bookmark';
import { MarkdownRenderer } from '../MarkdownRenderer';

export interface BookmarkDetailViewProps {
  /** 选中的书签 ID */
  selectedBookmarkId: string | null;
  /** 导航到原消息回调 */
  onNavigate: (bookmark: Bookmark) => void;
  /** 删除书签回调 */
  onDelete: (bookmarkId: string) => void;
}

/**
 * 格式化时间戳为可读字符串
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 书签详情视图组件
 * 需求: 3.4 - 显示完整消息内容，使用 Markdown 渲染
 * 需求: 3.5 - 显示消息元数据
 * 需求: 3.8 - 空状态显示
 */
export function BookmarkDetailView({
  selectedBookmarkId,
  onNavigate,
  onDelete,
}: BookmarkDetailViewProps) {
  const { bookmarks } = useBookmarkStore();
  
  // 根据 ID 获取选中的书签
  const bookmark = selectedBookmarkId 
    ? bookmarks.find(b => b.id === selectedBookmarkId) 
    : null;

  // 处理跳转原消息按钮点击 - 需求: 3.6
  const handleNavigate = useCallback(() => {
    if (bookmark) {
      onNavigate(bookmark);
    }
  }, [bookmark, onNavigate]);

  // 处理删除按钮点击 - 需求: 3.7
  const handleDelete = useCallback(() => {
    if (bookmark) {
      onDelete(bookmark.messageId);
    }
  }, [bookmark, onDelete]);

  // 空状态 - 需求: 3.8
  if (!bookmark) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <EmptyBookmarkIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          选择一个书签
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 max-w-sm">
          从左侧列表中选择一个书签，查看完整消息内容
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      {/* 头部 - 标题和操作按钮 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <BookmarkIcon className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            书签详情
          </h2>
        </div>
        
        {/* 操作按钮 - 需求: 3.6, 3.7 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleNavigate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="跳转到原消息"
          >
            <NavigateIcon className="w-4 h-4" />
            跳转原消息
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="删除书签"
          >
            <TrashIcon className="w-4 h-4" />
            删除书签
          </button>
        </div>
      </div>

      {/* 元数据区 - 需求: 3.5 */}
      <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
        <div className="flex flex-wrap items-center gap-3">
          {/* 角色标签 */}
          <span className={`px-2.5 py-1 rounded-md text-sm font-medium ${
            bookmark.messageRole === 'user' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
              : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
          }`}>
            {bookmark.messageRole === 'user' ? '用户' : 'AI'}
          </span>
          
          {/* 来源对话 */}
          <div className="flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
            <ChatIcon className="w-4 h-4" />
            <span>来自: {bookmark.windowTitle}</span>
          </div>
          
          {/* 时间戳 */}
          <div className="flex items-center gap-1.5 text-sm text-neutral-500 dark:text-neutral-500">
            <ClockIcon className="w-4 h-4" />
            <span>{formatTimestamp(bookmark.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* 消息内容区 - 需求: 3.4 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        <div className="prose prose-neutral dark:prose-invert max-w-none">
          <MarkdownRenderer content={bookmark.messagePreview} />
        </div>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

function EmptyBookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function NavigateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default BookmarkDetailView;
