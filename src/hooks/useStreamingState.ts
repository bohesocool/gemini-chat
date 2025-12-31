/**
 * useStreamingState Hook
 * 需求: 5.2, 5.3 - 封装流式响应状态管理
 * 
 * 提供流式文本和思维链内容的状态访问和清除方法
 */

import { useChatWindowStore } from '../stores/chatWindow';

/**
 * useStreamingState Hook 返回值类型
 */
export interface UseStreamingStateReturn {
  /** 流式响应文本 */
  streamingText: string;
  /** 流式思维链内容 */
  streamingThought: string;
  /** 是否正在流式传输 */
  isStreaming: boolean;
  /** 清除所有流式状态 */
  clearStreaming: () => void;
}

/**
 * 流式状态管理 Hook
 * 
 * 封装 streamingText、streamingThought 状态，提供统一的访问和清除方法
 * 
 * @example
 * ```tsx
 * const { streamingText, streamingThought, isStreaming, clearStreaming } = useStreamingState();
 * 
 * // 显示流式内容
 * if (isStreaming) {
 *   return <div>{streamingText}</div>;
 * }
 * 
 * // 清除流式状态
 * clearStreaming();
 * ```
 */
export function useStreamingState(): UseStreamingStateReturn {
  // 从 store 获取流式状态
  const streamingText = useChatWindowStore((state) => state.streamingText);
  const streamingThought = useChatWindowStore((state) => state.streamingThought);
  const isSending = useChatWindowStore((state) => state.isSending);
  
  // 获取清除方法
  const clearStreamingText = useChatWindowStore((state) => state.clearStreamingText);
  const clearStreamingThought = useChatWindowStore((state) => state.clearStreamingThought);

  // 判断是否正在流式传输（正在发送且有流式内容）
  const isStreaming = isSending && (streamingText.length > 0 || streamingThought.length > 0);

  // 清除所有流式状态
  const clearStreaming = () => {
    clearStreamingText();
    clearStreamingThought();
  };

  return {
    streamingText,
    streamingThought,
    isStreaming,
    clearStreaming,
  };
}
