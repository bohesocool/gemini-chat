/**
 * 存储代理 - 统一导出与 storage.ts 相同的函数签名
 * 根据 storageAdapter 检测结果选择 IndexedDB 或 API 实现
 */

import { isApiMode } from './storageAdapter';
import type { AppSettings, ChatWindow, SubTopic, ModelConfig, Conversation, ExportData, ExportDataV2 } from '../types';

import * as idb from './storage';
import * as apiStore from './apiStorage';

export async function saveChatWindow(chatWindow: ChatWindow): Promise<void> {
  return isApiMode() ? apiStore.saveChatWindow(chatWindow) : idb.saveChatWindow(chatWindow);
}

export async function getChatWindow(id: string): Promise<ChatWindow | null> {
  return isApiMode() ? apiStore.getChatWindow(id) : idb.getChatWindow(id);
}

export async function getAllChatWindows(): Promise<ChatWindow[]> {
  return isApiMode() ? apiStore.getAllChatWindows() : idb.getAllChatWindows();
}

export async function deleteChatWindow(id: string): Promise<void> {
  return isApiMode() ? apiStore.deleteChatWindow(id) : idb.deleteChatWindow(id);
}

export async function saveAllChatWindows(chatWindows: ChatWindow[]): Promise<void> {
  return isApiMode() ? apiStore.saveAllChatWindows(chatWindows) : idb.saveAllChatWindows(chatWindows);
}

export async function addSubTopic(windowId: string, subTopic: SubTopic): Promise<ChatWindow | null> {
  return isApiMode() ? apiStore.addSubTopic(windowId, subTopic) : idb.addSubTopic(windowId, subTopic);
}

export async function updateSubTopic(
  windowId: string,
  subTopicId: string,
  updates: Partial<SubTopic>
): Promise<ChatWindow | null> {
  return isApiMode() ? apiStore.updateSubTopic(windowId, subTopicId, updates) : idb.updateSubTopic(windowId, subTopicId, updates);
}

export async function deleteSubTopic(windowId: string, subTopicId: string): Promise<ChatWindow | null> {
  return isApiMode() ? apiStore.deleteSubTopic(windowId, subTopicId) : idb.deleteSubTopic(windowId, subTopicId);
}

export async function getSubTopic(windowId: string, subTopicId: string): Promise<SubTopic | null> {
  return isApiMode() ? apiStore.getSubTopic(windowId, subTopicId) : idb.getSubTopic(windowId, subTopicId);
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  return isApiMode() ? apiStore.saveSettings(settings) : idb.saveSettings(settings);
}

export async function getSettings(): Promise<AppSettings> {
  return isApiMode() ? apiStore.getSettings() : idb.getSettings();
}

export async function saveModelConfigs(configs: ModelConfig[]): Promise<void> {
  return isApiMode() ? apiStore.saveModelConfigs(configs) : idb.saveModelConfigs(configs);
}

export async function loadModelConfigs(): Promise<ModelConfig[]> {
  return isApiMode() ? apiStore.loadModelConfigs() : idb.loadModelConfigs();
}

export async function resetModelConfigs(): Promise<ModelConfig[]> {
  return isApiMode() ? apiStore.resetModelConfigs() : idb.resetModelConfigs();
}

export async function performDataMigration(): Promise<boolean> {
  return isApiMode() ? apiStore.performDataMigration() : idb.performDataMigration();
}

export async function exportAllData(): Promise<string> {
  return isApiMode() ? apiStore.exportAllData() : idb.exportAllData();
}

export async function exportAllDataV2(): Promise<string> {
  return isApiMode() ? apiStore.exportAllDataV2() : idb.exportAllDataV2();
}

export async function importData(jsonString: string): Promise<void> {
  return isApiMode() ? apiStore.importData(jsonString) : idb.importData(jsonString);
}

export async function importDataV2(jsonString: string): Promise<void> {
  return isApiMode() ? apiStore.importDataV2(jsonString) : idb.importDataV2(jsonString);
}

export async function importDataAuto(jsonString: string): Promise<void> {
  return isApiMode() ? apiStore.importDataAuto(jsonString) : idb.importDataAuto(jsonString);
}

export function validateImportData(data: unknown): data is ExportData {
  return isApiMode() ? apiStore.validateImportData(data) : idb.validateImportData(data);
}

export function validateImportDataV2(data: unknown): data is ExportDataV2 {
  return isApiMode() ? apiStore.validateImportDataV2(data) : idb.validateImportDataV2(data);
}

export async function clearAllData(): Promise<void> {
  return isApiMode() ? apiStore.clearAllData() : idb.clearAllData();
}

export function closeDB(): void {
  return isApiMode() ? apiStore.closeDB() : idb.closeDB();
}

export async function deleteDatabase(): Promise<void> {
  return isApiMode() ? apiStore.deleteDatabase() : idb.deleteDatabase();
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  return isApiMode() ? apiStore.saveConversation(conversation) : idb.saveConversation(conversation);
}

export async function getConversation(id: string): Promise<Conversation | null> {
  return isApiMode() ? apiStore.getConversation(id) : idb.getConversation(id);
}

export async function getAllConversations(): Promise<Conversation[]> {
  return isApiMode() ? apiStore.getAllConversations() : idb.getAllConversations();
}

export async function deleteConversation(id: string): Promise<void> {
  return isApiMode() ? apiStore.deleteConversation(id) : idb.deleteConversation(id);
}
