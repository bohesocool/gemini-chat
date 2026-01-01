/**
 * 模板详情视图组件
 * 需求: 2.3, 2.4, 2.5, 2.6, 2.7, 2.11
 * 
 * 在主内容区显示选中模板的详细信息，包括：
 * - 模板名称、描述、系统指令
 * - 编辑、删除、使用模板按钮
 * - 空状态提示
 */

import React, { useCallback } from 'react';
import { useTemplateStore } from '../../stores/template';
import type { PromptTemplate, CreateTemplateInput } from '../../stores/template';

export interface TemplateDetailViewProps {
  /** 选中的模板 ID */
  selectedTemplateId: string | null;
  /** 编辑模板回调 */
  onEdit: (template: PromptTemplate) => void;
  /** 删除模板回调 */
  onDelete: (templateId: string) => void;
  /** 使用模板创建新对话回调 */
  onUseTemplate: (template: PromptTemplate) => void;
}

/**
 * 模板详情视图组件
 * 需求: 2.4 - 显示模板名称、描述和完整系统指令
 * 需求: 2.11 - 空状态显示
 */
export function TemplateDetailView({
  selectedTemplateId,
  onEdit,
  onDelete,
  onUseTemplate,
}: TemplateDetailViewProps) {
  const { getTemplateById } = useTemplateStore();
  
  // 获取选中的模板
  const template = selectedTemplateId ? getTemplateById(selectedTemplateId) : null;

  // 处理编辑按钮点击
  const handleEdit = useCallback(() => {
    if (template) {
      onEdit(template);
    }
  }, [template, onEdit]);

  // 处理删除按钮点击
  const handleDelete = useCallback(() => {
    if (template) {
      onDelete(template.id);
    }
  }, [template, onDelete]);

  // 处理使用模板按钮点击
  const handleUseTemplate = useCallback(() => {
    if (template) {
      onUseTemplate(template);
    }
  }, [template, onUseTemplate]);

  // 空状态 - 需求: 2.11
  if (!template) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <EmptyTemplateIcon className="w-16 h-16 text-neutral-300 dark:text-neutral-600 mb-4" />
        <h3 className="text-lg font-medium text-neutral-600 dark:text-neutral-400 mb-2">
          选择一个模板
        </h3>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 max-w-sm">
          从左侧列表中选择一个模板，查看详细信息并进行操作
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
      {/* 头部 - 模板名称和操作按钮 */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
          <TemplateIcon className="w-6 h-6 text-primary-500" />
          <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-200">
            {template.name}
          </h2>
          {template.isBuiltIn && (
            <span className="px-2 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded">
              内置
            </span>
          )}
        </div>
        
        {/* 操作按钮 - 需求: 2.5, 2.6 */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-primary-600 dark:hover:text-primary-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            title="编辑模板"
          >
            <EditIcon className="w-4 h-4" />
            编辑
          </button>
          {/* 删除按钮 - 仅非内置模板显示 - 需求: 2.6 */}
          {!template.isBuiltIn && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-600 dark:text-neutral-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
              title="删除模板"
            >
              <TrashIcon className="w-4 h-4" />
              删除
            </button>
          )}
        </div>
      </div>

      {/* 内容区 - 需求: 2.4 */}
      <div className="flex-1 overflow-y-auto px-6 py-6 custom-scrollbar">
        {/* 描述 */}
        {template.description && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
              描述
            </h3>
            <p className="text-neutral-700 dark:text-neutral-300">
              {template.description}
            </p>
          </div>
        )}

        {/* 系统指令 - 使用代码块样式显示 */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
            系统指令
          </h3>
          <div className="bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg overflow-hidden">
            <pre className="p-4 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap break-words font-mono overflow-x-auto max-h-96 custom-scrollbar">
              {template.systemInstruction}
            </pre>
          </div>
        </div>

        {/* 元数据 */}
        <div className="text-xs text-neutral-400 dark:text-neutral-500 space-y-1">
          <p>创建时间: {new Date(template.createdAt).toLocaleString('zh-CN')}</p>
          <p>更新时间: {new Date(template.updatedAt).toLocaleString('zh-CN')}</p>
        </div>
      </div>

      {/* 底部操作区 - 需求: 2.7 */}
      <div className="px-6 py-4 border-t border-neutral-200 dark:border-neutral-700">
        <button
          onClick={handleUseTemplate}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors font-medium shadow-sm"
        >
          <PlayIcon className="w-5 h-5" />
          使用此模板开始新对话
        </button>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

function EmptyTemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
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

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default TemplateDetailView;
