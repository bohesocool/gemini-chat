/**
 * 模板存储代理 - 根据模式切换 IndexedDB / API
 */

import { isApiMode } from './storageAdapter';
import type { PromptTemplate } from '../stores/template/types';

import * as idb from './templateStorage';
import * as apiStore from './apiTemplateStorage';

export async function saveTemplates(templates: PromptTemplate[]): Promise<void> {
  return isApiMode() ? apiStore.saveTemplates(templates) : idb.saveTemplates(templates);
}

export async function loadTemplates(): Promise<PromptTemplate[]> {
  return isApiMode() ? apiStore.loadTemplates() : idb.loadTemplates();
}

export async function saveTemplate(template: PromptTemplate): Promise<void> {
  return isApiMode() ? apiStore.saveTemplate(template) : idb.saveTemplate(template);
}

export async function deleteTemplate(id: string): Promise<void> {
  return isApiMode() ? apiStore.deleteTemplate(id) : idb.deleteTemplate(id);
}

export async function getTemplate(id: string): Promise<PromptTemplate | null> {
  return isApiMode() ? apiStore.getTemplate(id) : idb.getTemplate(id);
}

export async function clearTemplates(): Promise<void> {
  return isApiMode() ? apiStore.clearTemplates() : idb.clearTemplates();
}

export { closeTemplateDB } from './templateStorage';
