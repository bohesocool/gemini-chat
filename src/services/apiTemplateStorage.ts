/**
 * API 模板存储实现
 */

import { api } from './apiClient';
import type { PromptTemplate } from '../stores/template/types';
import { DEFAULT_TEMPLATES } from '../stores/template/defaults';

export async function saveTemplates(templates: PromptTemplate[]): Promise<void> {
  await api.post('/templates/batch', { templates });
}

export async function loadTemplates(): Promise<PromptTemplate[]> {
  const templates = await api.get<PromptTemplate[]>('/templates');
  if (templates.length === 0) return [...DEFAULT_TEMPLATES];
  return templates;
}

export async function saveTemplate(template: PromptTemplate): Promise<void> {
  await api.put(`/templates/${template.id}`, template);
}

export async function deleteTemplate(id: string): Promise<void> {
  await api.del(`/templates/${id}`);
}

export async function getTemplate(id: string): Promise<PromptTemplate | null> {
  try {
    return await api.get<PromptTemplate>(`/templates/${id}`);
  } catch {
    return null;
  }
}

export async function clearTemplates(): Promise<void> {
  await api.del('/templates');
}
