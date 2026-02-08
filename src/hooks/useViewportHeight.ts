/**
 * 公共 Hook：修复移动端浏览器视口高度问题
 * 需求: 5.2
 *
 * 从 Layout.tsx 中提取的独立公共 Hook，
 * 设置 CSS 变量 --vh 为真实视口高度的 1%，
 * 解决移动端浏览器地址栏导致的视口高度不准确问题。
 */

import { useEffect } from 'react';

/**
 * 修复移动端浏览器视口高度问题
 * 设置 CSS 变量 --vh 为真实视口高度的 1%
 */
export function useViewportHeight(): void {
  useEffect(() => {
    // 设置真实视口高度的 CSS 变量
    const setViewportHeight = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty('--vh', `${vh}px`);
    };

    // 初始设置
    setViewportHeight();

    // 监听窗口大小变化和方向变化
    window.addEventListener('resize', setViewportHeight);
    window.addEventListener('orientationchange', setViewportHeight);

    // 某些移动端浏览器在滚动时会改变视口高度，需要延迟处理
    let timeoutId: ReturnType<typeof setTimeout>;
    const debouncedSetHeight = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(setViewportHeight, 100);
    };
    window.addEventListener('scroll', debouncedSetHeight);

    return () => {
      window.removeEventListener('resize', setViewportHeight);
      window.removeEventListener('orientationchange', setViewportHeight);
      window.removeEventListener('scroll', debouncedSetHeight);
      clearTimeout(timeoutId);
    };
  }, []);
}
