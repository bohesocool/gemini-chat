/**
 * 音频电平指示器组件
 * 需求: 3.5, 4.4
 * 
 * 实现音频电平可视化，支持输入/输出两种类型
 */

import { useMemo } from 'react';

/**
 * 音频电平指示器属性
 */
export interface AudioLevelIndicatorProps {
  /** 音频电平 (0-1) */
  level: number;
  /** 是否激活 */
  isActive: boolean;
  /** 类型：输入（麦克风）或输出（扬声器） */
  type: 'input' | 'output';
  /** 条形数量 */
  barCount?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 音频电平指示器组件
 * 使用条形图可视化音频电平
 */
export function AudioLevelIndicator({
  level,
  isActive,
  type,
  barCount = 5,
  className = '',
}: AudioLevelIndicatorProps): JSX.Element {
  // 计算每个条形的激活状态
  const bars = useMemo(() => {
    const activeBars = Math.round(level * barCount);
    return Array.from({ length: barCount }, (_, index) => ({
      index,
      isActive: isActive && index < activeBars,
    }));
  }, [level, barCount, isActive]);

  // 根据类型选择颜色
  const activeColor = type === 'input'
    ? 'bg-primary-500'
    : 'bg-blue-500';

  const inactiveColor = 'bg-neutral-300 dark:bg-neutral-600';

  return (
    <div
      className={`flex items-end gap-0.5 h-4 ${className}`}
      role="meter"
      aria-label={type === 'input' ? '输入音频电平' : '输出音频电平'}
      aria-valuenow={Math.round(level * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {bars.map((bar) => (
        <div
          key={bar.index}
          className={`
            w-1 rounded-sm transition-all duration-75
            ${bar.isActive ? activeColor : inactiveColor}
          `}
          style={{
            // 条形高度递增，创造波形效果
            height: `${((bar.index + 1) / barCount) * 100}%`,
            opacity: bar.isActive ? 1 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

/**
 * 圆形音频电平指示器
 * 用于更紧凑的显示场景
 */
export interface CircularAudioLevelProps {
  /** 音频电平 (0-1) */
  level: number;
  /** 是否激活 */
  isActive: boolean;
  /** 类型：输入（麦克风）或输出（扬声器） */
  type: 'input' | 'output';
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * 圆形音频电平指示器
 * 使用脉冲动画显示音频活动
 */
export function CircularAudioLevel({
  level,
  isActive,
  type,
  size = 'md',
  className = '',
}: CircularAudioLevelProps): JSX.Element {
  // 尺寸映射
  const sizeClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-6 h-6',
  };

  // 根据类型选择颜色
  const activeColor = type === 'input'
    ? 'bg-primary-500'
    : 'bg-blue-500';

  const inactiveColor = 'bg-neutral-400 dark:bg-neutral-500';

  // 计算脉冲动画的缩放比例
  const pulseScale = isActive ? 1 + level * 0.5 : 1;

  return (
    <div
      className={`relative ${sizeClasses[size]} ${className}`}
      role="meter"
      aria-label={type === 'input' ? '输入音频电平' : '输出音频电平'}
      aria-valuenow={Math.round(level * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {/* 脉冲效果层 */}
      {isActive && level > 0.1 && (
        <div
          className={`absolute inset-0 rounded-full ${activeColor} opacity-30`}
          style={{
            transform: `scale(${pulseScale})`,
            transition: 'transform 100ms ease-out',
          }}
        />
      )}
      {/* 主圆点 */}
      <div
        className={`
          absolute inset-0 rounded-full transition-colors duration-150
          ${isActive ? activeColor : inactiveColor}
        `}
      />
    </div>
  );
}

/**
 * 波形音频电平指示器
 * 使用动态波形显示音频活动
 */
export interface WaveformAudioLevelProps {
  /** 音频电平 (0-1) */
  level: number;
  /** 是否激活 */
  isActive: boolean;
  /** 类型：输入（麦克风）或输出（扬声器） */
  type: 'input' | 'output';
  /** 波形条数量 */
  waveCount?: number;
  /** 自定义类名 */
  className?: string;
}

/**
 * 波形音频电平指示器
 * 使用动态波形条显示音频活动
 */
export function WaveformAudioLevel({
  level,
  isActive,
  type,
  waveCount = 4,
  className = '',
}: WaveformAudioLevelProps): JSX.Element {
  // 根据类型选择颜色
  const activeColor = type === 'input'
    ? 'bg-primary-500'
    : 'bg-blue-500';

  const inactiveColor = 'bg-neutral-300 dark:bg-neutral-600';

  // 生成波形条
  const waves = useMemo(() => {
    return Array.from({ length: waveCount }, (_, index) => {
      // 为每个条形添加不同的相位偏移，创造波动效果
      const phaseOffset = index * 0.2;
      const baseHeight = 0.3;
      const dynamicHeight = isActive
        ? baseHeight + level * 0.7 * Math.sin((Date.now() / 200) + phaseOffset * Math.PI)
        : baseHeight;

      return {
        index,
        height: Math.max(0.2, Math.min(1, Math.abs(dynamicHeight))),
      };
    });
  }, [level, isActive, waveCount]);

  return (
    <div
      className={`flex items-center gap-0.5 h-5 ${className}`}
      role="meter"
      aria-label={type === 'input' ? '输入音频电平' : '输出音频电平'}
      aria-valuenow={Math.round(level * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {waves.map((wave) => (
        <div
          key={wave.index}
          className={`
            w-0.5 rounded-full transition-all duration-100
            ${isActive ? activeColor : inactiveColor}
          `}
          style={{
            height: `${wave.height * 100}%`,
            opacity: isActive ? 0.8 + level * 0.2 : 0.4,
          }}
        />
      ))}
    </div>
  );
}

export default AudioLevelIndicator;
