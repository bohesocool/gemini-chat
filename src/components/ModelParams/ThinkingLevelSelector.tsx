/**
 * 思考程度选择器组件
 * 用于选择 Gemini 3 Pro 的思考程度（low/high）
 * Requirements: 1.1, 1.2, 1.3, 6.4
 */

import React, { useMemo } from 'react';
import type { ThinkingLevel, ModelCapabilities } from '../../types/models';
import { getModelCapabilities } from '../../types/models';
import { useModelStore } from '../../stores/model';

/**
 * 思考程度选择器属性
 */
export interface ThinkingLevelSelectorProps {
  /** 当前思考程度 */
  value: ThinkingLevel;
  /** 变更回调 */
  onChange: (level: ThinkingLevel) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 显示模式：完整或紧凑 */
  variant?: 'full' | 'compact';
  /** 模型 ID，用于决定显示哪些选项 */
  modelId?: string;
}

/**
 * 思考程度选项配置
 * gemini-3-pro-preview 只支持 low/high
 * gemini-3-flash-preview 支持 minimal/low/medium/high
 */
const THINKING_LEVEL_OPTIONS: Array<{
  value: ThinkingLevel;
  label: string;
  description: string;
}> = [
  {
    value: 'minimal',
    label: '最少',
    description: '最快响应，最少思考',
  },
  {
    value: 'low',
    label: '低',
    description: '快速响应，适合简单任务',
  },
  {
    value: 'medium',
    label: '中',
    description: '平衡速度和深度',
  },
  {
    value: 'high',
    label: '高',
    description: '深度推理，适合复杂问题',
  },
];

/**
 * 根据模型能力配置获取支持的思考等级选项
 * 需求: 1.1, 1.2, 1.3
 * 
 * 根据 supportedThinkingLevels 返回正确的选项。
 * 
 * - gemini-3-pro-preview: 只支持 low/high
 * - gemini-3-flash-preview: 支持 minimal/low/medium/high
 * - 其他模型: 默认返回 low/high
 * 
 * @param capabilities 模型能力配置（已处理重定向）
 */
function getOptionsFromCapabilities(capabilities: ModelCapabilities): typeof THINKING_LEVEL_OPTIONS {
  // 如果模型配置了 supportedThinkingLevels，则根据配置过滤选项
  if (capabilities.supportedThinkingLevels && capabilities.supportedThinkingLevels.length > 0) {
    return THINKING_LEVEL_OPTIONS.filter(
      opt => capabilities.supportedThinkingLevels!.includes(opt.value)
    );
  }
  
  // 默认只返回 low 和 high
  return THINKING_LEVEL_OPTIONS.filter(opt => opt.value === 'low' || opt.value === 'high');
}

/**
 * 根据模型 ID 获取支持的思考等级选项（不处理重定向）
 * 需求: 1.1, 1.2, 1.3
 * 
 * 使用 getModelCapabilities 获取模型能力配置，
 * 根据 supportedThinkingLevels 返回正确的选项。
 * 
 * 注意：此函数不处理模型重定向，仅用于测试或不需要重定向的场景。
 * 在组件中应使用 getOptionsFromCapabilities 配合 useModelStore.getEffectiveCapabilities。
 * 
 * @param modelId 模型 ID
 */
export function getOptionsForModel(modelId?: string): typeof THINKING_LEVEL_OPTIONS {
  if (modelId) {
    // 使用 getModelCapabilities 获取模型能力配置
    const capabilities = getModelCapabilities(modelId);
    return getOptionsFromCapabilities(capabilities);
  }
  
  // 默认只返回 low 和 high
  return THINKING_LEVEL_OPTIONS.filter(opt => opt.value === 'low' || opt.value === 'high');
}

/**
 * 思考程度选择器组件
 * 支持 full 和 compact 两种显示模式
 * 
 * 需求: 1.1, 1.2, 1.3
 * - 使用 useModelStore.getEffectiveCapabilities 处理模型重定向
 * - 根据有效模型的 supportedThinkingLevels 显示正确的选项
 */
export const ThinkingLevelSelector: React.FC<ThinkingLevelSelectorProps> = ({
  value,
  onChange,
  disabled = false,
  variant = 'full',
  modelId,
}) => {
  // 使用 store 的 getEffectiveCapabilities 方法来处理重定向 - 需求: 1.3
  const getEffectiveCapabilities = useModelStore((state) => state.getEffectiveCapabilities);
  
  // 获取有效的模型能力配置（处理重定向）
  const options = useMemo(() => {
    if (modelId) {
      const capabilities = getEffectiveCapabilities(modelId);
      return getOptionsFromCapabilities(capabilities);
    }
    // 默认只返回 low 和 high
    return THINKING_LEVEL_OPTIONS.filter(opt => opt.value === 'low' || opt.value === 'high');
  }, [modelId, getEffectiveCapabilities]);
  // 紧凑模式：使用简单的按钮组
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-secondary)] mr-1">思考:</span>
        <div className="flex rounded-md overflow-hidden border border-[var(--border-primary)]">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className={`
                px-2 py-0.5 text-xs font-medium transition-colors
                ${value === option.value
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={option.description}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 完整模式：显示详细描述
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[var(--text-primary)]">
        思考程度
      </label>
      <div className="flex gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={`
              flex-1 px-3 py-2 rounded-lg border-2 transition-all
              ${value === option.value
                ? 'border-[var(--color-primary-500)] bg-[var(--color-primary-50)] dark:bg-[var(--color-primary-900)]'
                : 'border-[var(--border-primary)] bg-[var(--bg-secondary)] hover:border-[var(--border-secondary)]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="text-center">
              <div
                className={`
                  text-sm font-medium
                  ${value === option.value
                    ? 'text-[var(--color-primary-600)] dark:text-[var(--color-primary-400)]'
                    : 'text-[var(--text-primary)]'
                  }
                `}
              >
                {option.label}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] mt-0.5">
                {option.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThinkingLevelSelector;
