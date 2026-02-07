/**
 * 消息操作辅助函数
 * 提取 sendMessage / regenerateMessage / retryUserMessage 的共享逻辑，
 * 消除约 80% 的代码重复
 *
 * 共享逻辑包括：
 * - API 配置解析（端点/密钥/流式设置/高级参数/模型能力检测）
 * - 图片生成模型的提示词解析
 * - Gemini API 调用（统一流式/非流式分支）
 * - 生成图片保存到图片库
 * - AI 消息对象构建
 * - 窗口/子话题状态更新与持久化
 */

import type { ChatWindow, SubTopic } from '../../types/chatWindow';
import type { Message, ApiConfig, ModelAdvancedConfig, MessageTokenUsage } from '../../types/models';
import type { GeminiContent } from '../../types/gemini';
import {
  sendMessageWithThoughts,
  sendMessageNonStreamingWithThoughts,
  GeminiApiError,
  GeminiRequestCancelledWithThoughtsError,
  type ImageExtractionResult,
} from '../../services/gemini';
import { useModelStore } from '../model';
import { saveChatWindow } from '../../services/storage';
import { storeLogger } from '../../services/logger';
import type { SetState, GetState } from './types';

// ============ 类型定义 ============

/** API 调用配置解析结果 */
export interface ResolvedApiConfig {
  effectiveApiConfig: ApiConfig;
  streamingEnabled: boolean;
  effectiveAdvancedConfig: ModelAdvancedConfig;
  isImageGenerationModel: boolean;
}

/** Gemini API 统一调用结果 */
export interface GeminiCallResult {
  text: string;
  thoughtSummary?: string;
  thoughtSignature?: string;
  images?: ImageExtractionResult[];
  thoughtImages?: ImageExtractionResult[];
  duration?: number;
  ttfb?: number;
  tokenUsage?: MessageTokenUsage;
}

// ============ 常量 ============

/** 发送完成后的状态重置对象 */
export const SENDING_RESET_STATE = {
  isSending: false,
  streamingText: '',
  streamingThought: '',
  currentRequestController: null,
} as const;

// ============ 配置解析 ============

/**
 * 解析 API 调用所需的完整配置
 * 包括: API 端点/密钥、流式设置、高级参数、图片模型检测
 *
 * 优先级链:
 *   传入的 apiConfig/advancedConfig > 窗口级配置 > 全局设置 > 模型默认值
 *
 * 需求: 6.6, 10.3, 10.4, 1.3, 1.4, 3.1-3.6
 */
export async function resolveApiCallConfig(
  window: ChatWindow,
  apiConfig?: ApiConfig,
  advancedConfig?: ModelAdvancedConfig
): Promise<ResolvedApiConfig> {
  // 动态导入避免循环依赖
  const { useSettingsStore } = await import('../settings');
  const settingsState = useSettingsStore.getState();

  // 构建有效 API 配置
  const effectiveApiConfig: ApiConfig = apiConfig || {
    endpoint: '',
    apiKey: '',
    model: window.config.model,
  };

  if (!effectiveApiConfig.endpoint || !effectiveApiConfig.apiKey) {
    effectiveApiConfig.endpoint = settingsState.apiEndpoint;
    effectiveApiConfig.apiKey = settingsState.apiKey;
  }

  // 解析流式设置（对话级 > 全局级）
  const { resolveStreamingEnabled } = await import('../../services/streaming');
  const streamingEnabled = resolveStreamingEnabled(
    window.config,
    settingsState.getFullSettings()
  );

  // 解析高级参数配置（传入 > 窗口级 > 模型默认）
  const effectiveAdvancedConfig = advancedConfig || {
    ...useModelStore.getState().getEffectiveConfig(window.config.model),
    ...window.config.advancedConfig,
  };

  // 检测图片生成模型（处理重定向模型）
  const modelCapabilities = useModelStore.getState().getEffectiveCapabilities(window.config.model);
  const isImageGenerationModel = modelCapabilities.supportsImageGeneration === true;

  return {
    effectiveApiConfig,
    streamingEnabled,
    effectiveAdvancedConfig,
    isImageGenerationModel,
  };
}

/**
 * 对图片生成模型应用提示词中的配置参数解析
 * 就地修改 advancedConfig.imageConfig
 *
 * 需求: 5.1, 5.2, 5.3, 6.1, 6.2
 */
export async function applyImagePromptConfig(
  content: string,
  advancedConfig: ModelAdvancedConfig,
  isImageGenerationModel: boolean
): Promise<void> {
  if (!isImageGenerationModel) return;

  const { parseImagePrompt, mergeImageConfig } = await import('../../services/promptParser');
  const { DEFAULT_IMAGE_GENERATION_CONFIG } = await import('../../types/models');

  const parseResult = parseImagePrompt(content);
  const currentImageConfig = advancedConfig.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG;
  advancedConfig.imageConfig = mergeImageConfig(parseResult, currentImageConfig);
}

