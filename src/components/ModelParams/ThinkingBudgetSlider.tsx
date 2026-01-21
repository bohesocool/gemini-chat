/**
 * 思考预算滑块组件
 * 用于配置 Gemini 2.5 系列模型的思考预算（token 数量）
 * Requirements: 3.7, 3.9
 */

import React, { useCallback, useMemo } from 'react';
import type { ThinkingBudgetConfig } from '../../types/models';
import { useTranslation } from '../../i18n/useTranslation';

/**
 * 思考预算滑块属性
 */
export interface ThinkingBudgetSliderProps {
  /** 当前值（-1 为动态，0 为关闭，正数为具体 token 数） */
  value: number;
  /** 思考预算配置 */
  config: ThinkingBudgetConfig;
  /** 变更回调 */
  onChange: (value: number) => void;
  /** 是否禁用 */
  disabled?: boolean;
  /** 显示模式：完整或紧凑 */
  variant?: 'full' | 'compact';
}

/**
 * 思考预算滑块组件
 * 支持 full 和 compact 两种显示模式
 */
export const ThinkingBudgetSlider: React.FC<ThinkingBudgetSliderProps> = ({
  value,
  config,
  onChange,
  disabled = false,
  variant = 'full',
}) => {
  const { t } = useTranslation();
  const { min, max, canDisable } = config;

  /**
   * 格式化显示值
   * @param val 当前值
   * @returns 格式化后的显示文本
   */
  const formatDisplayValue = useCallback((val: number): string => {
    if (val === -1) {
      return t('modelParams.thinkingBudgetDynamic');
    }
    if (val === 0) {
      return t('modelParams.thinkingBudgetOff');
    }
    // 格式化数字，添加千位分隔符
    return val.toLocaleString();
  }, [t]);

  // 计算滑块的实际最小值（如果支持禁用，则从 0 开始，否则从 min 开始）
  const sliderMin = canDisable ? 0 : min;

  // 将 -1（动态）映射到滑块的最大值位置之后的特殊位置
  // 滑块范围：sliderMin -> max，-1 用按钮单独处理
  const sliderValue = useMemo(() => {
    if (value === -1) {
      // 动态模式时，滑块显示在最大值位置
      return max;
    }
    return Math.max(sliderMin, Math.min(max, value));
  }, [value, max, sliderMin]);

  // 处理滑块变化
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = parseInt(e.target.value, 10);
      // 如果当前是动态模式，滑块变化时切换到具体值
      onChange(newValue);
    },
    [onChange]
  );

  // 设置为动态模式
  const handleSetDynamic = useCallback(() => {
    onChange(-1);
  }, [onChange]);

  // 设置为关闭模式
  const handleSetOff = useCallback(() => {
    onChange(0);
  }, [onChange]);

  // 是否处于动态模式
  const isDynamic = value === -1;
  // 是否处于关闭模式
  const isOff = value === 0;

  // 紧凑模式
  if (variant === 'compact') {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--text-secondary)] whitespace-nowrap">
          {t('modelParams.thinkingBudget')}:
        </span>
        <div className="flex items-center gap-1">
          {/* 动态按钮 */}
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetDynamic}
            className={`
              px-2 py-0.5 text-xs font-medium rounded transition-colors
              ${isDynamic
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={t('modelParams.thinkingBudgetDynamicDesc')}
          >
            {t('modelParams.thinkingBudgetDynamic')}
          </button>
          {/* 关闭按钮（仅当 canDisable 为 true 时显示） */}
          {canDisable && (
            <button
              type="button"
              disabled={disabled}
              onClick={handleSetOff}
              className={`
                px-2 py-0.5 text-xs font-medium rounded transition-colors
                ${isOff
                  ? 'bg-[var(--color-primary-500)] text-white'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
              title={t('modelParams.thinkingBudgetOffDesc')}
            >
              {t('modelParams.thinkingBudgetOff')}
            </button>
          )}
        </div>
        {/* 当前值显示 */}
        <span className="text-xs text-[var(--text-primary)] font-medium min-w-[50px] text-right">
          {formatDisplayValue(value)}
        </span>
      </div>
    );
  }

  // 完整模式
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-[var(--text-primary)]">
          {t('modelParams.thinkingBudget')}
        </label>
        <span className="text-sm text-[var(--text-secondary)]">
          {formatDisplayValue(value)}
          {!isDynamic && !isOff && ` ${t('modelParams.thinkingBudgetTokens')}`}
        </span>
      </div>

      {/* 快捷按钮 */}
      <div className="flex gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleSetDynamic}
          className={`
            flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
            ${isDynamic
              ? 'bg-[var(--color-primary-500)] text-white'
              : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={t('modelParams.thinkingBudgetDynamicDesc')}
        >
          {t('modelParams.thinkingBudgetDynamic')}
        </button>
        {canDisable && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleSetOff}
            className={`
              flex-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
              ${isOff
                ? 'bg-[var(--color-primary-500)] text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-primary)]'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
            title={t('modelParams.thinkingBudgetOffDesc')}
          >
            {t('modelParams.thinkingBudgetOff')}
          </button>
        )}
      </div>

      {/* 滑块 - 始终可用，拖动时自动切换到手动模式 */}
      <div className="space-y-1">
        <input
          type="range"
          min={sliderMin}
          max={max}
          step={128}
          value={sliderValue}
          onChange={handleSliderChange}
          disabled={disabled}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer
            bg-[var(--bg-tertiary)]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[var(--color-primary-500)]
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:hover:scale-110
            [&::-moz-range-thumb]:w-4
            [&::-moz-range-thumb]:h-4
            [&::-moz-range-thumb]:rounded-full
            [&::-moz-range-thumb]:bg-[var(--color-primary-500)]
            [&::-moz-range-thumb]:border-0
            [&::-moz-range-thumb]:cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        />
        <div className="flex justify-between text-xs text-[var(--text-tertiary)]">
          <span>{canDisable ? '0' : min.toLocaleString()}</span>
          <span>{max.toLocaleString()}</span>
        </div>
      </div>

      {/* 说明文字 */}
      <p className="text-xs text-[var(--text-tertiary)]">
        {isDynamic
          ? t('modelParams.thinkingBudgetDynamicDesc')
          : isOff
          ? t('modelParams.thinkingBudgetOffDesc')
          : t('modelParams.thinkingBudgetManualDesc', { count: value.toLocaleString() })}
      </p>
    </div>
  );
};

export default ThinkingBudgetSlider;
