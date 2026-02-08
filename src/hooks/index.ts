/**
 * 自定义 Hooks 导出
 * 需求: 5.1 - 提供集中的 Hooks 导出
 */

export { useStreamingState } from './useStreamingState';
export type { UseStreamingStateReturn } from './useStreamingState';

export { useSendMessage } from './useSendMessage';
export type { UseSendMessageOptions, UseSendMessageReturn } from './useSendMessage';

// 侧边栏状态统一相关 Hooks（需求: 3.1, 4.1）
export { useIsMobile } from './useIsMobile';
export { useSwipeGesture, SWIPE_CONFIG } from './useSwipeGesture';
export type { SwipeConfig } from './useSwipeGesture';
export { useViewportHeight } from './useViewportHeight';
export { useSidebarResponsive } from './useSidebarResponsive';
