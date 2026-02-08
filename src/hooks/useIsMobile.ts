/**
 * 公共 Hook：检测当前视口是否为移动端
 * 需求: 3.1, 3.4, 3.5
 *
 * 从 Layout.tsx 中提取的独立公共 Hook，
 * 使用 breakpointValues.md（768px）作为判断阈值，
 * 监听 resize 和 orientationchange 事件以实时更新状态。
 */

import { useState, useEffect } from 'react';
import { breakpointValues } from '../design/tokens';

/** 移动端断点阈值（px） */
const MOBILE_BREAKPOINT = breakpointValues.md; // 768px

/**
 * 检测当前视口是否为移动端
 * @returns 是否为移动端（视口宽度 < 768px）
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return isMobile;
}
