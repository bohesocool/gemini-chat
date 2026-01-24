/**
 * 子话题标签组件
 * 显示子话题列表，支持切换、创建、删除，带有切换动画
 * 
 * Requirements: 5.4, 5.5, 5.6, 10.5
 */

import React, { useState, useRef, useEffect } from 'react';
import type { SubTopic } from '../../types/chatWindow';
import { useReducedMotion } from '../motion';
import { durationValues, easings, touchTargets } from '../../design/tokens';
import { useTranslation } from '../../i18n/useTranslation';

// ============ 类型定义 ============

export interface SubTopicTabsProps {
  /** 聊天窗口 ID */
  windowId: string;
  /** 子话题列表 */
  subTopics: SubTopic[];
  /** 当前活动的子话题 ID */
  activeSubTopicId: string;
  /** 选择子话题回调 */
  onSelect: (id: string) => void;
  /** 创建子话题回调 */
  onCreate: () => void;
  /** 删除子话题回调 */
  onDelete: (id: string) => void;
  /** 重命名子话题回调 */
  onRename?: (id: string, newTitle: string) => void;
}

// ============ 子组件：单个标签 ============

interface TabItemProps {
  subTopic: SubTopic;
  isActive: boolean;
  canDelete: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onRename?: (newTitle: string) => void;
  reducedMotion: boolean;
}

function TabItem({
  subTopic,
  isActive,
  canDelete,
  onSelect,
  onDelete,
  onRename,
  reducedMotion,
}: TabItemProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(subTopic.title);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // 编辑模式时聚焦输入框
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // 处理双击编辑
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRename) {
      setEditValue(subTopic.title);
      setIsEditing(true);
    }
  };

  // 处理编辑完成
  const handleEditComplete = () => {
    const trimmedValue = editValue.trim();
    if (trimmedValue && trimmedValue !== subTopic.title && onRename) {
      onRename(trimmedValue);
    }
    setIsEditing(false);
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditComplete();
    } else if (e.key === 'Escape') {
      setEditValue(subTopic.title);
      setIsEditing(false);
    }
  };

  // 处理删除点击
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (canDelete) {
      setShowDeleteConfirm(true);
    }
  };

  // 确认删除
  const handleConfirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    setShowDeleteConfirm(false);
  };

  // 取消删除
  const handleCancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteConfirm(false);
  };

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <div
      className={`
        group relative flex items-center gap-1 px-3 rounded-lg cursor-pointer touch-manipulation
        ${isActive
          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
        }
      `}
      style={{ ...transitionStyle, minHeight: touchTargets.minimum }}
      onClick={onSelect}
      onDoubleClick={handleDoubleClick}
      role="tab"
      aria-selected={isActive}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      {/* 标签内容 */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleEditComplete}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="
            w-full px-1 py-0.5 text-sm bg-white dark:bg-neutral-900
            border border-primary-300 dark:border-primary-600 rounded
            focus:outline-none focus:ring-2 focus:ring-primary-500
          "
          maxLength={50}
        />
      ) : (
        <span className="text-sm font-medium truncate max-w-[120px]">
          {subTopic.title}
        </span>
      )}

      {/* 删除按钮 */}
      {canDelete && !isEditing && (
        <button
          onClick={handleDeleteClick}
          className={`
            ml-1 p-2 rounded opacity-0 group-hover:opacity-100 touch-manipulation
            hover:bg-neutral-200 dark:hover:bg-neutral-700
            text-neutral-400 hover:text-error-light dark:hover:text-error-dark
          `}
          style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
          aria-label={`删除 ${subTopic.title}`}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      {/* 删除确认弹窗 - 使用 Portal 避免被裁剪 */}
      {showDeleteConfirm && (
        <>
          {/* 遮罩层 - 点击关闭 */}
          <div
            className="fixed inset-0 z-40"
            onClick={handleCancelDelete}
          />
          <div
            className="
              fixed z-50 p-3 bg-white dark:bg-neutral-800
              rounded-lg shadow-xl border border-neutral-200 dark:border-neutral-700
              min-w-[180px]
            "
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-3">
              {t('sidebar.deleteSubTopicConfirm')}
            </p>
            <div className="flex gap-2">
              <button
                onClick={handleConfirmDelete}
                className="
                  flex-1 px-3 py-2 text-sm font-medium text-white touch-manipulation
                  bg-red-500 hover:bg-red-600 rounded-lg
                  transition-colors
                "
              >
                {t('common.delete')}
              </button>
              <button
                onClick={handleCancelDelete}
                className="
                  flex-1 px-3 py-2 text-sm font-medium touch-manipulation
                  bg-neutral-100 dark:bg-neutral-700 rounded-lg
                  hover:bg-neutral-200 dark:hover:bg-neutral-600
                  transition-colors
                "
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============ 主组件 ============

/**
 * 子话题标签组件
 * 
 * Requirements:
 * - 5.4: 子话题切换动画
 * - 5.5: 子话题列表显示在聊天区域顶部
 * - 5.6: 删除子话题时显示确认对话框
 */
export function SubTopicTabs({
  windowId: _windowId,
  subTopics,
  activeSubTopicId,
  onSelect,
  onCreate,
  onDelete,
  onRename,
}: SubTopicTabsProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // 当活动标签改变时，滚动到可见区域
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeTab = scrollContainerRef.current.querySelector('[aria-selected="true"]');
      if (activeTab) {
        activeTab.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
      }
    }
  }, [activeSubTopicId, reducedMotion]);

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.normal}ms ${easings.easeOut}` };

  // 是否可以删除（至少保留一个子话题）
  const canDelete = subTopics.length > 1;

  return (
    <div
      className="
        flex items-center gap-2 px-4 py-2
        bg-white dark:bg-neutral-900
      "
      role="tablist"
      aria-label={t('sidebar.subTopicList')}
    >
      {/* 标签滚动容器 */}
      <div
        ref={scrollContainerRef}
        className="flex-1 flex items-center gap-1 overflow-x-auto scrollbar-thin"
        style={transitionStyle}
      >
        {subTopics.map((subTopic) => (
          <TabItem
            key={subTopic.id}
            subTopic={subTopic}
            isActive={subTopic.id === activeSubTopicId}
            canDelete={canDelete}
            onSelect={() => onSelect(subTopic.id)}
            onDelete={() => onDelete(subTopic.id)}
            onRename={onRename ? (newTitle) => onRename(subTopic.id, newTitle) : undefined}
            reducedMotion={reducedMotion}
          />
        ))}
      </div>

      {/* 新建子话题按钮 */}
      <button
        onClick={onCreate}
        className="
          flex items-center justify-center p-2 rounded-lg touch-manipulation
          text-neutral-500 dark:text-neutral-400
          hover:bg-neutral-100 dark:hover:bg-neutral-800
          hover:text-primary-600 dark:hover:text-primary-400
        "
        style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
        aria-label={t('sidebar.newSubTopic')}
        title={t('sidebar.newSubTopic')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </div>
  );
}

export default SubTopicTabs;
