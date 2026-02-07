/**
 * 内置默认模板
 * 需求: 5.6
 */

import type { PromptTemplate } from './types';
import { getTranslation } from '../../i18n';

/**
 * 获取内置默认模板列表
 * 包含：代码助手、翻译助手、写作助手、数据分析师
 * 注意：使用函数而非常量，以确保翻译根据当前语言动态获取
 */
export function getDefaultTemplates(): PromptTemplate[] {
  return [
    {
      id: 'builtin-code-assistant',
      name: getTranslation('templates.codeAssistant'),
      description: getTranslation('templates.codeAssistantDesc'),
      systemInstruction: getTranslation('templates.codeAssistantInstruction'),
      isBuiltIn: true,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: 'builtin-translator',
      name: getTranslation('templates.translator'),
      description: getTranslation('templates.translatorDesc'),
      systemInstruction: getTranslation('templates.translatorInstruction'),
      isBuiltIn: true,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: 'builtin-writer',
      name: getTranslation('templates.writer'),
      description: getTranslation('templates.writerDesc'),
      systemInstruction: getTranslation('templates.writerInstruction'),
      isBuiltIn: true,
      createdAt: 0,
      updatedAt: 0,
    },
    {
      id: 'builtin-analyst',
      name: getTranslation('templates.analyst'),
      description: getTranslation('templates.analystDesc'),
      systemInstruction: getTranslation('templates.analystInstruction'),
      isBuiltIn: true,
      createdAt: 0,
      updatedAt: 0,
    },
  ];
}

/**
 * 向后兼容的常量导出
 * @deprecated 请使用 getDefaultTemplates() 代替
 */
export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: 'builtin-code-assistant',
    name: '代码助手',
    description: '帮助编写、审查和优化代码',
    systemInstruction: '你是一个专业的编程助手。请帮助用户编写高质量的代码，提供清晰的解释，并遵循最佳实践。当用户提供代码时，请仔细审查并提出改进建议。',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-translator',
    name: '翻译助手',
    description: '多语言翻译和润色',
    systemInstruction: '你是一个专业的翻译助手。请准确翻译用户提供的文本，保持原文的语气和风格。如果用户没有指定目标语言，请翻译为中文。对于专业术语，请提供准确的翻译并在必要时附上原文。',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-writer',
    name: '写作助手',
    description: '帮助撰写和改进文章',
    systemInstruction: '你是一个专业的写作助手。请帮助用户撰写、编辑和改进各类文章，包括博客、报告、邮件等。注重文章的结构、逻辑和表达，确保内容清晰、流畅、有说服力。',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
  {
    id: 'builtin-analyst',
    name: '数据分析师',
    description: '分析数据并提供洞察',
    systemInstruction: '你是一个数据分析专家。请帮助用户分析数据、解读结果，并提供有价值的洞察和建议。在分析时，请注意数据的准确性、完整性，并用清晰的方式呈现分析结果。',
    isBuiltIn: true,
    createdAt: 0,
    updatedAt: 0,
  },
];

/**
 * 生成唯一的模板 ID
 */
export function generateTemplateId(): string {
  return `template-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
