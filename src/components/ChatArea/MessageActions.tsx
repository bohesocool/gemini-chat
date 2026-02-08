/**
 * 消息操作按钮组件
 * 需求: 3.1, 4.1, 7.2, 8.4 - 编辑、复制、重新生成、查看详情按钮
 * 需求: 3.1, 3.2 - 书签功能
 */

import { useState, useCallback, memo, useEffect } from 'react';
import type { Message } from '../../types/models';
import { MessageDetailModal } from './MessageDetailModal';
import { useBookmarkStore } from '../../stores/bookmark';
import { CopyIcon, CheckIcon, EditIcon, RegenerateIcon, InfoIcon, DeleteIcon, BookmarkIcon } from '../icons';
import { createLogger } from '../../services/logger';

// 模块日志记录器
const logger = createLogger('MessageActions');

// ============ 类型定义 ============

/**
 * 消息操作按钮 Props
 */
export interface MessageActionsProps {
  /** 消息对象 */
  message: Message;
  /** 是否为用户消息 */
  isUserMessage: boolean;
  /** 编辑回调（仅用户消息） */
  onEdit?: () => void;
  /** 重新生成回调（仅 AI 消息） */
  onRegenerate?: () => void;
  /** 删除回调 */
  onDelete?: () => void;
  /** 复制回调 */
  onCopy?: () => void;
  /** 是否正在重新生成 */
  isRegenerating?: boolean;
  /** 窗口 ID（用于书签） */
  windowId?: string;
  /** 子话题 ID（用于书签） */
  subTopicId?: string;
  /** 窗口标题（用于书签） */
  windowTitle?: string;
}

// ============ 主组件 ============

/**
 * 消息操作按钮组件
 * 
 * 需求:
 * - 3.1: 用户消息显示编辑按钮
 * - 4.1: AI 消息显示重新生成按钮
 * - 7.2, 8.4: 查看详情按钮显示 Token 使用量和耗时
 */
export function MessageActions({
  message,
  isUserMessage,
  onEdit,
  onRegenerate,
  onDelete,
  onCopy,
  isRegenerating = false,
  windowId,
  subTopicId,
  windowTitle,
}: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  
  // 书签状态
  const { isBookmarked, toggleBookmark, initialized, loadBookmarks } = useBookmarkStore();
  const [isBookmarkedState, setIsBookmarkedState] = useState(false);

  // 初始化加载书签
  useEffect(() => {
    if (!initialized) {
      loadBookmarks();
    }
  }, [initialized, loadBookmarks]);

  // 更新书签状态
  useEffect(() => {
    if (message.id) {
      setIsBookmarkedState(isBookmarked(message.id));
    }
  }, [message.id, isBookmarked, initialized]);

  // 处理复制
  const handleCopy = useCallback(async () => {
    if (!message.content) return;
    
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopy?.();
    } catch (err) {
      logger.error('复制失败:', err);
    }
  }, [message.content, onCopy]);

  // 处理书签切换
  const handleToggleBookmark = useCallback(async () => {
    if (!message.id || !windowId || !subTopicId) return;
    
    const result = await toggleBookmark({
      messageId: message.id,
      windowId,
      subTopicId,
      messagePreview: (message.content || '').substring(0, 100),
      messageRole: isUserMessage ? 'user' : 'model',
      windowTitle: windowTitle || '未命名对话',
    });
    
    setIsBookmarkedState(result);
  }, [message.id, message.content, windowId, subTopicId, windowTitle, isUserMessage, toggleBookmark]);

  // 打开详情弹窗
  const handleShowDetail = useCallback(() => {
    setShowDetail(true);
  }, []);

  // 关闭详情弹窗
  const handleCloseDetail = useCallback(() => {
    setShowDetail(false);
  }, []);

  return (
    <>
      {/* 操作按钮容器 - 使用正常流式布局 */}
      <div 
        className="flex items-center gap-1"
      >
        {/* 复制按钮 */}
        <ActionButton
          onClick={handleCopy}
          title={copied ? '已复制' : '复制'}
          disabled={!message.content}
        >
          {copied ? (
            <CheckIcon className="w-3.5 h-3.5 text-green-500" />
          ) : (
            <CopyIcon className="w-3.5 h-3.5" />
          )}
        </ActionButton>

        {/* 书签按钮 - 需求: 3.1, 3.2 */}
        {windowId && subTopicId && (
          <ActionButton
            onClick={handleToggleBookmark}
            title={isBookmarkedState ? '取消收藏' : '收藏'}
          >
            <BookmarkIcon 
              className="w-3.5 h-3.5" 
              filled={isBookmarkedState}
            />
          </ActionButton>
        )}

        {/* 用户消息：编辑按钮 */}
        {isUserMessage && onEdit && (
          <ActionButton onClick={onEdit} title="编辑消息">
            <EditIcon className="w-3.5 h-3.5" />
          </ActionButton>
        )}

        {/* AI 消息：重新生成按钮 - 需求 4.5: 加载状态旋转图标 */}
        {!isUserMessage && onRegenerate && (
          <ActionButton 
            onClick={onRegenerate} 
            title="重新生成"
            disabled={isRegenerating}
            isLoading={isRegenerating}
          >
            <RegenerateIcon className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
          </ActionButton>
        )}

        {/* 查看详情按钮 - 需求: 7.2, 8.4 */}
        <ActionButton onClick={handleShowDetail} title="查看详情">
          <InfoIcon className="w-3.5 h-3.5" />
        </ActionButton>

        {/* 删除按钮 */}
        {onDelete && (
          <ActionButton onClick={onDelete} title="删除消息">
            <DeleteIcon className="w-3.5 h-3.5" />
          </ActionButton>
        )}
      </div>

      {/* 消息详情弹窗 */}
      <MessageDetailModal
        message={message}
        isOpen={showDetail}
        onClose={handleCloseDetail}
      />
    </>
  );
}

// ============ 子组件 ============

/**
 * 操作按钮基础组件
 * 需求 4.3: 禁用状态50%透明度
 * 需求 4.5: 加载状态指示器
 * 性能优化：使用 memo 避免不必要的重渲染
 */
interface ActionButtonProps {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

const ActionButton = memo(function ActionButton({ onClick, title, disabled = false, isLoading = false, children }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      disabled={disabled || isLoading}
      className={`
        p-1.5 rounded-md
        text-neutral-400 hover:text-neutral-600
        dark:text-neutral-500 dark:hover:text-neutral-300
        hover:bg-neutral-100 dark:hover:bg-neutral-700
        transition-all duration-200
        ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : 'opacity-100'}
      `}
    >
      {children}
    </button>
  );
});

export default MessageActions;
