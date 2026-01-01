/**
 * 书签列表组件
 * 需求: 3.2, 3.9 - 简洁列表，点击选中，高亮显示
 */

import React, { useCallback, useEffect } from 'react';
import { useBookmarkStore } from '../../stores/bookmark';
import { useSidebarView } from '../Layout';
import type { Bookmark } from '../../stores/bookmark';

/**
 * 书签列表组件
 * 简洁列表显示，点击卡片设置 selectedBookmarkId
 * 需求: 3.2 - 卡片只显示消息预览和基本元数据
 * 需求: 3.9 - 选中状态高亮
 */
export function BookmarkList() {
  const { bookmarks, initialized, loadBookmarks } = useBookmarkStore();
  const { selectedBookmarkId, setSelectedBookmarkId } = useSidebarView();

  // 初始化加载书签
  useEffect(() => {
    if (!initialized) {
      loadBookmarks();
    }
  }, [initialized, loadBookmarks]);

  // 点击书签卡片 - 设置选中状态
  const handleSelect = useCallback((bookmark: Bookmark) => {
    setSelectedBookmarkId(bookmark.id);
  }, [setSelectedBookmarkId]);

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // 今天
    if (diff < 24 * 60 * 60 * 1000 && date.getDate() === now.getDate()) {
      return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    // 昨天
    if (diff < 48 * 60 * 60 * 1000) {
      return '昨天';
    }
    // 本周
    if (diff < 7 * 24 * 60 * 60 * 1000) {
      const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
      return days[date.getDay()] || '未知';
    }
    // 更早
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* 书签列表 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
        {bookmarks.length === 0 ? (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
            <BookmarkEmptyIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>暂无书签</p>
            <p className="text-sm mt-1">在消息上点击书签图标收藏</p>
          </div>
        ) : (
          <div className="space-y-2">
            {bookmarks.map(bookmark => (
              <BookmarkCard
                key={bookmark.id}
                bookmark={bookmark}
                isSelected={selectedBookmarkId === bookmark.id}
                onSelect={() => handleSelect(bookmark)}
                formatTime={formatTime}
              />
            ))}
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          {bookmarks.length} 个书签
        </p>
      </div>
    </div>
  );
}

// ============ 书签卡片组件 ============

interface BookmarkCardProps {
  bookmark: Bookmark;
  isSelected: boolean;
  onSelect: () => void;
  formatTime: (timestamp: number) => string;
}

/**
 * 书签卡片组件
 * 需求: 3.2 - 简洁显示消息预览和基本元数据
 * 需求: 3.9 - 选中状态高亮
 */
function BookmarkCard({ bookmark, isSelected, onSelect, formatTime }: BookmarkCardProps) {
  return (
    <div
      onClick={onSelect}
      className={`
        p-3 rounded-lg border transition-colors cursor-pointer
        ${isSelected 
          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-300 dark:border-primary-600 ring-1 ring-primary-300 dark:ring-primary-600' 
          : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-600'
        }
      `}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          {/* 消息预览 */}
          <p className="text-sm text-neutral-800 dark:text-neutral-200 line-clamp-2">
            {bookmark.messagePreview || '(空消息)'}
          </p>
          
          {/* 元信息 */}
          <div className="flex items-center gap-2 mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">
            {/* 角色标签 */}
            <span className={`px-1.5 py-0.5 rounded ${
              bookmark.messageRole === 'user' 
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                : 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
            }`}>
              {bookmark.messageRole === 'user' ? '用户' : 'AI'}
            </span>
            
            {/* 来源对话 */}
            <span className="truncate max-w-[100px]" title={bookmark.windowTitle}>
              {bookmark.windowTitle}
            </span>
            
            {/* 时间 */}
            <span>{formatTime(bookmark.createdAt)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

function BookmarkEmptyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

export default BookmarkList;