// ============ API 调用 ============

/**
 * 执行 Gemini API 调用（自动处理流式/非流式分支）
 *
 * 流式模式: 通过 set 回调实时更新 streamingText / streamingThought
 * 非流式模式: 等待完整响应后返回
 *
 * 需求: 10.3, 10.4, 4.2, 4.3, 5.2
 */
export async function executeGeminiCall(
  geminiContents: GeminiContent[],
  config: ResolvedApiConfig,
  window: ChatWindow,
  abortSignal: AbortSignal,
  set: SetState
): Promise<GeminiCallResult> {
  const { effectiveApiConfig, streamingEnabled, effectiveAdvancedConfig } = config;
  const {
    generationConfig,
    safetySettings,
    systemInstruction,
    webSearchEnabled,
    urlContextEnabled,
  } = window.config;

  if (streamingEnabled) {
    let fullResponse = '';
    let fullThought = '';

    const result = await sendMessageWithThoughts(
      geminiContents,
      effectiveApiConfig,
      generationConfig,
      safetySettings,
      systemInstruction,
      (chunk) => {
        fullResponse += chunk;
        set({ streamingText: fullResponse });
      },
      effectiveAdvancedConfig,
      abortSignal,
      webSearchEnabled,
      (thoughtChunk) => {
        fullThought += thoughtChunk;
        set({ streamingThought: fullThought });
      },
      urlContextEnabled
    );

    return result;
  } else {
    const result = await sendMessageNonStreamingWithThoughts(
      geminiContents,
      effectiveApiConfig,
      generationConfig,
      safetySettings,
      systemInstruction,
      effectiveAdvancedConfig,
      webSearchEnabled,
      urlContextEnabled
    );

    return result;
  }
}

// ============ 图片保存 ============

/**
 * 保存生成的图片到图片库
 *
 * 需求: 2.7, 4.3, 5.4
 */
export async function saveGeneratedImages(
  images: ImageExtractionResult[] | undefined,
  metadata: {
    windowId: string;
    messageId: string;
    prompt: string;
    imageConfig?: ModelAdvancedConfig['imageConfig'];
  }
): Promise<void> {
  if (!images || images.length === 0) return;

  const { useImageStore } = await import('../image');
  const { createGeneratedImage } = await import('../../types');
  const imageStore = useImageStore.getState();

  for (const imageData of images) {
    const image = createGeneratedImage(imageData.data, imageData.mimeType, {
      windowId: metadata.windowId,
      messageId: metadata.messageId,
      prompt: metadata.prompt,
      aspectRatio: metadata.imageConfig?.aspectRatio,
      imageSize: metadata.imageConfig?.imageSize,
    });
    await imageStore.addImage(image);
  }
}

// ============ 消息构建 ============

/**
 * 从 API 结果构建 AI 消息对象
 *
 * @param id - 消息 ID（新消息用 generateId()，重新生成用原消息 ID）
 * @param result - Gemini API 调用结果
 * @param baseMessage - 可选基础消息，用于保留原始属性（regenerate 场景）
 *
 * 需求: 4.3, 8.4, 2.6, 1.3, 2.1, 4.1
 */
export function buildAiMessage(
  id: string,
  result: GeminiCallResult,
  baseMessage?: Message
): Message {
  return {
    ...(baseMessage || {}),
    id,
    role: 'model' as const,
    content: result.text,
    timestamp: Date.now(),
    thoughtSummary: result.thoughtSummary,
    thoughtSignature: result.thoughtSignature,
    thoughtImages: result.thoughtImages?.map((img) => ({
      mimeType: img.mimeType,
      data: img.data,
    })),
    duration: result.duration,
    ttfb: result.ttfb,
    tokenUsage: result.tokenUsage,
    generatedImages: result.images?.map((img) => ({
      mimeType: img.mimeType,
      data: img.data,
    })),
  };
}

// ============ 状态更新辅助 ============

/**
 * 通过 draft 修改回调更新子话题状态、重置发送状态、保存到存储
 * 统一处理 set（Immer draft 修改）+ saveChatWindow 的组合操作
 *
 * @param set - Zustand setter（支持 Immer draft 修改）
 * @param get - Zustand getter（用于获取最新状态进行持久化）
 * @param windowId - 窗口 ID
 * @param subTopicId - 子话题 ID
 * @param updateDraft - draft 修改回调，接收目标子话题的 draft 进行直接修改
 * @param extraState - 额外的状态更新（如 { error: null }）
 */
