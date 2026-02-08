/**
 * 侧边栏响应式驱动 Hook
 * 需求: 2.1, 2.2, 2.3, 2.4
 *
 * 监听视口变化，在移动端/桌面端切换时自动调整侧边栏状态。
 * 仅在 Layout 组件中调用一次。
 *
 * 逻辑说明：
 * - 使用 useIsMobile() 检测当前设备类型
 * - 使用 useRef 追踪上一次的 isMobile 值，检测断点跨越
 * - 移动端 → 桌面端：从持久化存储恢复用户偏好
 * - 桌面端 → 移动端：强制折叠侧边栏
 * - 首次加载移动端：强制折叠
 * - 首次加载桌面端：使用持久化值（Store 初始化已处理）
 */

import { useEffect, useRef } from 'react';
import { useIsMobile } from './useIsMobile';
import { useSettingsStore } from '../stores/settings';

/**
 * 侧边栏响应式驱动 Hook
 * 监听视口变化，在移动端/桌面端切换时自动调整侧边栏状态
 * 仅在 Layout 组件中调用一次
 */
export function useSidebarResponsive(): void {
  const isMobile = useIsMobile();
  const prevIsMobileRef = useRef<boolean | null>(null);
  const { setSidebarCollapsed, loadSettings } = useSettingsStore();

  useEffect(() => {
    const prevIsMobile = prevIsMobileRef.current;

    if (prevIsMobile === null) {
      // 首次加载
      if (isMobile) {
        // 首次加载且为移动端：强制折叠（需求 2.1）
        setSidebarCollapsed(true);
      }
      // 首次加载且为桌面端：Store 初始化已从持久化存储恢复，无需额外操作（需求 2.2）
    } else if (prevIsMobile !== isMobile) {
      // 断点跨越发生
      if (prevIsMobile && !isMobile) {
        // 移动端 → 桌面端：从持久化存储恢复用户偏好（需求 2.4）
        loadSettings();
      } else if (!prevIsMobile && isMobile) {
        // 桌面端 → 移动端：强制折叠（需求 2.3）
        setSidebarCollapsed(true);
      }
    }

    // 更新上一次的 isMobile 值
    prevIsMobileRef.current = isMobile;
  }, [isMobile, setSidebarCollapsed, loadSettings]);
}
