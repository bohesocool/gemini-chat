/**
 * 响应式布局 Hook
 * 
 * Requirements: 4.1
 */

import { useState, useEffect, useCallback } from 'react';

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
  /** 是否为桌面端（> 1024px） */
  isDesktop: boolean;
  /** 侧边栏是否打开 */
  sidebarOpen: boolean;
  /** 切换侧边栏 */
  toggleSidebar: () => void;
  /** 关闭侧边栏 */
  closeSidebar: () => void;
  /** 打开侧边栏 */
  openSidebar: () => void;
  /** 当前视口宽度 */
  viewportWidth: number;
}

// ============ Hook 实现 ============

/**
 * 响应式布局 Hook
 * 
 * 提供设备类型检测和侧边栏状态管理
 * 
 * Requirements:
 * - 4.1: 实现 isMobile、isTablet、isDesktop 状态
 * - 4.1: 实现 sidebarOpen 状态和 toggleSidebar 方法
 * 
 * @returns 响应式状态和方法
 */
export function useResponsive(): UseResponsiveReturn {
  // 获取初始视口宽度
  const getViewportWidth = () => {
    if (typeof window === 'undefined') return TABLET_BREAKPOINT;
    return window.innerWidth;
  };

  // 视口宽度状态
  const [viewportWidth, setViewportWidth] = useState(getViewportWidth);
  
  // 侧边栏状态（移动端默认关闭，桌面端默认打开）
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const width = getViewportWidth();
    return width >= MOBILE_BREAKPOINT;
  });

  // 计算设备类型
  const isMobile = viewportWidth < MOBILE_BREAKPOINT;
  const isTablet = viewportWidth >= MOBILE_BREAKPOINT && viewportWidth < TABLET_BREAKPOINT;
  const isDesktop = viewportWidth >= TABLET_BREAKPOINT;

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      const newWidth = window.innerWidth;
      setViewportWidth(newWidth);
      
      // 当从移动端切换到桌面端时，自动打开侧边栏
      // 当从桌面端切换到移动端时，自动关闭侧边栏
      if (newWidth >= MOBILE_BREAKPOINT && viewportWidth < MOBILE_BREAKPOINT) {
        setSidebarOpen(true);
      } else if (newWidth < MOBILE_BREAKPOINT && viewportWidth >= MOBILE_BREAKPOINT) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [viewportWidth]);

  // 切换侧边栏
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // 关闭侧边栏
  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  // 打开侧边栏
  const openSidebar = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    viewportWidth,
  };
}

// ============ 辅助 Hook ============

/**
 * 滑动手势 Hook
 * 
 * Requirements: 4.4
 * 
 * @param onSwipeLeft - 左滑回调
 * @param onSwipeRight - 右滑回调
 * @param threshold - 滑动阈值（像素）
 */
export function useSwipeGesture(
  onSwipeLeft?: () => void,
  onSwipeRight?: () => void,
  threshold: number = 50
) {
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  // 处理触摸开始
  const handleTouchStart = useCallback((e: TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchEnd(null);
      setTouchStart(touch.clientX);
    }
  }, []);

  // 处理触摸移动
  const handleTouchMove = useCallback((e: TouchEvent) => {
    const touch = e.targetTouches[0];
    if (touch) {
      setTouchEnd(touch.clientX);
    }
  }, []);

  // 处理触摸结束
  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > threshold;
    const isRightSwipe = distance < -threshold;
    
    if (isLeftSwipe && onSwipeLeft) {
      onSwipeLeft();
    }
    if (isRightSwipe && onSwipeRight) {
      onSwipeRight();
    }
  }, [touchStart, touchEnd, threshold, onSwipeLeft, onSwipeRight]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);
}

export default useResponsive;
