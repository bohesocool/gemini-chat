/**
 * Token 使用量解析服务
 * 需求: 7.1, 7.2, 7.3
 */

import type { UsageMetadata } from '../types/gemini';
import type { TokenUsage } from '../stores/debug';

// ============ 类型定义 ============

/**
 * API 响应中的 usageMetadata 结构
 * 需求: 7.1, 1.2
 */
export interface ApiUsageMetadata {
  /** 输入 Token 数（提示词） */
  promptTokenCount?: number;
  /** 输出 Token 数（候选响应） */
  candidatesTokenCount?: number;
  /** 总 Token 数 */
  totalTokenCount?: number;
  /** 思维链 Token 数 */
  thoughtsTokenCount?: number;
}

// ============ 解析函数 ============

/**
 * 解析 API 响应中的 usageMetadata
 * 需求: 7.1, 1.2 - Property 13: Token 数据解析
 * 
 * 解析后的 TokenUsage 应该包含 promptTokens、completionTokens、thoughtsTokens、totalTokens，
 * 且 totalTokens = promptTokens + completionTokens（thoughtsTokens 单独计算，作为模型内部处理的一部分）
 * 
 * @param usageMetadata - API 响应中的 usageMetadata 对象
 * @returns 解析后的 TokenUsage 对象，如果数据无效则返回 null
 */
export function parseTokenUsage(usageMetadata: ApiUsageMetadata | UsageMetadata | null | undefined): TokenUsage | null {
  // 如果没有 usageMetadata，返回 null
  if (!usageMetadata) {
    return null;
  }

  // 提取各字段值，支持两种命名格式
  const promptTokens = 
    ('promptTokenCount' in usageMetadata ? usageMetadata.promptTokenCount : undefined) ??
    ('promptTokens' in usageMetadata ? (usageMetadata as unknown as TokenUsage).promptTokens : undefined) ??
    0;
  
  const completionTokens = 
    ('candidatesTokenCount' in usageMetadata ? usageMetadata.candidatesTokenCount : undefined) ??
    ('completionTokens' in usageMetadata ? (usageMetadata as unknown as TokenUsage).completionTokens : undefined) ??
    0;

  // 提取思维链 Token 数，默认为 0（需求 1.5）
  const thoughtsTokens = 
    ('thoughtsTokenCount' in usageMetadata ? (usageMetadata as ApiUsageMetadata).thoughtsTokenCount : undefined) ??
    ('thoughtsTokens' in usageMetadata ? (usageMetadata as unknown as TokenUsage).thoughtsTokens : undefined) ??
    0;

  // 计算总 Token 数（确保一致性）
  const totalTokens = promptTokens + completionTokens;

  // 验证数据有效性
  if (promptTokens < 0 || completionTokens < 0 || thoughtsTokens < 0) {
    return null;
  }

  return {
    promptTokens,
    completionTokens,
    thoughtsTokens,
    totalTokens,
  };
}

/**
 * 验证 TokenUsage 数据的一致性
 * 需求: 7.1, 1.2 - Property 13: Token 数据解析
 * 
 * @param tokenUsage - TokenUsage 对象
 * @returns 是否有效
 */
export function isValidTokenUsage(tokenUsage: TokenUsage | null | undefined): boolean {
  if (!tokenUsage) {
    return false;
  }

  // 检查必需字段都存在且为非负数
  if (
    typeof tokenUsage.promptTokens !== 'number' ||
    typeof tokenUsage.completionTokens !== 'number' ||
    typeof tokenUsage.totalTokens !== 'number'
  ) {
    return false;
  }

  if (
    tokenUsage.promptTokens < 0 ||
    tokenUsage.completionTokens < 0 ||
    tokenUsage.totalTokens < 0
  ) {
    return false;
  }

  // 检查可选的 thoughtsTokens 字段（如果存在）
  if (tokenUsage.thoughtsTokens !== undefined) {
    if (typeof tokenUsage.thoughtsTokens !== 'number' || tokenUsage.thoughtsTokens < 0) {
      return false;
    }
  }

  // 验证 totalTokens >= promptTokens + completionTokens
  // 注意：API 返回的 totalTokenCount 可能包含 thoughtsTokens，所以使用 >= 而不是 ===
  // 同时也允许 totalTokens 等于 promptTokens + completionTokens（不含思维链的情况）
  const baseTotal = tokenUsage.promptTokens + tokenUsage.completionTokens;
  const thoughtsTokens = tokenUsage.thoughtsTokens ?? 0;
  
  // totalTokens 应该等于 baseTotal 或 baseTotal + thoughtsTokens
  return tokenUsage.totalTokens === baseTotal || 
         tokenUsage.totalTokens === baseTotal + thoughtsTokens;
}

/**
 * 累计多个 TokenUsage 对象
 * 需求: 7.3 - Property 14: Token 累计计算
 * 
 * @param usages - TokenUsage 对象数组
 * @returns 累计后的 TokenUsage 对象
 */
export function accumulateTokenUsage(usages: (TokenUsage | null | undefined)[]): TokenUsage {
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalThoughtsTokens = 0;

  for (const usage of usages) {
    if (usage && isValidTokenUsage(usage)) {
      totalPromptTokens += usage.promptTokens;
      totalCompletionTokens += usage.completionTokens;
      totalThoughtsTokens += usage.thoughtsTokens ?? 0;
    }
  }

  return {
    promptTokens: totalPromptTokens,
    completionTokens: totalCompletionTokens,
    thoughtsTokens: totalThoughtsTokens,
    totalTokens: totalPromptTokens + totalCompletionTokens,
  };
}

/**
 * 格式化 Token 数量为可读字符串
 * 需求: 7.2
 * 
 * @param count - Token 数量
 * @returns 格式化后的字符串
 */
export function formatTokenCount(count: number): string {
  if (count < 1000) {
    return count.toString();
  }
  if (count < 1000000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return `${(count / 1000000).toFixed(2)}M`;
}

/**
 * 格式化 TokenUsage 为可读字符串
 * 需求: 7.2
 * 
 * @param tokenUsage - TokenUsage 对象
 * @returns 格式化后的字符串，如果数据不可用则返回 "数据不可用"
 */
export function formatTokenUsage(tokenUsage: TokenUsage | null | undefined): string {
  if (!tokenUsage || !isValidTokenUsage(tokenUsage)) {
    return '数据不可用';
  }

  const parts = [
    `输入: ${formatTokenCount(tokenUsage.promptTokens)}`,
    `输出: ${formatTokenCount(tokenUsage.completionTokens)}`,
  ];

  // 仅当 thoughtsTokens > 0 时显示思维链 Token
  if (tokenUsage.thoughtsTokens && tokenUsage.thoughtsTokens > 0) {
    parts.push(`思维链: ${formatTokenCount(tokenUsage.thoughtsTokens)}`);
  }

  parts.push(`总计: ${formatTokenCount(tokenUsage.totalTokens)}`);

  return parts.join(' | ');
}
