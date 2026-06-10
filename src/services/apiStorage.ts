/**
 * API 存储实现 - 通过后端 REST API 进行数据持久化
 * 当 DB_ENABLED=true 时使用此模块替代 IndexedDB
 */

import { api } from './apiClient';
import type { AppSettings, ChatWindow, SubTopic, ModelConfig, Conversation, ExportData, ExportDataV2 } from '../types';
import { DEFAULT_APP_SETTINGS, GEMINI_MODELS } from '../types';

// ============ ChatWindow 操作 ============

export async function saveChatWindow(chatWindow: ChatWindow): Promise<void> {
  await api.put(`/chat-windows/${chatWindow.id}`, chatWindow);
}

export async function getChatWindow(id: string): Promise<ChatWindow | null> {
  try {
    return await api.get<ChatWindow>(`/chat-windows/${id}`);
  } catch {
    return null;
  }
}

export async function getAllChatWindows(): Promise<ChatWindow[]> {
  return api.get<ChatWindow[]>('/chat-windows');
}

export async function deleteChatWindow(id: string): Promise<void> {
  await api.del(`/chat-windows/${id}`);
}

export async function saveAllChatWindows(chatWindows: ChatWindow[]): Promise<void> {
  await api.post('/chat-windows/batch', { chatWindows });
}

// ============ SubTopic 操作 ============

export async function addSubTopic(windowId: string, subTopic: SubTopic): Promise<ChatWindow | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) return null;
  chatWindow.subTopics.push(subTopic);
  chatWindow.updatedAt = Date.now();
  await saveChatWindow(chatWindow);
  return chatWindow;
}

export async function updateSubTopic(
  windowId: string,
  subTopicId: string,
  updates: Partial<SubTopic>
): Promise<ChatWindow | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) return null;

  const idx = chatWindow.subTopics.findIndex(st => st.id === subTopicId);
  if (idx === -1) return null;

  const existing = chatWindow.subTopics[idx]!;
  chatWindow.subTopics[idx] = {
    id: existing.id,
    title: updates.title ?? existing.title,
    messages: updates.messages ?? existing.messages,
    createdAt: existing.createdAt,
    updatedAt: Date.now(),
  };
  chatWindow.updatedAt = Date.now();
  await saveChatWindow(chatWindow);
  return chatWindow;
}

export async function deleteSubTopic(windowId: string, subTopicId: string): Promise<ChatWindow | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) return null;

  chatWindow.subTopics = chatWindow.subTopics.filter(st => st.id !== subTopicId);
  if (chatWindow.activeSubTopicId === subTopicId && chatWindow.subTopics.length > 0) {
    chatWindow.activeSubTopicId = chatWindow.subTopics[0]!.id;
  }
  chatWindow.updatedAt = Date.now();
  await saveChatWindow(chatWindow);
  return chatWindow;
}

export async function getSubTopic(windowId: string, subTopicId: string): Promise<SubTopic | null> {
  const chatWindow = await getChatWindow(windowId);
  if (!chatWindow) return null;
  return chatWindow.subTopics.find(st => st.id === subTopicId) ?? null;
}

// ============ Settings 操作 ============

export async function saveSettings(settings: AppSettings): Promise<void> {
  await api.put('/settings', settings);
}

export async function getSettings(): Promise<AppSettings> {
  const settings = await api.get<AppSettings | null>('/settings');
  return settings ?? { ...DEFAULT_APP_SETTINGS };
}

// ============ ModelConfig 操作 ============

export async function saveModelConfigs(configs: ModelConfig[]): Promise<void> {
  await api.put('/model-configs', configs);
}

export async function loadModelConfigs(): Promise<ModelConfig[]> {
  const configs = await api.get<ModelConfig[] | null>('/model-configs');
  if (configs && configs.length > 0) return configs;
  return GEMINI_MODELS.map(model => ({
    ...model,
    isCustom: false,
    provider: 'gemini' as const,
  }));
}

export async function resetModelConfigs(): Promise<ModelConfig[]> {
  const defaults = GEMINI_MODELS.map(model => ({
    ...model,
    isCustom: false,
    provider: 'gemini' as const,
  }));
  await api.put('/model-configs', defaults);
  return defaults;
}

export async function exportAllDataV2(): Promise<string> {
  return api.getText('/sync/dump');
}

export async function exportAllData(): Promise<string> {
  return exportAllDataV2();
}

export async function importDataV2(jsonString: string): Promise<void> {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('无效的 JSON 格式');
  }
  if (typeof data !== 'object' || data === null) {
    throw new Error('导入数据格式无效');
  }
  const obj = data as Record<string, unknown>;
  await api.post('/sync/migrate-from-indexeddb', {
    chatWindows: obj.chatWindows,
    settings: obj.settings,
    modelConfigs: obj.modelConfigs,
    bookmarks: obj.bookmarks,
    templates: obj.templates,
    images: obj.images,
  });
}

export async function importData(jsonString: string): Promise<void> {
  return importDataV2(jsonString);
}

export async function importDataAuto(jsonString: string): Promise<void> {
  let data: unknown;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('无效的 JSON 格式');
  }

  if (typeof data !== 'object' || data === null) {
    throw new Error('无法识别的导入数据格式');
  }
  const obj = data as Record<string, unknown>;

  if ('chatWindows' in obj && Array.isArray(obj.chatWindows)) {
    await importDataV2(jsonString);
    return;
  }

  if ('conversations' in obj && Array.isArray(obj.conversations)) {
    throw new Error('旧版（conversations）格式暂不支持直接导入服务端，请先在本地 IndexedDB 模式下完成迁移');
  }

  throw new Error('无法识别的导入数据格式');
}

export async function clearAllData(): Promise<void> {
  await api.del('/sync/all', { confirm: true });
}

export function closeDB(): void {
  // no-op in API mode
}

export async function deleteDatabase(): Promise<void> {
  await clearAllData();
}

export async function performDataMigration(): Promise<boolean> {
  return false;
}

export async function saveConversation(_conversation: Conversation): Promise<void> {
  throw new Error('Conversation storage is not supported in API mode');
}

export async function getConversation(_id: string): Promise<Conversation | null> {
  return null;
}

export async function getAllConversations(): Promise<Conversation[]> {
  return [];
}

export async function deleteConversation(_id: string): Promise<void> {
  // no-op
}

export function validateImportData(data: unknown): data is ExportData {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.version === 'string' && Array.isArray(obj.conversations);
}

export function validateImportDataV2(data: unknown): data is ExportDataV2 {
  if (typeof data !== 'object' || data === null) return false;
  const obj = data as Record<string, unknown>;
  return typeof obj.version === 'string' && Array.isArray(obj.chatWindows);
}