export async function finalizeAndSave(
  set: SetState,
  get: GetState,
  windowId: string,
  subTopicId: string,
  updateDraft: (subTopic: SubTopic) => void,
  extraState?: Record<string, unknown>
): Promise<void> {
  set((state) => {
    const w = state.windows.find((w) => w.id === windowId);
    if (w) {
      const st = w.subTopics.find((st) => st.id === subTopicId);
      if (st) {
        updateDraft(st);
        st.updatedAt = Date.now();
      }
      w.updatedAt = Date.now();
    }
    Object.assign(state, SENDING_RESET_STATE);
    if (extraState) Object.assign(state, extraState);
  });
  // 持久化：从最新状态中获取窗口对象
  const finalWindow = get().windows.find((w) => w.id === windowId);
  if (finalWindow) {
    await saveChatWindow(finalWindow);
  }
}

/**
 * 从错误对象提取用户可读的错误消息
 */
export function extractErrorMessage(error: unknown, defaultMessage: string): string {
  if (error instanceof GeminiApiError) return error.message;
  if (error instanceof Error) return error.message;
  return defaultMessage;
}

// ============ 统一消息发送编排 ============

/** 编排配置 */
export interface OrchestrateSendConfig {
  // 上下文
  /** 当前聊天窗口 */
  window: ChatWindow;
  /** 窗口 ID */
  windowId: string;
  /** 子话题 ID */
  subTopicId: string;
  /** 转换后的 Gemini API 格式消息 */
  contextMessages: GeminiContent[];
  // 状态管理
  /** Zustand 状态设置器 */
  set: SetState;
  // 可选覆盖
  /** 自定义 API 配置（端点/密钥/模型） */
  apiConfig?: ApiConfig;
  /** 自定义高级参数配置 */
  advancedConfig?: ModelAdvancedConfig;
  /** 用于图片生成模型的提示词（触发提示词参数解析） */
  promptForImageConfig?: string;
  // 结果处理回调
  /** 成功时的回调，接收 AI 消息和 API 调用结果 */
  onSuccess: (aiMessage: Message, result: GeminiCallResult) => Promise<void>;
  /** 请求被取消时的回调（含部分响应和思维链） */
  onCancelled: (error: GeminiRequestCancelledWithThoughtsError) => Promise<void>;
  /** 发生其他错误时的回调 */
  onError: (error: unknown) => Promise<void>;
}

/**
 * 统一消息发送编排函数
 *
 * 封装 3 个核心函数（sendMessage / regenerateMessage / retryUserMessage）
 * 的共享流程：
 * 1. 创建 AbortController
 * 2. 设置发送状态（isSending、清空 streamingText/streamingThought）
 * 3. 解析 API 配置（resolveApiCallConfig）
 * 4. 可选：处理图片生成模型的提示词参数（applyImagePromptConfig）
 * 5. 执行 Gemini API 调用（executeGeminiCall）
 * 6. 统一 try-catch 错误处理，通过回调让调用方定制行为
 *
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export async function orchestrateSend(config: OrchestrateSendConfig): Promise<void> {
  const {
    window,
    windowId,
    subTopicId,
    contextMessages,
    set,
    apiConfig,
    advancedConfig,
    promptForImageConfig,
    onSuccess,
    onCancelled,
    onError,
  } = config;

  // 1. 创建 AbortController 用于取消请求
  const abortController = new AbortController();

  // 2. 设置发送状态：标记正在发送，清空流式文本和思维链
  set({
    isSending: true,
    error: null,
    streamingText: '',
    streamingThought: '',
    currentRequestController: abortController,
  });

  try {
    // 3. 解析 API 调用所需的完整配置
    const resolvedConfig = await resolveApiCallConfig(window, apiConfig, advancedConfig);

    // 4. 可选：对图片生成模型应用提示词中的配置参数解析
    if (promptForImageConfig !== undefined) {
      await applyImagePromptConfig(
        promptForImageConfig,
        resolvedConfig.effectiveAdvancedConfig,
        resolvedConfig.isImageGenerationModel
      );
    }

    // 5. 执行 Gemini API 调用
    const result = await executeGeminiCall(
      contextMessages,
      resolvedConfig,
      window,
      abortController.signal,
      set
    );

    // 6. 构建 AI 消息并通过 onSuccess 回调交给调用方处理
    const { generateId } = await import('./utils');
    const aiMessageId = generateId();
    const aiMessage = buildAiMessage(aiMessageId, result);

    await onSuccess(aiMessage, result);
  } catch (error) {
    // 统一错误处理
    if (error instanceof GeminiRequestCancelledWithThoughtsError) {
      // 请求被取消（含部分响应和思维链），交给调用方处理
      storeLogger.info('请求已取消', {
        partialResponseLength: error.partialResponse.length,
        windowId,
        subTopicId,
      });
      await onCancelled(error);
    } else {
      // 其他错误：记录日志后交给调用方处理
      storeLogger.error('消息发送失败', {
        error: error instanceof Error ? error.message : '未知错误',
        windowId,
        subTopicId,
      });
      await onError(error);
    }
  }
}
