/**
 * 对话列表侧边栏组件
 * 需求: 4.1, 4.2, 4.4, 4.5
 */

import React, { useState } from 'react';
import { useChatWindowStore } from '../stores/chatWindow';
import { useSettingsStore } from '../stores/settings';

/**
 * 格式化时间戳为相对时间
 */
function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  if (hours < 24) return `${hours} 小时前`;
  if (days < 7) return `${days} 天前`;

  return new Date(timestamp).toLocaleDateString('zh-CN');
}

/**
 * 对话列表侧边栏
 */
export function Sidebar() {
  const {
    windows,
    activeWindowId,
    createWindow,
    selectWindow,
    deleteWindow,
    updateWindow,
  } = useChatWindowStore();

  const { currentModel, systemInstruction, theme } = useSettingsStore();

  // 正在编辑的窗口 ID
  const [editingId, setEditingId] = useState<string | null>(null);
  // 编辑中的标题
  const [editingTitle, setEditingTitle] = useState('');
  // 显示删除确认的窗口 ID
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // 创建新聊天窗口
  const handleCreateWindow = () => {
    createWindow({
      model: currentModel,
      systemInstruction: systemInstruction || undefined,
    });
  };

  // 选择聊天窗口
  const handleSelectWindow = (id: string) => {
    if (editingId !== id && deletingId !== id) {
      selectWindow(id);
    }
  };

  // 开始重命名
  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  // 保存重命名
  const handleSaveRename = async () => {
    if (editingId && editingTitle.trim()) {
      await updateWindow(editingId, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  // 取消重命名
  const handleCancelRename = () => {
    setEditingId(null);
    setEditingTitle('');
  };

  // 处理重命名输入框按键
  const handleRenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  // 确认删除
  const handleConfirmDelete = async (id: string) => {
    await deleteWindow(id);
    setDeletingId(null);
  };

  return (
    <div className="flex h-full flex-col">
      {/* 头部 - 新建对话按钮 */}
      <div className="p-4 lg:border-b border-slate-200 dark:border-slate-700">
        <button
          onClick={handleCreateWindow}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 
            bg-blue-500 hover:bg-blue-600 text-white rounded-lg 
            transition-colors font-medium
            sidebar-new-btn"
        >
          <PlusIcon className="h-5 w-5" />
          新建对话
        </button>
      </div>

      {/* 聊天窗口列表 */}
      <div className="flex-1 overflow-y-auto p-2">
        {windows.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-slate-400 py-8">
            <ChatIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>暂无对话</p>
            <p className="text-sm mt-1">点击上方按钮开始新对话</p>
          </div>
        ) : (
          <ul className="space-y-1">
            {windows.map((window) => (
              <li key={window.id}>
                {/* 删除确认 */}
                {deletingId === window.id ? (
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-700 dark:text-red-300 mb-2">
                      确定删除此对话？
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleConfirmDelete(window.id)}
                        className="flex-1 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded transition-colors"
                      >
                        删除
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="flex-1 px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 text-sm rounded transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => handleSelectWindow(window.id)}
                    className={`
                      group relative p-3 rounded-lg cursor-pointer transition-colors
                      sidebar-item
                      ${theme === 'snow-white'
                        ? activeWindowId === window.id
                          ? 'bg-white border border-black text-black'
                          : 'hover:bg-zinc-100 border border-transparent hover:border-black text-black'
                        : activeWindowId === window.id
                          ? 'bg-blue-100 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-700/50'
                      }
                    `}
                    style={
                      theme === 'snow-white' && activeWindowId === window.id
                        ? { backgroundColor: '#ffffff', borderColor: '#000000', color: '#000000' }
                        : undefined
                    }
                  >
                    {/* 重命名输入框 */}
                    {editingId === window.id ? (
                      <input
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onKeyDown={handleRenameKeyDown}
                        onBlur={handleSaveRename}
                        autoFocus
                        className="w-full px-2 py-1 text-sm bg-white dark:bg-slate-800 border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <>
                        {/* 窗口标题 */}
                        <h3 className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate pr-16">
                          {window.title}
                        </h3>
                        {/* 更新时间 */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {formatRelativeTime(window.updatedAt)}
                        </p>

                        {/* 操作按钮 */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartRename(window.id, window.title);
                            }}
                            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                            title="重命名"
                          >
                            <EditIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeletingId(window.id);
                            }}
                            className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                            title="删除"
                          >
                            <TrashIcon className="h-4 w-4 text-slate-500 dark:text-slate-400 hover:text-red-500" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
          {windows.length} 个对话
        </p>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

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
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

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

export default Sidebar;
