/**
 * VirtualMessageList 导出工具函数（用于测试）
 * 来源：VirtualMessageList.tsx（拆分，逻辑不变）
 * 这些纯函数仍从 VirtualMessageList.tsx 重新导出，保持原有导入路径兼容
 */

/**
 * 计算虚拟滚动渲染数量
 * 用于属性测试验证
 */
export function calculateVisibleCount(
  totalMessages: number,
  viewportHeight: number,
  estimatedItemHeight: number,
  overscan: number
): number {
  if (totalMessages === 0) return 0;

  // 可视区域内的项数
  const visibleCount = Math.ceil(viewportHeight / estimatedItemHeight);
  // 加上缓冲区
  const totalVisible = visibleCount + 2 * overscan;
  // 不能超过总数
  return Math.min(totalVisible, totalMessages);
}

/**
 * 计算列表总行数
 * 用于属性测试验证 - Property 2: 重新生成时列表行数保持不变
 *
 * @param messagesLength - 消息数组长度
 * @param isSending - 是否正在发送
 * @param regeneratingMessageId - 正在重新生成的消息 ID
 * @returns 列表总行数
 */
export function calculateTotalCount(
  messagesLength: number,
  isSending: boolean,
  regeneratingMessageId: string | null
): number {
  // 只有在发送新消息时才增加行数，重新生成时保持不变
  const isNewMessageSending = isSending && !regeneratingMessageId;
  return messagesLength + (isNewMessageSending ? 1 : 0);
}

/**
 * 判断消息是否正在重新生成
 * 用于属性测试验证 - Property 1: 重新生成时内容显示在原位置
 *
 * @param messageId - 消息 ID
 * @param regeneratingMessageId - 正在重新生成的消息 ID
 * @param isSending - 是否正在发送
 * @returns 是否正在重新生成
 */
export function isMessageRegenerating(
  messageId: string,
  regeneratingMessageId: string | null,
  isSending: boolean
): boolean {
  return messageId === regeneratingMessageId && isSending;
}

/**
 * 获取消息显示内容
 * 用于属性测试验证 - Property 1: 重新生成时内容显示在原位置
 *
 * @param originalContent - 原始消息内容
 * @param isRegenerating - 是否正在重新生成
 * @param regeneratingContent - 重新生成中的流式内容
 * @returns 应该显示的内容
 */
export function getDisplayContent(
  originalContent: string,
  isRegenerating: boolean,
  regeneratingContent: string
): string {
  return isRegenerating ? regeneratingContent : originalContent;
}

/**
 * 判断消息是否应该显示重新生成状态指示器
 * 用于属性测试验证 - Property 3: 重新生成状态指示器正确管理
 *
 * @param messageId - 消息 ID
 * @param regeneratingMessageId - 正在重新生成的消息 ID
 * @param isSending - 是否正在发送
 * @returns 是否应该显示重新生成状态指示器
 */
export function shouldShowRegeneratingIndicator(
  messageId: string,
  regeneratingMessageId: string | null,
  isSending: boolean
): boolean {
  // 只有当 isSending=true 且 messageId 匹配时才显示指示器
  return messageId === regeneratingMessageId && isSending;
}

/**
 * 判断重新生成状态指示器是否应该被清除
 * 用于属性测试验证 - Property 3: 重新生成状态指示器正确管理
 *
 * @param previousIsSending - 之前的发送状态
 * @param currentIsSending - 当前的发送状态
 * @param previousRegeneratingId - 之前的重新生成消息 ID
 * @param currentRegeneratingId - 当前的重新生成消息 ID
 * @returns 指示器是否被正确清除
 */
export function isIndicatorProperlyCleared(
  previousIsSending: boolean,
  currentIsSending: boolean,
  previousRegeneratingId: string | null,
  currentRegeneratingId: string | null
): boolean {
  // 场景 1: 重新生成完成（isSending 从 true 变为 false）
  if (previousIsSending && !currentIsSending) {
    // 指示器应该被清除（regeneratingId 应该为 null 或不再匹配）
    return true;
  }

  // 场景 2: regeneratingMessageId 被清除
  if (previousRegeneratingId !== null && currentRegeneratingId === null) {
    return true;
  }

  // 场景 3: 状态没有变化或正在进行中
  return false;
}

