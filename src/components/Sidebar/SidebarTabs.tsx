/**
 * 侧边栏标签页组件
 * 实现三个标签页：助手、话题、设置
 * 需求: 4.1, 4.2
 */

import React from 'react';
import { durations, easings, touchTargets } from '../../design/tokens';
import { useTranslation } from '../../i18n/useTranslation';

// ============ 类型定义 ============

/** 侧边栏标签页 ID */
export type SidebarTabId = 'assistants' | 'topics' | 'settings';

/** 标签页配置 */
export interface SidebarTab {
  /** 标签 ID */
  id: SidebarTabId;
  /** 显示标签 */
  label: string;
  /** 图标组件 */
  icon: React.ReactNode;
}

/** SidebarTabs 组件属性 */
export interface SidebarTabsProps {
  /** 当前激活的标签 */
  activeTab: SidebarTabId;
  /** 标签切换回调 */
  onTabChange: (tab: SidebarTabId) => void;
}

// ============ 常量定义 ============

/** 标签页配置列表（用于导出，但不包含翻译） */
export const SIDEBAR_TABS: SidebarTab[] = [
  { id: 'assistants', label: '助手', icon: <ChatIcon /> },
  { id: 'topics', label: '话题', icon: <TopicsIcon /> },
  { id: 'settings', label: '设置', icon: <SettingsIcon /> },
];

// ============ 主组件 ============

/**
 * 侧边栏标签页组件
 * 使用主题色高亮当前标签，添加标签切换动画
 */
export function SidebarTabs({ activeTab, onTabChange }: SidebarTabsProps) {
  const { t } = useTranslation();
  
  // 动态生成带翻译的标签配置
  const tabs: SidebarTab[] = [
    { id: 'assistants', label: t('sidebar.assistants'), icon: <ChatIcon /> },
    { id: 'topics', label: t('sidebar.topics'), icon: <TopicsIcon /> },
    { id: 'settings', label: t('sidebar.settings'), icon: <SettingsIcon /> },
  ];
  
  return (
    <div 
      className="flex border-b border-neutral-200 dark:border-neutral-700 bg-neutral-100/50 dark:bg-neutral-800/50"
      role="tablist"
      aria-label={t('sidebar.sidebarNav')}
    >
      {tabs.map((tab) => (
        <SidebarTabButton
          key={tab.id}
          tab={tab}
          isActive={activeTab === tab.id}
          onClick={() => onTabChange(tab.id)}
        />
      ))}
    </div>
  );
}

// ============ 子组件 ============

interface SidebarTabButtonProps {
  tab: SidebarTab;
  isActive: boolean;
  onClick: () => void;
}

/**
 * 单个标签按钮组件
 */
function SidebarTabButton({ tab, isActive, onClick }: SidebarTabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5
        text-sm font-medium relative
        transition-all touch-manipulation
        ${isActive 
          ? 'text-primary-600 dark:text-primary-400' 
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-300 hover:bg-neutral-200/50 dark:hover:bg-neutral-700/50'
        }
      `}
      style={{ 
        minHeight: touchTargets.minimum,
        transitionDuration: durations.fast,
        transitionTimingFunction: easings.easeOut,
      }}
      role="tab"
      aria-selected={isActive}
      aria-controls={`tabpanel-${tab.id}`}
    >
      {/* 图标 */}
      <span className={`
        h-4 w-4 flex-shrink-0
        transition-transform
        ${isActive ? 'scale-110' : 'scale-100'}
      `}
        style={{ 
          transitionDuration: durations.fast,
          transitionTimingFunction: easings.easeOut,
        }}
      >
        {tab.icon}
      </span>
      
      {/* 标签文字 */}
      <span>{tab.label}</span>
      
      {/* 激活指示器 - 底部高亮条 */}
      <span 
        className={`
          absolute bottom-0 left-0 right-0 h-0.5
          bg-primary-500 dark:bg-primary-400
          transition-all origin-center
          ${isActive ? 'scale-x-100 opacity-100' : 'scale-x-0 opacity-0'}
        `}
        style={{ 
          transitionDuration: durations.normal,
          transitionTimingFunction: easings.easeOut,
        }}
      />
    </button>
  );
}

// ============ 图标组件 ============

/** 聊天/助手图标 */
function ChatIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" 
      />
    </svg>
  );
}

/** 话题图标 */
function TopicsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" 
      />
    </svg>
  );
}

/** 设置图标 */
function SettingsIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" 
      />
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
      />
    </svg>
  );
}

export default SidebarTabs;
