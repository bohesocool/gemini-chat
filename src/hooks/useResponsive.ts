/**
 * 响应式布局 Hook
 * 
 * 仅提供设备类型检测和视口宽度信息。
 * 侧边栏状态已统一到 Settings Store（单一真实来源）。
 * 滑动手势功能已提取到独立的 useSwipeGesture Hook。
 * 
 * Requirements: 1.4, 4.4
 */

import { useState, useEffect } from 'react';

// ============ 断点常量 ============

/** 移动端断点（小于此值为移动端） */
export const MOBILE_BREAKPOINT = 768;

/** 平板断点（小于此值为平板） */
export const TABLET_BREAKPOINT = 1024;

// ============ 类型定义 ============

export interface UseResponsiveReturn {
  /** 是否为移动端（< 768px） */
  isMobile: boolean;
  /** 是否为平板（768px - 1024px） */
  isTablet: boolean;
  /** 是否为桌面端（>= 1024px） */
  isDesktop: boolean;
  /** 当前视口宽度 */
  viewportWidth: number;
}

// ============ Hook 实现 ============

/**
 * 响应式布局 Hook
 * 
 * 提供设备类型检测和视口宽度信息。
 * 侧边栏状态管理已移至 Settings Store，请使用 useSettingsStore 获取。
 * 
 * @returns 响应式状态（设备类型和视口宽度）
 */
export function useResponsive(): UseResponsiveReturn {
  // 获取初始视口宽度
  const getViewportWidth = () => {
    if (typeof window === 'undefined') return TABLET_BREAKPOINT;
    return window.innerWidth;
  };

  // 视口宽度状态
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);

  // 计算设备类型
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT;
  const isDesktop = viewportWidth >= TABLET_BREAKPOINT;

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    viewportWidth,
  };
}

export default useResponsive;
