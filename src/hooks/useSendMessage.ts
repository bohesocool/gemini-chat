/**
 * useSendMessage Hook
 * 需求: 5.1, 5.3, 3.3, 4.1, 4.2, 4.3 - 封装消息发送逻辑，支持文件引用
 * 
 * 提供消息发送、取消请求等方法，以及发送状态和错误信息
 */

import { useCallback } from 'react';
import { useChatWindowStore } from '../stores/chatWindow';
import type { Attachment, ApiConfig, ModelAdvancedConfig } from '../types/models';
import type { FileReference } from '../types/filesApi';

/**
 * useSendMessage Hook 配置选项
 */
export interface UseSendMessageOptions {
  /** 窗口 ID */
  windowId: string;
  /** 子话题 ID */
  subTopicId: string;
}

/**
 * useSendMessage Hook 返回值类型
 */
export interface UseSendMessageReturn {
  /** 发送消息 */
  sendMessage: (
    content: string,
    attachments?: Attachment[],
    apiConfig?: ApiConfig,
    advancedConfig?: ModelAdvancedConfig,
    fileReferences?: FileReference[]
  ) => Promise<void>;
  /** 是否正在发送 */
  isSending: boolean;
  /** 取消当前请求 */
  cancelRequest: () => void;
  /** 流式响应文本 */
  streamingText: string;
  /** 流式思维链内容 */
  streamingThought: string;
  /** 错误信息 */
  error: string | null;
}

/**
 * 消息发送 Hook
 * 
 * 封装消息发送逻辑，提供 sendMessage、cancelRequest 方法，
 * 返回 isSending、error 状态以及流式内容
 * 
 * @param options - 配置选项，包含 windowId 和 subTopicId
 * @returns 消息发送相关的方法和状态
 * 
 * @example
 * ```tsx
 * const { sendMessage, isSending, cancelRequest, error } = useSendMessage({
 *   windowId: 'window-1',
 *   subTopicId: 'subtopic-1',
 * });
 * 
 * // 发送消息
 * await sendMessage('你好');
 * 
 * // 发送带文件引用的消息
 * await sendMessage('分析这个文件', undefined, undefined, undefined, fileReferences);
 * 
 * // 取消请求
 * cancelRequest();
 * ```
 */
export function useSendMessage(options: UseSendMessageOptions): UseSendMessageReturn {
  const { windowId, subTopicId } = options;

  // 从 store 获取状态
  const isSending = useChatWindowStore((state) => state.isSending);
  const error = useChatWindowStore((state) => state.error);
  const streamingText = useChatWindowStore((state) => state.streamingText);
  const streamingThought = useChatWindowStore((state) => state.streamingThought);

  // 获取 store 方法
  const storeSendMessage = useChatWindowStore((state) => state.sendMessage);
  const storeCancelRequest = useChatWindowStore((state) => state.cancelRequest);

  // 封装发送消息方法
  // 需求: 3.3, 4.1, 4.2, 4.3 - 支持文件引用
  const sendMessage = useCallback(
    async (
      content: string,
      attachments?: Attachment[],
      apiConfig?: ApiConfig,
      advancedConfig?: ModelAdvancedConfig,
      fileReferences?: FileReference[]
    ) => {
      await storeSendMessage(
        windowId,
        subTopicId,
        content,
        attachments,
        apiConfig,
        advancedConfig,
        fileReferences
      );
    },
    [windowId, subTopicId, storeSendMessage]
  );

  // 封装取消请求方法
  const cancelRequest = useCallback(() => {
    storeCancelRequest();
  }, [storeCancelRequest]);

  return {
    sendMessage,
    isSending,
    cancelRequest,
    streamingText,
    streamingThought,
    error,
  };
}
