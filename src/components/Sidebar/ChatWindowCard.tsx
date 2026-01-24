/**
 * 聊天窗口卡片组件
 * 参考图片风格：星标图标在左侧，紧凑布局
 * 需求: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6
 */

import React, { useState } from 'react';
import { useTranslation } from '@/i18n';
import { touchTargets } from '../../design/tokens';
import type { ChatWindow, SubTopic } from '../../types/chatWindow';
import { ModelBadge } from './ModelBadge';

// ============ 工具函数 ============

/**
 * 格式化时间戳为相对时间
 */
function useFormatRelativeTime() {
  const { t, locale } = useTranslation();
  
  return (timestamp: number): string => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (locale === 'zh-CN') {
      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes} 分钟前`;
      if (hours < 24) return `${hours} 小时前`;
      if (days === 1) return t('common.yesterday');
      if (days < 7) return t('common.daysAgo', { days: String(days) });
      return new Date(timestamp).toLocaleDateString('zh-CN');
    } else {
      if (minutes < 1) return 'Just now';
      if (minutes < 60) return `${minutes} min ago`;
      if (hours < 24) return `${hours} hr ago`;
      if (days === 1) return t('common.yesterday');
      if (days < 7) return t('common.daysAgo', { days: String(days) });
      return new Date(timestamp).toLocaleDateString('en-US');
    }
  };
}

// ============ 组件接口 ============

interface ChatWindowCardProps {
  /** 聊天窗口数据 */
  window: ChatWindow;
  /** 是否为当前活动窗口 */
  isActive: boolean;
  /** 选择窗口回调 */
  onSelect: () => void;
  /** 编辑窗口回调 */
  onEdit: () => void;
  /** 删除窗口回调 */
  onDelete: () => void;
  /** 选择子话题回调 */
  onSelectSubTopic?: (subTopicId: string) => void;
}

interface SubTopicItemProps {
  /** 子话题数据 */
  subTopic: SubTopic;
  /** 是否为当前活动子话题 */
  isActive: boolean;
  /** 选择子话题回调 */
  onSelect: () => void;
}

// ============ 子话题列表项组件 ============

function SubTopicItem({ subTopic, isActive, onSelect }: SubTopicItemProps) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`
        w-full text-left px-3 py-1.5 text-sm rounded transition-colors touch-manipulation
        ${isActive
          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
        }
      `}
      style={{ minHeight: touchTargets.minimum }}
    >
      <span className="truncate block">{subTopic.title}</span>
    </button>
  );
}

// ============ 聊天窗口卡片组件 ============

/**
 * 聊天窗口卡片
 * 参考图片风格：星标图标在左侧，标题在右侧，紧凑布局
 */
export function ChatWindowCard({
  window,
  isActive,
  onSelect,
  onEdit,
  onDelete,
  onSelectSubTopic,
}: ChatWindowCardProps) {
  const { t } = useTranslation();
  const formatRelativeTime = useFormatRelativeTime();
  
  // 子话题列表展开状态
  const [isExpanded, setIsExpanded] = useState(false);
  // 是否显示删除确认
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // 悬停状态
  const [isHovered, setIsHovered] = useState(false);

  // 处理展开/收起子话题列表
  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // 处理删除确认
  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  };

  // 处理取消删除
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  // 是否有多个子话题
  const hasMultipleSubTopics = window.subTopics.length > 1;

  // 计算消息总数
  const totalMessages = window.subTopics.reduce(
    (sum, topic) => sum + topic.messages.length,
    0
  );

  // 显示标题，如果是默认的"新对话"则使用翻译
  const displayTitle = window.title === '新对话' ? t('chat.defaultChatName') : window.title;

  // 删除确认视图
  if (showDeleteConfirm) {
    return (
      <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
        <p className="text-sm text-red-600 dark:text-red-400 mb-2">
          {t('sidebar.deleteChat')}
        </p>
        <div className="flex gap-2">
          <button
            onClick={handleConfirmDelete}
            className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
          >
            {t('common.delete')}
          </button>
          <button
            onClick={handleCancelDelete}
            className="flex-1 px-3 py-1.5 bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 text-sm rounded transition-colors"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`
        group relative rounded-lg cursor-pointer transition-all duration-150 mb-1.5
        ${isActive
          ? 'bg-primary-50 dark:bg-primary-900/30 border border-primary-300 dark:border-primary-600'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
        }
      `}
    >
      {/* 卡片主体 */}
      <div className="flex items-center gap-3 p-2.5 pl-3">
        {/* 标题和信息 */}
        <div className="flex-1 min-w-0">
          <h3 className={`
            text-sm font-medium truncate
            ${isActive 
              ? 'text-primary-700 dark:text-primary-300' 
              : 'text-neutral-800 dark:text-neutral-200'
            }
          `}>
            {displayTitle}
          </h3>
          
          {/* 消息数量提示 */}
          {totalMessages > 0 && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
              {totalMessages} {t('sidebar.chatCount')} · {formatRelativeTime(window.updatedAt)}
            </p>
          )}
        </div>

        {/* 模型标签 - 显示当前使用的模型 */}
        <ModelBadge modelId={window.config.model} className="flex-shrink-0" />

        {/* 消息数量徽章 */}
        {totalMessages > 0 && isActive && (
          <span className="flex-shrink-0 bg-primary-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
            {totalMessages}
          </span>
        )}

        {/* 操作按钮 - 悬停显示 */}
        {isHovered && !isActive && (
          <div className="flex items-center gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-600 transition-colors"
              title={t('sidebar.rename')}
            >
              <EditIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title={t('common.delete')}
            >
              <TrashIcon className="h-4 w-4 text-neutral-500 dark:text-neutral-400 hover:text-red-500" />
            </button>
          </div>
        )}
      </div>

      {/* 子话题展开按钮 */}
      {hasMultipleSubTopics && (
        <button
          onClick={handleToggleExpand}
          className="flex items-center gap-1 px-3 pb-2 text-xs text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 transition-colors"
        >
          <ChevronIcon 
            className={`h-3 w-3 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} 
          />
          <span>{window.subTopics.length} {t('sidebar.subTopics')}</span>
        </button>
      )}

      {/* 子话题列表 - 展开时显示 */}
      {hasMultipleSubTopics && isExpanded && (
        <div className="px-3 pb-2 space-y-0.5 border-t border-neutral-200 dark:border-neutral-700 pt-2 ml-8">
          {window.subTopics.map((subTopic) => (
            <SubTopicItem
              key={subTopic.id}
              subTopic={subTopic}
              isActive={subTopic.id === window.activeSubTopicId}
              onSelect={() => onSelectSubTopic?.(subTopic.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============ 图标组件 ============

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
      />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
      />
    </svg>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  );
}

function StarIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
      />
    </svg>
  );
}

export default ChatWindowCard;
