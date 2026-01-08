/**
 * 设置面板组件
 * 使用固定尺寸容器，左侧固定导航栏，右侧可滚动内容区
 * 移动端使用全屏模式
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 10.2
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { durationValues, easings, breakpointValues, touchTargets } from '../../design/tokens';
import { useReducedMotion } from '../motion';

// ============================================
// 类型定义
// ============================================

export type SettingsTabId = 'appearance' | 'api' | 'model' | 'generation' | 'system' | 'safety' | 'data' | 'about';

export interface SettingsTab {
  /** 标签 ID */
  id: SettingsTabId;
  /** 显示标签 */
  label: string;
  /** 图标组件 */
  icon: React.ReactNode;
}

export interface SettingsPanelProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 初始激活的标签 */
  initialTab?: SettingsTabId;
  /** 渲染各个设置分类的内容 */
  renderContent: (tabId: SettingsTabId) => React.ReactNode;
}

// ============================================
// 常量定义
// ============================================

/** 设置面板固定尺寸 */
export const SETTINGS_PANEL_SIZE = {
  width: 800,
  height: 600,
  navWidth: 200,
  mobileNavWidth: 160,
} as const;

/**
 * 自定义 Hook：检测是否为移动端
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpointValues.md : false
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < breakpointValues.md);
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

/** 设置标签配置 */
export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'api', label: 'API 配置', icon: <KeyIcon /> },
  { id: 'model', label: '模型选择', icon: <CpuIcon /> },
  { id: 'generation', label: '生成参数', icon: <SlidersIcon /> },
  { id: 'system', label: '系统指令', icon: <MessageIcon /> },
  { id: 'safety', label: '安全设置', icon: <ShieldIcon /> },
  { id: 'data', label: '数据管理', icon: <DatabaseIcon /> },
  { id: 'about', label: '关于', icon: <InfoIcon /> },
];

// ============================================
// SettingsPanel 组件
// ============================================

/**
 * 设置面板组件
 * 
 * Requirements:
 * - 3.1: 使用固定尺寸的容器（桌面端：宽度 800px，高度 600px）
 * - 3.4: 在左侧显示固定宽度的导航栏（200px）
 * - 3.5: 在右侧显示可滚动的内容区域
 */
