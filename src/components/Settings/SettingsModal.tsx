/**
 * 毛玻璃效果设置模态框
 * 使用 backdrop-filter 实现模糊背景效果
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { durationValues, easings, touchTargets } from '../../design/tokens';
import { useReducedMotion } from '../motion';
import { useIsMobile } from '../../hooks/useIsMobile';
import { useTranslation } from '../../i18n';
import type { TranslateFunction } from '../../i18n';
import type { SettingsTabId, SettingsTab } from './SettingsPanel';

// ============================================
// 类型定义
// ============================================

export interface SettingsModalProps {
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

/** 设置模态框尺寸 */
export const SETTINGS_MODAL_SIZE = {
  width: 800,
  height: 600,
  navWidth: 200,
  mobileNavWidth: 160,
} as const;

/**
 * 获取设置标签配置
 * 使用翻译函数动态生成标签名称
 * @param t 翻译函数
 * @returns 设置标签配置数组
 */
export function getSettingsTabs(t: TranslateFunction): SettingsTab[] {
  return [
    { id: 'appearance', label: t('settings.appearance'), icon: <EyeIcon /> },
    { id: 'api', label: t('settings.apiConfig'), icon: <KeyIcon /> },
    { id: 'model', label: t('settings.modelSelect'), icon: <CpuIcon /> },
    { id: 'generation', label: t('settings.generation'), icon: <SlidersIcon /> },
    { id: 'system', label: t('settings.systemInstruction'), icon: <MessageIcon /> },
    { id: 'safety', label: t('settings.safety'), icon: <ShieldIcon /> },
    { id: 'data', label: t('settings.dataManagement'), icon: <DatabaseIcon /> },
    { id: 'about', label: t('settings.about'), icon: <InfoIcon /> },
  ];
}

/**
 * @deprecated 使用 getSettingsTabs(t) 代替
 * 保留此常量以保持向后兼容性
 */
export const SETTINGS_TABS: SettingsTab[] = [
  { id: 'appearance', label: '外观设置', icon: <EyeIcon /> },
  { id: 'api', label: 'API 配置', icon: <KeyIcon /> },
  { id: 'model', label: '模型选择', icon: <CpuIcon /> },
  { id: 'generation', label: '生成参数', icon: <SlidersIcon /> },
  { id: 'system', label: '系统指令', icon: <MessageIcon /> },
  { id: 'safety', label: '安全设置', icon: <ShieldIcon /> },
  { id: 'data', label: '数据管理', icon: <DatabaseIcon /> },
  { id: 'about', label: '关于', icon: <InfoIcon /> },
];

// ============================================
// SettingsModal 组件
// ============================================

/**
 * 毛玻璃效果设置模态框
 * 
 * Requirements:
 * - 2.1: 点击设置按钮弹出带有毛玻璃效果的设置面板
 * - 2.2: 使用 backdrop-filter: blur() 实现毛玻璃效果
 * - 2.3: 设置面板背景使用半透明颜色配合模糊效果
 * - 2.4: 以模态弹窗形式显示
 * - 2.5: 点击外部区域关闭设置面板
 */
export function SettingsModal({
  isOpen,
  onClose,
  initialTab = 'api',
  renderContent,
}: SettingsModalProps) {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [shouldRender, setShouldRender] = useState(false);
  const [animationState, setAnimationState] = useState<'entering' | 'entered' | 'exiting' | 'exited'>('exited');
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);
  const [contentAnimationState, setContentAnimationState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const panelRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<Element | null>(null);

  // 使用翻译函数动态生成设置标签
  const settingsTabs = useMemo(() => getSettingsTabs(t), [t]);

  // 使用更长的动画时间让过渡更平滑
  const duration = prefersReducedMotion ? 0 : 250;
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
      setActiveTab(tabId);
    } else {
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

  // 处理遮罩点击 - 点击外部关闭
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!shouldRender) {
    return null;
  }

  // 计算遮罩样式 - 毛玻璃效果，带平滑过渡
  const getOverlayStyles = (): React.CSSProperties => {
    const isHidden = animationState === 'entering' || animationState === 'exited';

    return {
      position: 'fixed',
      inset: 0,
      // 毛玻璃遮罩背景
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(4px)',
      WebkitBackdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 50,
      opacity: isHidden ? 0 : 1,
      // 始终应用过渡效果
      transition: `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
    };
  };

  // 计算面板样式 - 毛玻璃效果，带平滑过渡动画
  const getPanelStyles = (): React.CSSProperties => {
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
        // 毛玻璃效果
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        outline: 'none',
        overflow: 'hidden',
        opacity: isHidden ? 0 : 1,
        transform: isHidden ? 'translateY(20px)' : 'translateY(0)',
        // 始终应用过渡效果，使用更平滑的缓动
        transition: `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      };
    }

    // 桌面端固定尺寸 - 毛玻璃效果，带缩放动画
    return {
      width: `${SETTINGS_MODAL_SIZE.width}px`,
      height: `${SETTINGS_MODAL_SIZE.height}px`,
      maxWidth: '95vw',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '16px',
      // 毛玻璃效果
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
      outline: 'none',
      overflow: 'hidden',
      opacity: isHidden ? 0 : 1,
      transform: isHidden ? 'scale(0.95) translateY(10px)' : 'scale(1) translateY(0)',
      // 始终应用过渡效果，使用更平滑的缓动
      transition: `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
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
        className="bg-white/80 dark:bg-neutral-900/80 border border-white/20 dark:border-neutral-700/50"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        tabIndex={-1}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-neutral-200/50 dark:border-neutral-700/50 flex-shrink-0 bg-white/50 dark:bg-neutral-800/50">
          <h2
            id="settings-modal-title"
            className="text-lg md:text-xl font-semibold text-neutral-900 dark:text-neutral-100"
          >
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100/80 dark:hover:bg-neutral-700/80 transition-colors touch-manipulation"
            style={{ minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
            aria-label={t('settings.closeSettings')}
          >
            <CloseIcon className="h-5 w-5 text-neutral-500 dark:text-neutral-400" />
          </button>
        </div>

        {/* 内容区域 - 左右布局 */}
        <div className="flex flex-1 overflow-hidden">
          {/* 左侧导航栏 */}
          <nav
            className="flex-shrink-0 border-r border-neutral-200/50 dark:border-neutral-700/50 p-2 md:p-4 space-y-1 overflow-y-auto bg-neutral-50/50 dark:bg-neutral-800/30"
            style={{ width: isMobile ? `${SETTINGS_MODAL_SIZE.mobileNavWidth}px` : `${SETTINGS_MODAL_SIZE.navWidth}px` }}
          >
            {settingsTabs.map((tab) => (
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
          ? 'bg-primary-100/80 dark:bg-primary-900/50 text-primary-700 dark:text-white'
          : 'text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/80 dark:hover:bg-neutral-700/50'
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

function EyeIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
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

export default SettingsModal;
