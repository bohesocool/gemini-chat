/**
 * 现代化侧边栏组件
 * 集成助手列表和设置面板
 * 需求: 4.1, 4.2, 4.6, 7.1, 7.2
 */

import React, { useState, useCallback, useMemo } from 'react';
import { useChatWindowStore } from '../../stores/chatWindow';
import { useSettingsStore } from '../../stores/settings';
import { useSidebarView } from '../Layout';
import { ChatWindowCard } from './ChatWindowCard';
import { SearchBar, filterChatWindows } from './SearchBar';
import { DragDropList } from './DragDropList';
import { SidebarSettings } from './SidebarSettings';
import { ImageGallery } from './ImageGallery';
import { TemplateManager } from './TemplateManager';
import { BookmarkList } from './BookmarkList';
import { ImagePreviewModal } from '../ImagePreviewModal';
import { VersionDisplay } from './VersionDisplay';
import { touchTargets } from '../../design/tokens';
import type { ChatWindow } from '../../types/chatWindow';
import type { GeneratedImage } from '../../types';

/**
 * 现代化侧边栏
 * 根据 Layout 的 currentView 显示助手列表或设置面板
 */
export function Sidebar() {
  const {
    windows,
    activeWindowId,
    createWindow,
    selectWindow,
    deleteWindow,
    updateWindow,
    selectSubTopic,
    reorderWindows,
  } = useChatWindowStore();

  const { currentModel, systemInstruction, toggleSidebar } = useSettingsStore();
  const { currentView } = useSidebarView();

  // 搜索关键词
  const [searchTerm, setSearchTerm] = useState('');
  // 正在编辑的窗口 ID
  const [editingId, setEditingId] = useState<string | null>(null);
  // 编辑中的标题
  const [editingTitle, setEditingTitle] = useState('');
  // 图片预览状态
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 过滤后的窗口列表
  const filteredWindows = useMemo(() => {
    return filterChatWindows(windows, searchTerm);
  }, [windows, searchTerm]);

  // 创建新聊天窗口 - 直接创建，不弹出模板选择
  const handleCreateWindow = useCallback(() => {
    createWindow({
      model: currentModel,
      systemInstruction: systemInstruction || undefined,
    });
  }, [createWindow, currentModel, systemInstruction]);

  // 选择聊天窗口
  const handleSelectWindow = useCallback((id: string) => {
    if (editingId !== id) {
      selectWindow(id);
    }
  }, [editingId, selectWindow]);

  // 开始重命名
  const handleStartEdit = useCallback((id: string) => {
    const window = windows.find(w => w.id === id);
    if (window) {
      setEditingId(id);
      setEditingTitle(window.title);
    }
  }, [windows]);

  // 保存重命名
  const handleSaveEdit = useCallback(async () => {
    if (editingId && editingTitle.trim()) {
      await updateWindow(editingId, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  }, [editingId, editingTitle, updateWindow]);

  // 取消重命名
  const handleCancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingTitle('');
  }, []);

  // 处理重命名输入框按键
  const handleEditKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  }, [handleSaveEdit, handleCancelEdit]);

  // 删除聊天窗口
  const handleDeleteWindow = useCallback(async (id: string) => {
    await deleteWindow(id);
  }, [deleteWindow]);

  // 选择子话题
  const handleSelectSubTopic = useCallback((windowId: string, subTopicId: string) => {
    selectSubTopic(windowId, subTopicId);
  }, [selectSubTopic]);

  // 处理拖拽排序
  const handleReorder = useCallback((reorderedWindows: ChatWindow[]) => {
    reorderWindows(reorderedWindows);
  }, [reorderWindows]);

  // 处理图片点击
  const handleImageClick = useCallback((image: GeneratedImage) => {
    setPreviewImage(image);
    setIsPreviewOpen(true);
  }, []);

  // 关闭图片预览
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewImage(null);
  }, []);

  // 渲染聊天窗口卡片
  const renderWindowCard = useCallback((
    window: ChatWindow,
    _index: number,
    isDragging: boolean,
    isDropTarget: boolean
  ) => {
    const isActive = window.id === activeWindowId;
    const isEditing = window.id === editingId;

    if (isEditing) {
      return (
        <div className="p-3 bg-white dark:bg-neutral-800 rounded-lg border border-primary-400 dark:border-primary-600 shadow-sm">
          <input
            type="text"
            value={editingTitle}
            onChange={(e) => setEditingTitle(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
            autoFocus
            className="w-full px-2 py-1 text-sm bg-neutral-50 dark:bg-neutral-700 border border-neutral-300 dark:border-neutral-600 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSaveEdit} className="flex-1 px-3 py-1 text-xs bg-primary-500 hover:bg-primary-600 text-white rounded transition-colors">保存</button>
            <button onClick={handleCancelEdit} className="flex-1 px-3 py-1 text-xs bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600 text-neutral-700 dark:text-neutral-300 rounded transition-colors">取消</button>
          </div>
        </div>
      );
    }

    return (
      <div className={`transition-opacity duration-200 ${isDragging ? 'opacity-50' : 'opacity-100'} ${isDropTarget ? 'ring-2 ring-primary-500 ring-offset-2' : ''}`}>
        <ChatWindowCard
          window={window}
          isActive={isActive}
          onSelect={() => handleSelectWindow(window.id)}
          onEdit={() => handleStartEdit(window.id)}
          onDelete={() => handleDeleteWindow(window.id)}
          onSelectSubTopic={(subTopicId) => handleSelectSubTopic(window.id, subTopicId)}
        />
      </div>
    );
  }, [activeWindowId, editingId, editingTitle, handleEditKeyDown, handleSaveEdit, handleCancelEdit, handleSelectWindow, handleStartEdit, handleDeleteWindow, handleSelectSubTopic]);

  return (
    <div className="flex h-full flex-col bg-neutral-50 dark:bg-neutral-800 transition-colors duration-300">
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <h2 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
          {currentView === 'assistants' ? '助手' : currentView === 'images' ? '图片库' : currentView === 'templates' ? '模板' : currentView === 'bookmarks' ? '书签' : '设置'}
        </h2>
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
          title="折叠侧边栏"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {currentView === 'assistants' ? (
        <>
          <div className="p-3">
            <button
              onClick={handleCreateWindow}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm touch-manipulation"
              style={{ minHeight: touchTargets.minimum }}
            >
              <PlusIcon className="h-5 w-5" />
              新建程序
            </button>
          </div>
          <div className="px-3 pb-2">
            <SearchBar value={searchTerm} onChange={setSearchTerm} placeholder="搜索程序..." />
          </div>
          <div className="flex-1 overflow-y-auto px-2 custom-scrollbar">
            {filteredWindows.length === 0 ? (
              <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
                <ChatIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                {searchTerm ? (<><p>未找到匹配的程序</p><p className="text-sm mt-1">尝试其他搜索词</p></>) : (<><p>暂无程序</p><p className="text-sm mt-1">点击上方按钮开始新程序</p></>)}
              </div>
            ) : (
              <DragDropList items={filteredWindows} keyExtractor={(window) => window.id} renderItem={renderWindowCard} onReorder={handleReorder} />
            )}
          </div>
          <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
            <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
              {filteredWindows.length === windows.length ? `${windows.length} 个程序` : `显示 ${filteredWindows.length} / ${windows.length} 个程序`}
            </p>
            <div className="mt-2 text-center">
              <VersionDisplay />
            </div>
          </div>
        </>
      ) : currentView === 'images' ? (
        <>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ImageGallery onImageClick={handleImageClick} />
          </div>
          <ImagePreviewModal
            image={previewImage}
            isOpen={isPreviewOpen}
            onClose={handleClosePreview}
          />
        </>
      ) : currentView === 'templates' ? (
        <TemplateManager />
      ) : currentView === 'bookmarks' ? (
        <BookmarkList />
      ) : (
        <SidebarSettings isExpanded={true} />
      )}
    </div>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default Sidebar;
