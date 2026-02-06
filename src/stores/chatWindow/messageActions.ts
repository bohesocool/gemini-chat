/**
 * ChatWindow Store 消息操作
 * 需求: 2.1, 2.4 - 拆分消息操作到独立文件
 *
 * 重构说明：
 * sendMessage / regenerateMessage / retryUserMessage 三个核心函数
 * 的共享逻辑（API 配置解析、API 调用、图片保存、消息构建、状态更新）
 * 已提取到 messageHelpers.ts，消除约 80% 的代码重复。
 */

import type { ChatWindow } from '../../types/chatWindow';
import type { Message, Attachment, ApiConfig, ModelAdvancedConfig } from '../../types/models';
import type { FileReference } from '../../types/filesApi';
import { saveChatWindow } from '../../services/storage';
import { GeminiRequestCancelledWithThoughtsError } from '../../services/gemini';
import { storeLogger } from '../../services/logger';
import { generateId, messagesToGeminiContents } from './utils';
import type { SetState, GetState } from './types';
import { UI_LIMITS } from '../../constants';
import { buildContentWithFileReferences } from '../../services/gemini/builders';
import {
  resolveApiCallConfig,
  applyImagePromptConfig,
  executeGeminiCall,
  saveGeneratedImages,
  buildAiMessage,
  buildUpdatedWindow,
  finalizeAndSave,
  extractErrorMessage,
  replaceMessageAtIndex,
  SENDING_RESET_STATE,
} from './messageHelpers';

/**
 * 创建消息操作
 */
