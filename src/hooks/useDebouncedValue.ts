/**
 * 防抖值 Hook
 * 将高频变化的值转换为低频更新的值，用于减少昂贵渲染的触发频率
 *
 * 核心逻辑：trailing edge debounce
 * - 每次 value 变化时重置定时器
 * - 在 delay 毫秒后才更新防抖值
 * - immediate 为 true 时跳过防抖直接返回最新值
 *
 * 需求: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2
 */

import { useState, useEffect, useRef } from 'react';

/**
 * 防抖值 Hook
 * 将高频变化的值转换为低频更新的值，用于减少昂贵渲染的触发频率
 *
 * @param value - 原始高频变化的值
 * @param delay - 防抖延迟（毫秒）
 * @param immediate - 是否立即刷新（用于流式结束时强制同步）
 * @returns 防抖后的值
 */
export function useDebouncedValue<T>(value: T, delay: number, immediate?: boolean): T {
  // 存储防抖后的值
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // 存储定时器引用，用于清理和重置
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // 当 immediate 为 true 时，跳过防抖直接更新值
    // 用于流式结束时（isSending=false）强制同步最终内容
    if (immediate) {
      // 清理可能存在的待处理定时器
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      setDebouncedValue(value);
      return;
    }

    // trailing edge debounce：
    // 每次 value 变化时重置定时器，在 delay 毫秒后更新防抖值
    timerRef.current = setTimeout(() => {
      setDebouncedValue(value);
      timerRef.current = null;
    }, delay);

    // cleanup：组件卸载或依赖变化时清理定时器，防止内存泄漏
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, delay, immediate]);

  return debouncedValue;
}
