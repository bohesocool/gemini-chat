/**
 * 聊天窗口顶部工具栏组件（简化版）
 * 仅显示标题和设置按钮
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 1.1, 1.2, 1.3, 1.4, 1.5
 */

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from '@/i18n';
import { touchTargets } from '../../design/tokens';
import type { ModelConfig } from '../../types/models';
import type { Message } from '../../types';
import { ExportDialog } from './ExportDialog';

// ============ 类型定义 ============

export interface ChatHeaderProps {
  /** 聊天窗口 ID */
  windowId: string;
  /** 窗口标题 */
  title: string;
  /** 打开配置面板回调 */
  onOpenConfig: () => void;
  /** 当前模型 ID - Requirements: 1.1 */
  currentModel?: string;
  /** 可用模型列表 - Requirements: 1.2 */
  models?: ModelConfig[];
  /** 模型变更回调 - Requirements: 1.3 */
  onModelChange?: (modelId: string) => void;
  /** 消息列表（用于导出） - Requirements: 1.1 */
  messages?: Message[];
}

// ============ ModelSelector 子组件 ============

interface ModelSelectorProps {
  /** 当前模型 ID */
  currentModel: string;
  /** 可用模型列表 */
  models: ModelConfig[];
  /** 模型变更回调 */
  onChange: (modelId: string) => void;
}

/**
 * 模型选择器组件
 * 显示当前模型名称，点击展开下拉菜单选择其他模型
 * 
 * Requirements:
 * - 1.1: 显示当前模型名称
 * - 1.2: 点击展开下拉菜单
 * - 1.4: 显示下拉箭头图标
 * - 1.5: 点击外部或选择模型后关闭下拉菜单
 */
function ModelSelector({ currentModel, models, onChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useTranslation();

  // 获取当前模型的显示名称
  const currentModelConfig = models.find(m => m.id === currentModel);
  const displayName = currentModelConfig?.name || currentModel;

  // 过滤出启用的模型
  const enabledModels = models.filter(m => m.enabled !== false);

  // 点击外部关闭下拉菜单 - Requirements: 1.5
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 处理模型选择 - Requirements: 1.3, 1.5
  const handleSelectModel = (modelId: string) => {
    onChange(modelId);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* 触发按钮 - Requirements: 1.1, 1.4 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-1.5 px-2 py-1 rounded-md
          text-sm text-neutral-600 dark:text-neutral-400
          hover:bg-neutral-100 dark:hover:bg-neutral-800
          hover:text-neutral-900 dark:hover:text-neutral-200
          transition-colors
        "
        title={t('chat.switchModel')}
        aria-label={t('chat.switchModel')}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="max-w-[150px] truncate">{displayName}</span>
        <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 下拉菜单 - Requirements: 1.2 */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-1 z-50
            min-w-[200px] max-h-[300px] overflow-y-auto
            bg-white dark:bg-neutral-800
            border border-neutral-200 dark:border-neutral-700
            rounded-lg shadow-lg
          "
          role="listbox"
          aria-label={t('chat.switchModel')}
        >
          {enabledModels.length === 0 ? (
            <div className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
              {t('common.noData')}
            </div>
          ) : (
            enabledModels.map((model) => (
              <button
                key={model.id}
                onClick={() => handleSelectModel(model.id)}
                className={`
                  w-full text-left px-3 py-2
                  text-sm transition-colors
                  ${model.id === currentModel
                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                  }
                `}
                role="option"
                aria-selected={model.id === currentModel}
              >
                <div className="font-medium">{model.name}</div>
                {model.description && (
                  <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                    {model.description.startsWith('models.') ? t(model.description) : model.description}
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============ 主组件 ============

/**
 * 简化的聊天窗口顶部工具栏
 * 
 * Requirements:
 * - 6.1: 移除模型选择下拉菜单
 * - 6.2: 移除配置状态标签
 * - 6.3: 仅保留标题和设置按钮
 * - 6.4: 设置按钮点击打开毛玻璃配置面板
 * - 1.1: 显示当前模型名称，添加导出按钮
 * - 1.2: 点击模型名称展开下拉菜单
 * - 1.3: 选择模型后更新窗口配置
 */
export function ChatHeader({ 
  windowId, 
  title, 
  onOpenConfig,
  currentModel,
  models,
  onModelChange,
  messages = [],
}: ChatHeaderProps) {
  // 导出对话框状态
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const { t } = useTranslation();
  
  // 获取当前模型名称
  const currentModelConfig = models?.find(m => m.id === currentModel);
  const modelName = currentModelConfig?.name || currentModel || t('common.unknownError');

  // 显示标题，如果是默认的"新对话"则使用翻译
  const displayTitle = title === '新对话' ? t('chat.defaultChatName') : (title || t('chat.defaultChatName'));

  return (
    <div className="
      flex items-center justify-between px-4 py-3
      bg-white dark:bg-neutral-900
    ">
      {/* 左侧：标题和模型选择器 */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate max-w-md">
          {displayTitle}
        </h1>
        
        {/* 模型选择器 - Requirements: 1.1, 1.2, 1.3, 1.4, 1.5 */}
        {currentModel && models && onModelChange && (
          <>
            <span className="text-neutral-300 dark:text-neutral-600">|</span>
            <ModelSelector
              currentModel={currentModel}
              models={models}
              onChange={onModelChange}
            />
          </>
        )}
      </div>

      {/* 右侧：导出按钮和设置按钮 */}
      <div className="flex items-center gap-1">
        {/* 导出按钮 - Requirements: 1.1 */}
        <button
          onClick={() => setIsExportDialogOpen(true)}
          disabled={messages.length === 0}
          className="
            p-2 rounded-lg
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            text-neutral-500 dark:text-neutral-400
            hover:text-neutral-700 dark:hover:text-neutral-200
            transition-colors
            disabled:opacity-50 disabled:cursor-not-allowed
          "
          style={{ minHeight: touchTargets.minimum, minWidth: touchTargets.minimum }}
          title={t('chat.exportChat')}
          aria-label={t('chat.exportChat')}
        >
          <ExportIcon className="w-5 h-5" />
        </button>
        
        {/* 设置按钮 - Requirements: 6.4 */}
        <button
          onClick={onOpenConfig}
          className="
            p-2 rounded-lg
            hover:bg-neutral-100 dark:hover:bg-neutral-800
            text-neutral-500 dark:text-neutral-400
            hover:text-neutral-700 dark:hover:text-neutral-200
            transition-colors
          "
          style={{ minHeight: touchTargets.minimum, minWidth: touchTargets.minimum }}
          title={t('chat.openConfig')}
          aria-label={t('chat.openConfig')}
        >
          <SettingsIcon className="w-5 h-5" />
        </button>
      </div>
      
      {/* 导出对话框 */}
      <ExportDialog
        isOpen={isExportDialogOpen}
        onClose={() => setIsExportDialogOpen(false)}
        windowId={windowId}
        windowTitle={displayTitle}
        messages={messages}
        modelName={modelName}
      />
    </div>
  );
}

// ============ 图标组件 ============

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

/**
 * 下拉箭头图标 - Requirements: 1.4
 */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/**
 * 导出图标 - Requirements: 1.1
 */
function ExportIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

export default ChatHeader;