// ============ 取消操作相关辅助函数（用于测试） ============

/**
 * 取消操作结果类型
 */
export interface CancelOperationResult {
  /** 最终消息内容 */
  finalContent: string;
  /** 是否保留了部分内容 */
  hasPartialContent: boolean;
  /** 是否恢复了原消息 */
  restoredOriginal: boolean;
}

/**
 * 处理取消操作后的内容
 * 用于属性测试验证 - Property 4: 取消操作正确处理内容
 *
 * 需求 4.1: 流式重新生成过程中取消，停止生成并保留已生成的部分内容
 * 需求 4.2: 取消操作执行且有部分内容时，将部分内容保存为消息的新内容
 * 需求 4.3: 没有生成任何内容时取消，恢复显示原消息内容
 *
 * @param originalContent - 原始消息内容
 * @param partialContent - 取消时已生成的部分内容
 * @returns 取消操作结果
 */
export function handleCancelOperation(
  originalContent: string,
  partialContent: string
): CancelOperationResult {
  // 判断是否有有效的部分内容（非空字符串）
  const hasPartialContent = partialContent.length > 0;

  if (hasPartialContent) {
    // 需求 4.1, 4.2: 有部分内容时，保留部分内容
    return {
      finalContent: partialContent,
      hasPartialContent: true,
      restoredOriginal: false,
    };
  } else {
    // 需求 4.3: 没有内容时，恢复原消息
    return {
      finalContent: originalContent,
      hasPartialContent: false,
      restoredOriginal: true,
    };
  }
}

/**
 * 验证取消操作后 regeneratingMessageId 是否被正确清除
 * 用于属性测试验证 - Property 4: 取消操作正确处理内容
 *
 * @param regeneratingMessageIdBeforeCancel - 取消前的 regeneratingMessageId
 * @param regeneratingMessageIdAfterCancel - 取消后的 regeneratingMessageId
 * @returns 是否正确清除
 */
export function isRegeneratingIdClearedAfterCancel(
  regeneratingMessageIdBeforeCancel: string | null,
  regeneratingMessageIdAfterCancel: string | null
): boolean {
  // 参数 regeneratingMessageIdBeforeCancel 用于 API 一致性，实际验证只需检查取消后的状态
  void regeneratingMessageIdBeforeCancel;
  // 取消后，regeneratingMessageId 应该被清除为 null
  return regeneratingMessageIdAfterCancel === null;
}

/**
 * 验证取消操作的完整性
 * 用于属性测试验证 - Property 4: 取消操作正确处理内容
 *
 * @param originalContent - 原始消息内容
 * @param partialContent - 取消时已生成的部分内容
 * @param finalContent - 取消后的最终内容
 * @param isSendingAfterCancel - 取消后的 isSending 状态
 * @param regeneratingIdAfterCancel - 取消后的 regeneratingMessageId
 * @returns 取消操作是否正确处理
 */
export function validateCancelOperation(
  originalContent: string,
  partialContent: string,
  finalContent: string,
  isSendingAfterCancel: boolean,
  regeneratingIdAfterCancel: string | null
): boolean {
  // 1. 取消后 isSending 应该为 false
  if (isSendingAfterCancel) {
    return false;
  }

  // 2. 取消后 regeneratingMessageId 应该为 null
  if (regeneratingIdAfterCancel !== null) {
    return false;
  }

  // 3. 验证内容处理逻辑
  if (partialContent.length > 0) {
    // 有部分内容时，最终内容应该是部分内容
    return finalContent === partialContent;
  } else {
    // 没有部分内容时，最终内容应该是原始内容
    return finalContent === originalContent;
  }
}
