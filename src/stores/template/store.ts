/**
 * 提示词模板状态管理
 * 需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

import { create } from 'zustand';
import type { TemplateStore, CreateTemplateInput, UpdateTemplateInput, PromptTemplate } from './types';
import { DEFAULT_TEMPLATES, generateTemplateId } from './defaults';
import { saveTemplates, loadTemplates as loadTemplatesFromStorage } from '../../services/templateStorage';
import { storeLogger } from '../../services/logger';

/**
 * 创建模板 Store
 */
export const useTemplateStore = create<TemplateStore>((set, get) => ({
  // 初始状态
  templates: [],
  initialized: false,
  isLoading: false,

  /**
   * 从存储加载模板
   * 需求: 5.7
   */
  loadTemplates: async () => {
    set({ isLoading: true });
    try {
      const storedTemplates = await loadTemplatesFromStorage();
      
      // 确保内置模板始终存在
      const builtInIds = DEFAULT_TEMPLATES.map(t => t.id);
      const existingBuiltIns = storedTemplates.filter(t => builtInIds.includes(t.id));
      const userTemplates = storedTemplates.filter(t => !t.isBuiltIn);
      
      // 合并内置模板和用户模板
      // 如果存储中有内置模板，使用存储的版本；否则使用默认版本
      const mergedBuiltIns = DEFAULT_TEMPLATES.map(defaultTemplate => {
        const stored = existingBuiltIns.find(t => t.id === defaultTemplate.id);
        return stored || defaultTemplate;
      });
      
      const templates = [...mergedBuiltIns, ...userTemplates];
      
      set({
        templates,
        initialized: true,
        isLoading: false,
      });
    } catch (error) {
      storeLogger.error('加载模板失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
      // 加载失败时使用默认模板
      set({
        templates: [...DEFAULT_TEMPLATES],
        initialized: true,
        isLoading: false,
      });
    }
  },

  /**
   * 添加新模板
   * 需求: 5.2
   */
  addTemplate: async (input: CreateTemplateInput) => {
    const now = Date.now();
    const newTemplate: PromptTemplate = {
      ...input,
      id: generateTemplateId(),
      isBuiltIn: false,
      createdAt: now,
      updatedAt: now,
    };

    const currentTemplates = get().templates;
    const updatedTemplates = [...currentTemplates, newTemplate];
    
    set({ templates: updatedTemplates });
    
    // 异步持久化
    try {
      await saveTemplates(updatedTemplates);
    } catch (error) {
      storeLogger.error('保存模板失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    return newTemplate;
  },

  /**
   * 更新模板
   * 需求: 5.3
   */
  updateTemplate: async (id: string, updates: UpdateTemplateInput) => {
    const currentTemplates = get().templates;
    const templateIndex = currentTemplates.findIndex(t => t.id === id);
    
    if (templateIndex === -1) {
      return null;
    }
    
    const existingTemplate = currentTemplates[templateIndex];
    if (!existingTemplate) {
      return null;
    }
    
    const updatedTemplate: PromptTemplate = {
      ...existingTemplate,
      ...updates,
      updatedAt: Date.now(),
    };
    
    const updatedTemplates = [...currentTemplates];
    updatedTemplates[templateIndex] = updatedTemplate;
    
    set({ templates: updatedTemplates });
    
    // 异步持久化
    try {
      await saveTemplates(updatedTemplates);
    } catch (error) {
      storeLogger.error('更新模板失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    return updatedTemplate;
  },

  /**
   * 删除模板
   * 需求: 5.4, 5.6 - 内置模板不可删除
   */
  deleteTemplate: async (id: string) => {
    const currentTemplates = get().templates;
    const template = currentTemplates.find(t => t.id === id);
    
    // 内置模板不可删除
    if (!template || template.isBuiltIn) {
      return false;
    }
    
    const updatedTemplates = currentTemplates.filter(t => t.id !== id);
    
    set({ templates: updatedTemplates });
    
    // 异步持久化
    try {
      await saveTemplates(updatedTemplates);
    } catch (error) {
      storeLogger.error('删除模板失败', {
        error: error instanceof Error ? error.message : '未知错误',
      });
    }
    
    return true;
  },

  /**
   * 根据 ID 获取模板
   */
  getTemplateById: (id: string) => {
    return get().templates.find(t => t.id === id);
  },
}));
