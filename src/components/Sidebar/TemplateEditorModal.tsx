/**
 * 模板编辑器模态框组件
 * 需求: 2.8, 2.9, 2.10
 * 
 * 提供大尺寸编辑器用于编辑模板：
 * - 对话框宽度至少 800px
 * - 系统指令文本框至少 20 行
 * - 无字数限制
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Modal } from '../motion/Modal';
import type { PromptTemplate, CreateTemplateInput, UpdateTemplateInput } from '../../stores/template';

export interface TemplateEditorModalProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 要编辑的模板（null 表示新建） */
  template: PromptTemplate | null;
  /** 保存回调 */
  onSave: (data: CreateTemplateInput | { id: string; updates: UpdateTemplateInput }) => void;
}

/**
 * 模板编辑器模态框
 * 需求: 2.8 - 对话框宽度至少 800px
 * 需求: 2.9 - 系统指令无字数限制
 * 需求: 2.10 - 系统指令文本框至少 20 行
 */
export function TemplateEditorModal({
  isOpen,
  onClose,
  template,
  onSave,
}: TemplateEditorModalProps) {
  // 表单状态
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemInstruction, setSystemInstruction] = useState('');
  const [errors, setErrors] = useState<{ name?: string; systemInstruction?: string }>({});

  // 是否为编辑模式
  const isEditMode = template !== null;

  // 初始化表单数据
  useEffect(() => {
    if (isOpen) {
      if (template) {
        setName(template.name);
        setDescription(template.description);
        setSystemInstruction(template.systemInstruction);
      } else {
        setName('');
        setDescription('');
        setSystemInstruction('');
      }
      setErrors({});
    }
  }, [isOpen, template]);

  // 验证表单
  const validateForm = useCallback(() => {
    const newErrors: { name?: string; systemInstruction?: string } = {};
    
    if (!name.trim()) {
      newErrors.name = '请输入模板名称';
    }
    
    if (!systemInstruction.trim()) {
      newErrors.systemInstruction = '请输入系统指令';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [name, systemInstruction]);

  // 处理保存
  const handleSave = useCallback(() => {
    if (!validateForm()) {
      return;
    }

    if (isEditMode && template) {
      // 编辑模式
      onSave({
        id: template.id,
        updates: {
          name: name.trim(),
          description: description.trim(),
          systemInstruction: systemInstruction,
        },
      });
    } else {
      // 新建模式
      onSave({
        name: name.trim(),
        description: description.trim(),
        systemInstruction: systemInstruction,
      });
    }
    
    onClose();
  }, [isEditMode, template, name, description, systemInstruction, validateForm, onSave, onClose]);

  // 处理键盘快捷键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSave();
    }
  }, [handleSave]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      title={isEditMode ? '编辑模板' : '新建模板'}
      className="bg-white dark:bg-neutral-900 !max-w-[900px] !w-[90vw]"
    >
      <div className="flex flex-col gap-6" onKeyDown={handleKeyDown}>
        {/* 模板名称 */}
        <div className="flex flex-col gap-2">
          <label 
            htmlFor="template-name" 
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            模板名称 <span className="text-red-500">*</span>
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入模板名称"
            className={`
              w-full px-4 py-2.5 rounded-lg border
              bg-white dark:bg-neutral-800
              text-neutral-900 dark:text-neutral-100
              placeholder-neutral-400 dark:placeholder-neutral-500
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-colors
              ${errors.name 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-neutral-300 dark:border-neutral-600'
              }
            `}
          />
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

        {/* 模板描述 */}
        <div className="flex flex-col gap-2">
          <label 
            htmlFor="template-description" 
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            描述
          </label>
          <input
            id="template-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入模板描述（可选）"
            className="
              w-full px-4 py-2.5 rounded-lg border
              bg-white dark:bg-neutral-800
              border-neutral-300 dark:border-neutral-600
              text-neutral-900 dark:text-neutral-100
              placeholder-neutral-400 dark:placeholder-neutral-500
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-colors
            "
          />
        </div>

        {/* 系统指令 - 需求: 2.9, 2.10 */}
        <div className="flex flex-col gap-2 flex-1">
          <label 
            htmlFor="template-system-instruction" 
            className="text-sm font-medium text-neutral-700 dark:text-neutral-300"
          >
            系统指令 <span className="text-red-500">*</span>
          </label>
          <textarea
            id="template-system-instruction"
            value={systemInstruction}
            onChange={(e) => setSystemInstruction(e.target.value)}
            placeholder="输入系统指令内容..."
            rows={20}
            className={`
              w-full px-4 py-3 rounded-lg border
              bg-white dark:bg-neutral-800
              text-neutral-900 dark:text-neutral-100
              placeholder-neutral-400 dark:placeholder-neutral-500
              focus:outline-none focus:ring-2 focus:ring-primary-500/50
              transition-colors resize-y
              font-mono text-sm leading-relaxed
              min-h-[400px]
              ${errors.systemInstruction 
                ? 'border-red-500 dark:border-red-500' 
                : 'border-neutral-300 dark:border-neutral-600'
              }
            `}
          />
          {errors.systemInstruction && (
            <p className="text-sm text-red-500">{errors.systemInstruction}</p>
          )}
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            提示: 按 Ctrl+Enter 快速保存
          </p>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-neutral-200 dark:border-neutral-700">
          <button
            onClick={onClose}
            className="
              px-4 py-2 rounded-lg
              text-neutral-600 dark:text-neutral-400
              hover:bg-neutral-100 dark:hover:bg-neutral-800
              transition-colors
            "
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="
              px-6 py-2 rounded-lg
              bg-primary-500 hover:bg-primary-600
              text-white font-medium
              transition-colors
              shadow-sm
            "
          >
            {isEditMode ? '保存修改' : '创建模板'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

export default TemplateEditorModal;
