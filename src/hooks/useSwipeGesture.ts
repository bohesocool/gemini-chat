/**
 * 触摸手势 Hook
 * 从 Layout.tsx 中提取的公共 Hook，用于处理触摸滑动手势
 * 需求: 4.1, 4.3
 */

import { useEffect, useRef, useCallback } from 'react';

/**
 * 滑动手势配置接口
 */
export interface SwipeConfig {
  /** 滑动阈值（像素），默认 50 */
  threshold?: number;
  /** 边缘宽度（像素），默认 20 */
  edgeWidth?: number;
  /** 最大滑动时间（毫秒），默认 300 */
  maxTime?: number;
}

/**
 * 默认滑动手势配置
 */
export const SWIPE_CONFIG: Required<SwipeConfig> = {
  threshold: 50,
  edgeWidth: 20,
  maxTime: 300,
};

/**
 * 触摸手势 Hook
 * 监听 document 上的 touchstart/touchend 事件，检测水平滑动手势
 * 右滑（从左边缘开始）触发 onSwipeRight，左滑触发 onSwipeLeft
 *
 * @param onSwipeLeft - 左滑回调
 * @param onSwipeRight - 右滑回调
 * @param enabled - 是否启用，默认 true
 * @param config - 滑动配置，可覆盖默认值
 */
export function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled: boolean = true,
  config?: SwipeConfig
): void {
  // 合并用户配置与默认配置
  const mergedConfig: Required<SwipeConfig> = {
    ...SWIPE_CONFIG,
    ...config,
  };

  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);

  // 使用 ref 保存合并后的配置，避免在依赖数组中引用对象
  const configRef = useRef(mergedConfig);
  configRef.current = mergedConfig;

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isEdgeSwipe.current = touch.clientX <= configRef.current.edgeWidth;
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const deltaTime = Date.now() - (touchStartTime.current || 0);

    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isValidSwipe =
      Math.abs(deltaX) >= configRef.current.threshold &&
      deltaTime <= configRef.current.maxTime;

    if (isHorizontalSwipe && isValidSwipe) {
      if (deltaX > 0 && isEdgeSwipe.current) {
        onSwipeRight();
      } else if (deltaX < 0) {
        onSwipeLeft();
      }
    }

    // 重置触摸状态
    touchStartX.current = null;
    touchStartY.current = null;
    touchStartTime.current = null;
    isEdgeSwipe.current = false;
  }, [enabled, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    if (!enabled) return;
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, handleTouchStart, handleTouchEnd]);
}
