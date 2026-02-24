/**
 * 标题生成服务
 * 负责调用 AI 模型为对话生成简洁的标题
 *
 * 需求: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import type { ApiConfig } from '../types/models';
import type { GeminiContent } from '../types/gemini';
import { sendMessageNonStreaming } from './gemini';
import { useSettingsStore } from '../stores/settings';
import { useChatWindowStore } from '../stores/chatWindow';
import { storeLogger } from './logger';

/**
 * 构建标题生成的系统指令
 * @returns 系统指令字符串
 */
export function buildTitlePrompt(): string {
  return `请根据以下对话内容生成一个简洁的对话标题。要求：
1. 标题应准确概括对话的主题
2. 使用与对话相同的语言
3. 不超过20个字
4. 只输出标题文本，不要加引号或其他格式`;
}

/**
 * 清理标题文本：去除首尾引号、多余空白、截断到最大长度
 * @param rawTitle - 模型返回的原始标题
 * @param maxLength - 最大字符数，默认 50
 * @returns 清理后的标题
 */
export function cleanTitle(rawTitle: string, maxLength: number = 50): string {
  // 去除首尾空白
  let cleaned = rawTitle.trim();

  // 去除首尾引号（单引号、双引号、中文引号）和空白字符
  // 使用循环处理引号与空白交替出现的情况
  const quoteChars = ['"', "'", '\u201c', '\u201d', '\u2018', '\u2019'];
  let changed = true;
  while (changed) {
    changed = false;
    // 每轮循环中同时去除空白，确保引号和空白交替时也能完全清理
    const trimmed = cleaned.trim();
    if (trimmed !== cleaned) {
      cleaned = trimmed;
      changed = true;
    }
    for (const quote of quoteChars) {
      if (cleaned.startsWith(quote)) {
        cleaned = cleaned.slice(1);
        changed = true;
      }
      if (cleaned.endsWith(quote)) {
        cleaned = cleaned.slice(0, -1);
        changed = true;
      }
    }
  }

  // 截断到最大长度
  if (cleaned.length > maxLength) {
    cleaned = cleaned.slice(0, maxLength);
  }

  return cleaned;
}

/**
 * 生成对话标题
 * 使用 sendMessageNonStreaming 调用标题生成模型，返回清理后的标题
 *
 * @param userMessage - 用户的第一条消息内容
 * @param aiResponse - AI 的第一条回复内容
 * @param apiConfig - API 配置（端点、密钥、标题生成模型）
 * @returns 生成的标题字符串
 */
export async function generateTitle(
  userMessage: string,
  aiResponse: string,
  apiConfig: ApiConfig
): Promise<string> {
  // 构建独立的消息上下文
  const contents: GeminiContent[] = [
    {
      role: 'user',
      parts: [{ text: `用户消息：${userMessage}\n\nAI回复：${aiResponse}` }],
    },
  ];

  // 获取系统指令
  const systemInstruction = buildTitlePrompt();

  // 使用非流式请求调用标题生成模型
  const rawTitle = await sendMessageNonStreaming(
    contents,
    apiConfig,
    undefined, // generationConfig
    undefined, // safetySettings
    systemInstruction
  );

  // 清理并返回标题
  return cleanTitle(rawTitle);
}

/**
 * 检查是否应触发标题生成
 * 当所有条件都满足时返回 true：
 * 1. autoTitleEnabled 为 true（用户启用了自动标题生成）
 * 2. titleGenerated 不为 true（窗口尚未生成过标题或手动设置过标题）
 * 3. isFirstAiReply 为 true（是第一条 AI 回复）
 *
 * @param autoTitleEnabled - 自动标题生成是否启用
 * @param titleGenerated - 窗口是否已生成过标题
 * @param isFirstAiReply - 是否为第一条 AI 回复
 * @returns 是否应触发标题生成
 *
 * 需求: 1.5, 3.4
 */
export function shouldGenerateTitle(
  autoTitleEnabled: boolean,
  titleGenerated: boolean | undefined,
  isFirstAiReply: boolean
): boolean {
  // 自动标题生成功能被禁用时跳过（需求 3.4）
  if (!autoTitleEnabled) {
    return false;
  }

  // 已生成过标题或用户手动设置过标题时跳过（需求 1.5）
  if (titleGenerated === true) {
    return false;
  }

  // 不是第一条 AI 回复时跳过
  if (!isFirstAiReply) {
    return false;
  }

  // 所有条件满足，应触发标题生成
  return true;
}

/**
 * 编排标题生成流程
 * 检查前置条件 → 调用 AI 生成标题 → 防竞态检查 → 更新窗口标题
 * 失败时静默降级，通过 storeLogger.error 记录错误，不影响主流程
 *
 * @param windowId - 聊天窗口 ID
 * @param userMessage - 用户的第一条消息内容
 * @param aiResponse - AI 的第一条回复内容
 *
 * 需求: 1.1, 1.2, 1.4, 4.2
 */
export async function triggerTitleGeneration(
  windowId: string,
  userMessage: string,
  aiResponse: string
): Promise<void> {
  try {
    // 从设置 store 获取自动标题生成配置
    const settingsStore = useSettingsStore.getState();
    const { autoTitleEnabled, titleModel } = settingsStore;

    // 从聊天窗口 store 获取当前窗口状态
    const chatWindowStore = useChatWindowStore.getState();
    const currentWindow = chatWindowStore.windows.find((w) => w.id === windowId);

    // 窗口不存在时静默返回
    if (!currentWindow) {
      return;
    }

    // 检查是否应触发标题生成（需求 1.5, 3.4）
    const shouldGenerate = shouldGenerateTitle(
      autoTitleEnabled,
      currentWindow.titleGenerated,
      true // 由调用方保证是第一条 AI 回复
    );

    if (!shouldGenerate) {
      return;
    }

    // 构建 API 配置，使用标题生成模型覆盖默认模型
    const baseApiConfig = settingsStore.getApiConfig();
    const apiConfig: ApiConfig = {
      ...baseApiConfig,
      model: titleModel,
    };

    // 调用 AI 模型生成标题（需求 2.1, 2.5）
    const title = await generateTitle(userMessage, aiResponse, apiConfig);

    // 生成完成后再次检查 titleGenerated（防止竞态：用户在生成期间手动重命名）（需求 4.2）
    const latestStore = useChatWindowStore.getState();
    const latestWindow = latestStore.windows.find((w) => w.id === windowId);

    // 窗口已被删除，静默丢弃结果
    if (!latestWindow) {
      return;
    }

    // 用户在生成期间手动重命名了标题，丢弃生成结果（需求 4.2）
    if (latestWindow.titleGenerated === true) {
      return;
    }

    // 更新窗口标题和 titleGenerated 标记（需求 1.2）
    await chatWindowStore.updateWindow(windowId, {
      title,
      titleGenerated: true,
    });
  } catch (error) {
    // 失败时记录错误，不影响主流程（需求 1.4）
    storeLogger.error('自动标题生成失败', {
      error: error instanceof Error ? error.message : '未知错误',
      windowId,
    });
  }
}

