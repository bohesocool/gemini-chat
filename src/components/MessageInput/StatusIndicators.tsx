/**
 * 状态指示器组件
 * 在输入框工具栏中显示当前的流式模式、思维链状态、思考程度等
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.6
 */

import { memo } from 'react';
import type { ThinkingLevel, ModelCapabilities } from '../../types/models';
import { useReducedMotion } from '../motion';
import { durationValues, easings } from '../../design/tokens';

/**
 * 思考程度显示名称映射
 */
const THINKING_LEVEL_LABELS: Record<ThinkingLevel, string> = {
  minimal: '最少',
  low: '低',
  medium: '中',
  high: '高',
};

/**
 * 状态指示器组件属性
 */
interface StatusIndicatorsProps {
  /** 是否启用流式输出 */
  streamingEnabled: boolean;
  /** 切换流式输出回调 */
  onStreamingToggle?: () => void;
  /** 是否显示思维链 */
  includeThoughts?: boolean;
  /** 切换思维链回调 */
  onThoughtsToggle?: () => void;
  /** 思考程度 */
  thinkingLevel?: ThinkingLevel;
  /** 思考程度变更回调 */
  onThinkingLevelChange?: (level: ThinkingLevel) => void;
  /** 思考预算 */
  thinkingBudget?: number;
  /** 思考预算变更回调 */
  onThinkingBudgetChange?: (budget: number) => void;
  /** 模型能力 */
  capabilities: ModelCapabilities;
  /** 是否禁用 */
  disabled?: boolean;
}

/**
 * 状态徽章组件
 */
interface StatusBadgeProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  title?: string;
}

const StatusBadge = memo(function StatusBadge({
  label,
  active = false,
  onClick,
  disabled = false,
  title,
}: StatusBadgeProps) {
  const reducedMotion = useReducedMotion();
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  const isClickable = onClick && !disabled;

  return (
    <button
      type="button"
      onClick={isClickable ? onClick : undefined}
      disabled={disabled || !onClick}
      className={`
        px-2 py-0.5 rounded-md text-xs font-medium
        ${isClickable ? 'cursor-pointer' : 'cursor-default'}
        ${active
          ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300'
          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
        }
        ${isClickable && !disabled
          ? 'hover:bg-primary-200 dark:hover:bg-primary-800/50 active:scale-95'
          : ''
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={transitionStyle}
      title={title}
    >
      {label}
    </button>
  );
});

/**
 * 思考程度选择器组件
 */
interface ThinkingLevelSelectorProps {
  level: ThinkingLevel;
  onChange?: (level: ThinkingLevel) => void;
  disabled?: boolean;
}

const ThinkingLevelSelector = memo(function ThinkingLevelSelector({
  level,
  onChange,
  disabled = false,
}: ThinkingLevelSelectorProps) {
  const reducedMotion = useReducedMotion();
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  const levels: ThinkingLevel[] = ['minimal', 'low', 'medium', 'high'];
  const currentIndex = levels.indexOf(level);

  const handleClick = () => {
    if (disabled || !onChange) return;
    // 循环切换到下一个级别
    const nextIndex = (currentIndex + 1) % levels.length;
    const nextLevel = levels[nextIndex];
    if (nextLevel) {
      onChange(nextLevel);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || !onChange}
      className={`
        px-2 py-0.5 rounded-md text-xs font-medium
        bg-amber-100 dark:bg-amber-900/40 
        text-amber-700 dark:text-amber-300
        ${!disabled && onChange
          ? 'cursor-pointer hover:bg-amber-200 dark:hover:bg-amber-800/50 active:scale-95'
          : 'cursor-default'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={transitionStyle}
      title={`思考程度: ${THINKING_LEVEL_LABELS[level]}（点击切换）`}
    >
      思考: {THINKING_LEVEL_LABELS[level]}
    </button>
  );
});

/**
 * 思考预算显示组件
 */
interface ThinkingBudgetBadgeProps {
  budget: number;
  onClick?: () => void;
  disabled?: boolean;
}

const ThinkingBudgetBadge = memo(function ThinkingBudgetBadge({
  budget,
  onClick,
  disabled = false,
}: ThinkingBudgetBadgeProps) {
  const reducedMotion = useReducedMotion();
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  // 格式化预算显示
  const formatBudget = (value: number): string => {
    if (value === -1) return '动态';
    if (value === 0) return '关闭';
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || !onClick}
      className={`
        px-2 py-0.5 rounded-md text-xs font-medium
        ${budget === 0
          ? 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
          : 'bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300'
        }
        ${!disabled && onClick
          ? 'cursor-pointer hover:bg-purple-200 dark:hover:bg-purple-800/50 active:scale-95'
          : 'cursor-default'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={transitionStyle}
      title={`思考预算: ${formatBudget(budget)} tokens`}
    >
      预算: {formatBudget(budget)}
    </button>
  );
});

/**
 * 状态指示器组件
 * 根据模型能力显示相应的状态指示器
 * 
 * Requirements:
 * - 4.1: 显示流式/非流式状态
 * - 4.2: 显示思维链状态（仅支持的模型）
 * - 4.3: 显示思考程度（仅支持的模型）
 * - 4.6: 只显示模型支持的功能
 */
export const StatusIndicators = memo(function StatusIndicators({
  streamingEnabled,
  onStreamingToggle,
  includeThoughts,
  onThoughtsToggle,
  thinkingLevel,
  onThinkingLevelChange,
  thinkingBudget,
  onThinkingBudgetChange,
  capabilities,
  disabled = false,
}: StatusIndicatorsProps) {
  // 判断是否显示各个指示器
  const showThoughtsToggle = capabilities.supportsThoughtSummary === true;
  const showThinkingLevel = capabilities.thinkingConfigType === 'level';
  const showThinkingBudget = capabilities.thinkingConfigType === 'budget';

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {/* 流式/非流式指示器 - Requirements: 4.1 */}
      <StatusBadge
        label={streamingEnabled ? '流式' : '非流式'}
        active={streamingEnabled}
        onClick={onStreamingToggle}
        disabled={disabled}
        title={streamingEnabled ? '点击切换为非流式输出' : '点击切换为流式输出'}
      />

      {/* 思维链状态指示器 - Requirements: 4.2, 4.6 */}
      {showThoughtsToggle && (
        <StatusBadge
          label={includeThoughts ? '思维链开' : '思维链关'}
          active={includeThoughts}
          onClick={onThoughtsToggle}
          disabled={disabled}
          title={includeThoughts ? '点击关闭思维链显示' : '点击开启思维链显示'}
        />
      )}

      {/* 思考程度指示器 - Requirements: 4.3, 4.6 */}
      {showThinkingLevel && thinkingLevel !== undefined && (
        <ThinkingLevelSelector
          level={thinkingLevel}
          onChange={onThinkingLevelChange}
          disabled={disabled}
        />
      )}

      {/* 思考预算指示器 - 仅 budget 类型模型显示 */}
      {showThinkingBudget && thinkingBudget !== undefined && (
        <ThinkingBudgetBadge
          budget={thinkingBudget}
          onClick={onThinkingBudgetChange ? () => {} : undefined}
          disabled={disabled}
        />
      )}
    </div>
  );
});

export default StatusIndicators;