export function SettingsPanel({
  isOpen,
  onClose,
  initialTab = 'api',
  renderContent,
}: SettingsPanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [shouldRender, setShouldRender] = useState(false);
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [contentAnimationState, setContentAnimationState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  const duration = prefersReducedMotion ? 0 : durationValues.normal;
  const contentDuration = prefersReducedMotion ? 0 : durationValues.fast;

  // 处理打开/关闭动画
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      setShouldRender(true);

      requestAnimationFrame(() => {
        setAnimationState('entering');

        const timer = setTimeout(() => {
          setAnimationState('entered');
          panelRef.current?.focus();
        }, duration);

        return () => clearTimeout(timer);
      });
    } else if (shouldRender) {
      setAnimationState('exiting');

      const timer = setTimeout(() => {
        setAnimationState('exited');
        setShouldRender(false);
        if (previousActiveElement.current instanceof HTMLElement) {
          previousActiveElement.current.focus();
        }
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, shouldRender]);

  // 处理 ESC 键关闭
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 锁定背景滚动
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // 处理标签切换（带动画）
  const handleTabChange = useCallback((tabId: SettingsTabId) => {
    if (tabId === activeTab || contentAnimationState !== 'idle') return;

    if (prefersReducedMotion) {
      // 无动画直接切换
      setActiveTab(tabId);
    } else {
      // 带动画切换
      setContentAnimationState('exiting');

      setTimeout(() => {
        setActiveTab(tabId);
        setContentAnimationState('entering');

        setTimeout(() => {
          setContentAnimationState('idle');
        }, contentDuration);
      }, contentDuration);
    }
  }, [activeTab, contentAnimationState, prefersReducedMotion, contentDuration]);

  // 处理遮罩点击
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!shouldRender) {
    return null;
  }

  // 计算遮罩样式
  const getOverlayStyles = (): React.CSSProperties => {
    const isAnimating = animationState === 'entering' || animationState === 'exiting';

    return {
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      opacity: animationState === 'entering' || animationState === 'exited' ? 0 : 1,
      transition: isAnimating ? `opacity ${duration}ms ${easings.easeOut}` : undefined,
    };
  };

  // 计算面板样式
  const getPanelStyles = (): React.CSSProperties => {
    const isAnimating = animationState === 'entering' || animationState === 'exiting';
    const isHidden = animationState === 'entering' || animationState === 'exited';

    // 移动端全屏模式
    if (isMobile) {
      return {
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: '0',
        boxShadow: 'none',
        outline: 'none',
        overflow: 'hidden',
        opacity: isHidden ? 0 : 1,
        transform: isHidden ? 'translateY(20px)' : 'translateY(0)',
        transition: isAnimating
          ? `opacity ${duration}ms ${easings.easeOut}, transform ${duration}ms ${easings.easeOut}`
          : undefined,
      };
    }

    // 桌面端固定尺寸
    return {
      width: `${SETTINGS_PANEL_SIZE.width}px`,
      height: `${SETTINGS_PANEL_SIZE.height}px`,
      maxWidth: '95vw',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '12px',
      boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
      outline: 'none',
      overflow: 'hidden',
      opacity: isHidden ? 0 : 1,
      transform: isHidden ? 'scale(0.95)' : 'scale(1)',
      transition: isAnimating
        ? `opacity ${duration}ms ${easings.easeOut}, transform ${duration}ms ${easings.easeOut}`
        : undefined,
    };
  };

  // 计算内容区域动画样式
  const getContentStyles = (): React.CSSProperties => {
    if (contentAnimationState === 'idle') {
      return { opacity: 1, transform: 'translateX(0)' };
    }

    if (contentAnimationState === 'exiting') {
      return {
        opacity: 0,
        transform: 'translateX(-10px)',
        transition: `all ${contentDuration}ms ${easings.easeIn}`,
      };
    }

    // entering
    return {
      opacity: 1,
      transform: 'translateX(0)',
      transition: `all ${contentDuration}ms ${easings.easeOut}`,
    };
  };

  const panelContent = (
    <div
      style={getOverlayStyles()}
      onClick={handleOverlayClick}
      role="presentation"
    >
      <div
        ref={panelRef}
        style={getPanelStyles()}
        className="bg-white dark:bg-slate-800"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        tabIndex={-1}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2
            id="settings-title"
            className="text-lg md:text-xl font-semibold text-slate-900 dark:text-slate-100"
          >
            设置
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors touch-manipulation"
            style={{ minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
            aria-label="关闭设置"
          >
            <CloseIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* 内容区域 - 左右布局（移动端使用更窄的导航栏） */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧导航栏 */}
          <nav
            className="flex-shrink-0 border-r border-slate-200 dark:border-slate-700 p-2 md:p-4 space-y-1 overflow-y-auto"
            style={{ width: isMobile ? `${SETTINGS_PANEL_SIZE.mobileNavWidth}px` : `${SETTINGS_PANEL_SIZE.navWidth}px` }}
          >
            {SETTINGS_TABS.map((tab) => (
              <SettingsTabButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => handleTabChange(tab.id)}
                isMobile={isMobile}
              />
            ))}
          </nav>

          {/* 右侧内容区 */}
          <div
            className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar"
            style={getContentStyles()}
          >
            {renderContent(activeTab)}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

// ============================================
// SettingsTabButton 组件
// ============================================

interface SettingsTabButtonProps {
  tab: SettingsTab;
  isActive: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

function SettingsTabButton({ tab, isActive, onClick, isMobile = false }: SettingsTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 md:gap-3 w-full px-2 md:px-3 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors touch-manipulation
        ${isActive
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }
      `}
      style={{ minHeight: touchTargets.minimum }}
      aria-selected={isActive}
      role="tab"
    >
      <span className="h-4 w-4 flex-shrink-0">{tab.icon}</span>
      <span className={isMobile ? 'truncate' : ''}>{tab.label}</span>
    </button>
  );
}

// ============================================
// 图标组件
// ============================================

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// ============================================
// 导出
// ============================================

export default SettingsPanel;
