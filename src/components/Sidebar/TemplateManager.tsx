/**
 * 模板管理器组件（简化版）
 * 需求: 2.2, 2.12
 * 
 * 简化的模板列表，只显示名称和简短描述
 * 点击卡片选中模板，在主内容区显示详情
 */

import { useEffect, useCallback, useState } from 'react';
import { useTemplateStore } from '../../stores/template';
import { useSidebarView } from '../Layout';
import type { PromptTemplate, CreateTemplateInput, UpdateTemplateInput } from '../../stores/template';
import { touchTargets } from '../../design/tokens';
import { TemplateEditorModal } from './TemplateEditorModal';

/**
 * 模板管理器组件
 * 显示简洁的模板列表，点击选中模板
 */
export function TemplateManager() {
  const { templates, initialized, loadTemplates, addTemplate, updateTemplate } = useTemplateStore();
  const { selectedTemplateId, setSelectedTemplateId } = useSidebarView();
  
  // 模板编辑器状态
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  // 初始化加载模板
  useEffect(() => {
    if (!initialized) {
      loadTemplates();
    }
  }, [initialized, loadTemplates]);

  // 点击模板卡片 - 需求: 2.12
  const handleSelectTemplate = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
  }, [setSelectedTemplateId]);

  // 打开新建模板编辑器
  const handleCreateTemplate = useCallback(() => {
    setIsEditorOpen(true);
  }, []);

  // 保存模板
  const handleSaveTemplate = useCallback(async (data: CreateTemplateInput | { id: string; updates: UpdateTemplateInput }) => {
    if ('id' in data) {
      await updateTemplate(data.id, data.updates);
    } else {
      const newTemplate = await addTemplate(data);
      // 选中新创建的模板
      setSelectedTemplateId(newTemplate.id);
    }
    setIsEditorOpen(false);
  }, [addTemplate, updateTemplate, setSelectedTemplateId]);

  // 关闭编辑器
  const handleCloseEditor = useCallback(() => {
    setIsEditorOpen(false);
  }, []);

  // 分离内置模板和用户模板
  const builtInTemplates = templates.filter(t => t.isBuiltIn);
  const userTemplates = templates.filter(t => !t.isBuiltIn);

  return (
    <div className="flex flex-col h-full">
      {/* 新建模板按钮 */}
      <div className="p-3">
        <button
          onClick={handleCreateTemplate}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition-colors duration-200 font-medium shadow-sm touch-manipulation"
          style={{ minHeight: touchTargets.minimum }}
        >
          <PlusIcon className="h-5 w-5" />
          新建模板
        </button>
      </div>

      {/* 模板列表 - 需求: 2.2 */}
      <div className="flex-1 overflow-y-auto px-3 py-2 custom-scrollbar">
        {/* 内置模板 */}
        {builtInTemplates.length > 0 && (
          <div className="mb-4">
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1">
              内置模板
            </h3>
            <div className="space-y-2">
              {builtInTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => handleSelectTemplate(template.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 用户模板 */}
        {userTemplates.length > 0 && (
          <div>
            <h3 className="text-xs font-medium text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2 px-1">
              我的模板
            </h3>
            <div className="space-y-2">
              {userTemplates.map(template => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  isSelected={selectedTemplateId === template.id}
                  onSelect={() => handleSelectTemplate(template.id)}
                />
              ))}
            </div>
          </div>
        )}

        {/* 空状态 */}
        {templates.length === 0 && (
          <div className="text-center text-neutral-500 dark:text-neutral-400 py-8">
            <TemplateIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>暂无模板</p>
            <p className="text-sm mt-1">在详情页面创建新模板</p>
          </div>
        )}
      </div>

      {/* 底部统计 */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-700">
        <p className="text-xs text-neutral-500 dark:text-neutral-400 text-center">
          {templates.length} 个模板
        </p>
      </div>

      {/* 模板编辑器模态框 */}
      <TemplateEditorModal
        isOpen={isEditorOpen}
        onClose={handleCloseEditor}
        template={null}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}

// ============ 简洁模板卡片组件 ============

interface TemplateCardProps {
  template: PromptTemplate;
  isSelected: boolean;
  onSelect: () => void;
}

/**
 * 简洁模板卡片
 * 需求: 2.2 - 只显示名称和简短描述
 * 需求: 2.12 - 选中状态高亮
 */
function TemplateCard({ template, isSelected, onSelect }: TemplateCardProps) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full p-3 text-left rounded-lg border transition-all duration-200
        touch-manipulation cursor-pointer
        ${isSelected 
          ? 'bg-primary-50 dark:bg-primary-900/20 border-primary-400 dark:border-primary-600 ring-1 ring-primary-400 dark:ring-primary-600' 
          : 'bg-white dark:bg-neutral-700 border-neutral-200 dark:border-neutral-600 hover:border-primary-300 dark:hover:border-primary-600 hover:bg-neutral-50 dark:hover:bg-neutral-650'
        }
      `}
      style={{ minHeight: touchTargets.minimum }}
    >
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={`
              font-medium truncate
              ${isSelected 
                ? 'text-primary-700 dark:text-primary-300' 
                : 'text-neutral-800 dark:text-neutral-200'
              }
            `}>
              {template.name}
            </h4>
            {template.isBuiltIn && (
              <span className="flex-shrink-0 px-1.5 py-0.5 text-xs bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 rounded">
                内置
              </span>
            )}
          </div>
          {template.description && (
            <p className={`
              text-xs mt-0.5 line-clamp-2
              ${isSelected 
                ? 'text-primary-600 dark:text-primary-400' 
                : 'text-neutral-500 dark:text-neutral-400'
              }
            `}>
              {template.description}
            </p>
          )}
        </div>
        {/* 选中指示器 */}
        {isSelected && (
          <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary-500" />
        )}
      </div>
    </button>
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

function TemplateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default TemplateManager;