export const createMessageActions = (set: SetState, get: GetState) => ({
  // ============ 发送消息 ============
  // 需求: 5.1, 5.2, 5.3, 6.6, 3.3, 4.1, 4.2, 4.3 - 支持文件引用
  sendMessage: async (
    windowId: string,
    subTopicId: string,
    content: string,
    attachments?: Attachment[],
    apiConfig?: ApiConfig,
    advancedConfig?: ModelAdvancedConfig,
    fileReferences?: FileReference[]
  ) => {
    const state = get();
    let window = state.windows.find((w) => w.id === windowId);

    // 如果没有指定窗口，创建一个新的
    if (!window) {
      window = get().createWindow();
      windowId = window.id;
      subTopicId = window.activeSubTopicId;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      set({ error: '子话题不存在' });
      return;
    }

    // 创建用户消息
    // 需求: 1.1, 1.3 - 存储文件引用到消息对象，只存储 status 为 'ready' 的文件引用
    const readyFileReferences = fileReferences?.filter((ref) => ref.status === 'ready');
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content,
      attachments,
      timestamp: Date.now(),
      // 需求: 1.1, 1.2 - 存储文件引用以便在后续对话中使用
      fileReferences:
        readyFileReferences && readyFileReferences.length > 0 ? readyFileReferences : undefined,
    };

    // 添加用户消息到子话题
    const messagesWithUser = [...subTopic.messages, userMessage];

    // 更新窗口标题（如果是第一条消息）
    let windowTitle = window.title;
    if (subTopic.messages.length === 0 && window.subTopics.length === 1) {
      windowTitle =
        content.slice(0, UI_LIMITS.MAX_TITLE_LENGTH) +
        (content.length > UI_LIMITS.MAX_TITLE_LENGTH ? '...' : '');
    }

    // 构建已添加用户消息的窗口
    const updatedWindow: ChatWindow = {
      ...buildUpdatedWindow(window, subTopicId, messagesWithUser),
      title: windowTitle,
    };

    // 创建 AbortController 用于取消请求 - 需求: 5.1, 5.2
    const abortController = new AbortController();

    // 需求: 4.2 - 在流式开始时清空 streamingThought 和 streamingText
    set((state) => ({
      windows: state.windows.map((w) => (w.id === windowId ? updatedWindow : w)),
      isSending: true,
      error: null,
      streamingText: '',
      streamingThought: '',
      currentRequestController: abortController,
    }));

    // 保存窗口
    await saveChatWindow(updatedWindow);

    try {
      // 解析 API 配置（端点/密钥、流式设置、高级参数、模型能力）
      const config = await resolveApiCallConfig(window, apiConfig, advancedConfig);

      // 图片生成模型的提示词解析
      // 需求: 5.1, 5.2, 5.3, 6.1, 6.2
      await applyImagePromptConfig(content, config.effectiveAdvancedConfig, config.isImageGenerationModel);

      // 转换消息为 Gemini API 格式
      // 需求: 3.3, 4.1, 4.2, 4.3 - 支持文件引用
      let geminiContents = messagesToGeminiContents(messagesWithUser, config.isImageGenerationModel);

      // 如果有文件引用，重新构建最后一条用户消息
      // 需求: 4.1 - 使用 file_data part 格式
      // 需求: 4.2 - 支持混合文件引用与文本内容
      // 需求: 4.3 - 支持混合文件引用与内联 base64 数据
      if (fileReferences && fileReferences.length > 0) {
        const ready = fileReferences.filter((ref) => ref.status === 'ready');
        if (ready.length > 0) {
          geminiContents = geminiContents.slice(0, -1);
          geminiContents.push(buildContentWithFileReferences(content, ready, attachments));
        }
      }

      // 调用 Gemini API
      const result = await executeGeminiCall(
        geminiContents, config, window, abortController.signal, set
      );

      // 生成 AI 消息 ID，保存图片时关联
      // 需求: 4.3 - 添加消息 ID 关联以便追溯
      const aiMessageId = generateId();

      // 保存生成的图片到图片库 - 需求: 2.7, 4.3, 5.4
      await saveGeneratedImages(result.images, {
        windowId,
        messageId: aiMessageId,
        prompt: content,
        imageConfig: config.effectiveAdvancedConfig.imageConfig,
      });

      // 构建 AI 消息并保存
      const aiMessage = buildAiMessage(aiMessageId, result);

      await finalizeAndSave(
        set, windowId, updatedWindow, subTopicId,
        [...messagesWithUser, aiMessage]
      );
    } catch (error) {
      // 需求: 5.3, 5.4 - 处理请求取消，保留部分响应
      if (error instanceof GeminiRequestCancelledWithThoughtsError) {
        storeLogger.info('请求已取消，保存部分响应', {
          partialResponseLength: error.partialResponse.length,
          windowId,
          subTopicId,
        });

        if (error.partialResponse.length > 0) {
          const partialAiMessage: Message = {
            id: generateId(),
            role: 'model',
            content: error.partialResponse,
            timestamp: Date.now(),
            thoughtSummary: error.partialThought || undefined,
          };

          await finalizeAndSave(
            set, windowId, updatedWindow, subTopicId,
            [...messagesWithUser, partialAiMessage]
          );
        } else {
          set(SENDING_RESET_STATE);
        }
        return;
      }

      // 需求: 2.4 - 输出错误日志
      storeLogger.error('发送消息失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });

      // 将错误保存到用户消息中，实现错误状态持久化
      const userMessageWithError: Message = {
        ...userMessage,
        error: extractErrorMessage(error, '发送消息失败'),
      };

      await finalizeAndSave(
        set, windowId, updatedWindow, subTopicId,
        [...subTopic.messages, userMessageWithError],
        { error: null }
      );
    }
  },

  // ============ 编辑消息 ============
  // 需求: 3.2 - 编辑后删除后续消息并重新发送
  editMessage: async (
    windowId: string,
    subTopicId: string,
    messageId: string,
    newContent: string
  ) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);

    if (!window) {
      set({ error: '窗口不存在' });
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      set({ error: '子话题不存在' });
      return;
    }

    // 找到要编辑的消息索引
    const messageIndex = subTopic.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      set({ error: '消息不存在' });
      return;
    }

    const originalMessage = subTopic.messages[messageIndex];
    if (!originalMessage || originalMessage.role !== 'user') {
      set({ error: '只能编辑用户消息' });
      return;
    }

    // 截断消息列表，删除该消息之后的所有消息
    // 需求: 3.2 - Property 5: 消息编辑后截断
    const truncatedMessages = subTopic.messages.slice(0, messageIndex);

    const updatedWindow = buildUpdatedWindow(window, subTopicId, truncatedMessages);

    set((state) => ({
      windows: state.windows.map((w) => (w.id === windowId ? updatedWindow : w)),
    }));

    // 保存窗口
    await saveChatWindow(updatedWindow);

    // 重新发送编辑后的消息
    const { useSettingsStore } = await import('../settings');
    const settingsState = useSettingsStore.getState();

    await get().sendMessage(windowId, subTopicId, newContent, originalMessage.attachments, {
      endpoint: settingsState.apiEndpoint,
      apiKey: settingsState.apiKey,
      model: window.config.model,
    });
  },

  // ============ 重新生成 AI 消息 ============
  // 需求: 4.1, 4.3 - 使用相同上下文重新请求，保持消息 ID 不变
  regenerateMessage: async (
    windowId: string,
    subTopicId: string,
    messageId: string
  ) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);

    if (!window) {
      set({ error: '窗口不存在' });
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      set({ error: '子话题不存在' });
      return;
    }

    // 找到要重新生成的消息索引
    const messageIndex = subTopic.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      set({ error: '消息不存在' });
      return;
    }

    const originalMessage = subTopic.messages[messageIndex];
    if (!originalMessage || originalMessage.role !== 'model') {
      set({ error: '只能重新生成 AI 消息' });
      return;
    }

    // 获取该消息之前的所有消息作为上下文
    // 需求: 4.1 - Property 7: 重新生成上下文一致性
    const contextMessages = subTopic.messages.slice(0, messageIndex);
    const lastUserMessage = contextMessages.filter((m) => m.role === 'user').pop();

    // 创建 AbortController 用于取消请求 - 需求: 5.1, 5.2
    const abortController = new AbortController();

    // 需求: 4.2 - 在流式开始时清空 streamingThought 和 streamingText
    set({
      isSending: true,
      error: null,
      streamingText: '',
      streamingThought: '',
      currentRequestController: abortController,
    });

    try {
      // 解析 API 配置
      const config = await resolveApiCallConfig(window);

      // 图片生成模型的提示词解析
      // 需求: 2.1, 2.2, 2.3, 2.4 - 重新生成时使用原始提示词参数
      if (config.isImageGenerationModel && lastUserMessage) {
        await applyImagePromptConfig(
          lastUserMessage.content,
          config.effectiveAdvancedConfig,
          true
        );
      }

      // 转换消息为 Gemini API 格式
      const geminiContents = messagesToGeminiContents(contextMessages, config.isImageGenerationModel);

      // 调用 Gemini API
      const result = await executeGeminiCall(
        geminiContents, config, window, abortController.signal, set
      );

      // 保存生成的图片到图片库 - 需求: 2.1, 4.3, 5.4
      const prompt = lastUserMessage?.content || '';
      await saveGeneratedImages(result.images, {
        windowId,
        messageId,
        prompt,
        imageConfig: config.effectiveAdvancedConfig.imageConfig,
      });

      // 更新消息内容，保持 ID 不变
      // 需求: 4.3, 8.4, 2.6, 1.3, 2.1 - Property 8: 重新生成消息替换
      const updatedMessage = buildAiMessage(messageId, result, originalMessage);

      await finalizeAndSave(
        set, windowId, window, subTopicId,
        replaceMessageAtIndex(subTopic.messages, messageIndex, updatedMessage)
      );
    } catch (error) {
      // 需求: 5.3, 5.4 - 处理请求取消，保留部分响应
      if (error instanceof GeminiRequestCancelledWithThoughtsError) {
        storeLogger.info('重新生成请求已取消，保存部分响应', {
          partialResponseLength: error.partialResponse.length,
          windowId,
          subTopicId,
          messageId,
        });

        if (error.partialResponse.length > 0) {
          const partialMessage: Message = {
            ...originalMessage,
            content: error.partialResponse,
            timestamp: Date.now(),
            thoughtSummary: error.partialThought || undefined,
          };

          await finalizeAndSave(
            set, windowId, window, subTopicId,
            replaceMessageAtIndex(subTopic.messages, messageIndex, partialMessage)
          );
        } else {
          // 没有部分响应，保留原消息
          set(SENDING_RESET_STATE);
        }
        return;
      }

      storeLogger.error('重新生成消息失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
        messageId,
      });

      // 将错误保存到 AI 消息中，实现错误状态持久化
      // 需求: 4.4 - 重新生成失败时保留原消息内容，但添加错误状态
      const messageWithError: Message = {
        ...originalMessage,
        error: extractErrorMessage(error, '重新生成失败'),
      };

      await finalizeAndSave(
        set, windowId, window, subTopicId,
        replaceMessageAtIndex(subTopic.messages, messageIndex, messageWithError),
        { error: null }
      );
    }
  },

  // ============ 取消当前请求 ============
  // 需求: 5.1, 5.2 - 取消正在进行的 API 请求
  cancelRequest: () => {
    const state = get();
    if (state.currentRequestController) {
      storeLogger.info('取消当前请求');
      state.currentRequestController.abort();
      // 注意：不在这里清除 controller，让 sendMessage 的 catch 块处理
    }
  },

  // ============ 更新消息的错误状态 ============
  // 用于持久化消息发送/重新生成失败的错误信息
  updateMessageError: async (
    windowId: string,
    subTopicId: string,
    messageId: string,
    error: string | null
  ) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);

    if (!window) return;

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) return;

    const messageIndex = subTopic.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) return;

    const existingMessage = subTopic.messages[messageIndex];
    if (!existingMessage) return;

    // 更新消息的错误状态
    const updatedMessage: Message = {
      ...existingMessage,
      error: error || undefined, // null 转为 undefined 以便从对象中移除
    };

    // 如果 error 为 null，删除 error 字段
    if (error === null) {
      delete updatedMessage.error;
    }

    const updatedWindow = buildUpdatedWindow(
      window,
      subTopicId,
      replaceMessageAtIndex(subTopic.messages, messageIndex, updatedMessage)
    );

    set((state) => ({
      windows: state.windows.map((w) => (w.id === windowId ? updatedWindow : w)),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (err) {
      storeLogger.error('更新消息错误状态失败', {
        error: err instanceof Error ? err.message : '未知错误',
        windowId,
        subTopicId,
        messageId,
      });
    }
  },

  // ============ 重试发送失败的用户消息 ============
  // 不创建新消息，使用现有用户消息作为上下文，直接请求 AI 响应
  // 需求: 2.3 - 重试时文件引用通过 contextMessages 被正确传递
  retryUserMessage: async (
    windowId: string,
    subTopicId: string,
    messageId: string
  ) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);

    if (!window) {
      set({ error: '窗口不存在' });
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      set({ error: '子话题不存在' });
      return;
    }

    // 找到要重试的用户消息
    const messageIndex = subTopic.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      set({ error: '消息不存在' });
      return;
    }

    const userMessage = subTopic.messages[messageIndex];
    if (!userMessage || userMessage.role !== 'user') {
      set({ error: '只能重试用户消息' });
      return;
    }

    // 清除用户消息的错误状态
    // 需求: 2.3 - 保留 fileReferences 字段以便在重试时正确传递
    const clearedUserMessage: Message = { ...userMessage };
    delete clearedUserMessage.error;

    // 获取包含该用户消息的所有消息作为上下文
    // 需求: 2.3 - contextMessages 包含所有历史消息的 fileReferences
    const contextMessages = subTopic.messages
      .slice(0, messageIndex + 1)
      .map((m, i) => (i === messageIndex ? clearedUserMessage : m));

    // 创建 AbortController 用于取消请求
    const abortController = new AbortController();

    // 更新状态：清除错误，开始发送
    const updatedMessages = replaceMessageAtIndex(
      subTopic.messages,
      messageIndex,
      clearedUserMessage
    );
    const updatedWindow = buildUpdatedWindow(window, subTopicId, updatedMessages);

    set((state) => ({
      windows: state.windows.map((w) => (w.id === windowId ? updatedWindow : w)),
      isSending: true,
      error: null,
      streamingText: '',
      streamingThought: '',
      currentRequestController: abortController,
    }));

    // 保存清除错误后的状态
    await saveChatWindow(updatedWindow);

    try {
      // 解析 API 配置
      const config = await resolveApiCallConfig(window);

      // 图片生成模型的提示词解析
      await applyImagePromptConfig(
        userMessage.content,
        config.effectiveAdvancedConfig,
        config.isImageGenerationModel
      );

      // 转换消息为 Gemini API 格式
      const geminiContents = messagesToGeminiContents(contextMessages, config.isImageGenerationModel);

      // 调用 Gemini API
      const result = await executeGeminiCall(
        geminiContents, config, window, abortController.signal, set
      );

      // 预生成 AI 消息 ID，确保图片库关联一致
      const aiMessageId = generateId();

      // 保存生成的图片到图片库 - 需求: 5.4
      await saveGeneratedImages(result.images, {
        windowId,
        messageId: aiMessageId,
        prompt: userMessage.content,
        imageConfig: config.effectiveAdvancedConfig.imageConfig,
      });

      // 构建 AI 响应消息
      const aiMessage = buildAiMessage(aiMessageId, result);

      await finalizeAndSave(
        set, windowId, updatedWindow, subTopicId,
        [...updatedMessages, aiMessage]
      );
    } catch (error) {
      // 处理请求取消
      if (error instanceof GeminiRequestCancelledWithThoughtsError) {
        storeLogger.info('重试请求已取消，保存部分响应', {
          partialResponseLength: error.partialResponse.length,
          windowId,
          subTopicId,
          messageId,
        });

        if (error.partialResponse.length > 0) {
          const partialAiMessage: Message = {
            id: generateId(),
            role: 'model',
            content: error.partialResponse,
            timestamp: Date.now(),
            thoughtSummary: error.partialThought || undefined,
          };

          await finalizeAndSave(
            set, windowId, updatedWindow, subTopicId,
            [...updatedMessages, partialAiMessage]
          );
        } else {
          set(SENDING_RESET_STATE);
        }
        return;
      }

      // 处理其他错误
      storeLogger.error('重试用户消息失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
        messageId,
      });

      // 将错误保存回用户消息
      const userMessageWithError: Message = {
        ...clearedUserMessage,
        error: extractErrorMessage(error, '发送消息失败'),
      };

      await finalizeAndSave(
        set, windowId, window, subTopicId,
        replaceMessageAtIndex(subTopic.messages, messageIndex, userMessageWithError),
        { error: null }
      );
    }
  },

  // ============ 删除指定消息及其后续所有消息 ============
  deleteMessage: async (
    windowId: string,
    subTopicId: string,
    messageId: string
  ) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);

    if (!window) {
      set({ error: '窗口不存在' });
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      set({ error: '子话题不存在' });
      return;
    }

    // 找到要删除的消息索引
    const messageIndex = subTopic.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      set({ error: '消息不存在' });
      return;
    }

    // 删除该消息及其后续所有消息
    const truncatedMessages = subTopic.messages.slice(0, messageIndex);

    const updatedWindow = buildUpdatedWindow(window, subTopicId, truncatedMessages);

    set((state) => ({
      windows: state.windows.map((w) => (w.id === windowId ? updatedWindow : w)),
    }));

    // 异步保存到存储
    // 需求: 7.1, 7.3 - 使用 try-catch + logger 替代 console.error
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('删除消息失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
        messageId,
      });
    }
  },

  // ============ 仅更新消息内容（不重新发送） ============
  // 用于"仅保存"功能
  updateMessageContent: async (
    windowId: string,
    subTopicId: string,
    messageId: string,
    newContent: string
  ) => {
    const state = get();
    const window = state.windows.find((w) => w.id === windowId);

    if (!window) {
      set({ error: '窗口不存在' });
      return;
    }

    const subTopic = window.subTopics.find((st) => st.id === subTopicId);
    if (!subTopic) {
      set({ error: '子话题不存在' });
      return;
    }

    // 找到要更新的消息索引
    const messageIndex = subTopic.messages.findIndex((m) => m.id === messageId);
    if (messageIndex === -1) {
      set({ error: '消息不存在' });
      return;
    }

    const originalMessage = subTopic.messages[messageIndex];
    if (!originalMessage || originalMessage.role !== 'user') {
      set({ error: '只能编辑用户消息' });
      return;
    }

    // 仅更新消息内容，保留其他属性
    const updatedMessage: Message = {
      ...originalMessage,
      content: newContent,
    };

    const updatedWindow = buildUpdatedWindow(
      window,
      subTopicId,
      replaceMessageAtIndex(subTopic.messages, messageIndex, updatedMessage)
    );

    set((state) => ({
      windows: state.windows.map((w) => (w.id === windowId ? updatedWindow : w)),
    }));

    // 异步保存到存储
    try {
      await saveChatWindow(updatedWindow);
    } catch (error) {
      storeLogger.error('更新消息内容失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
        messageId,
      });
    }
  },
});
