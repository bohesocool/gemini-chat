/**
 * 应用主布局组件
 * 需求: 10.1, 10.2, 10.3, 10.4, 10.6, 11.1, 11.2, 11.3
 * 需求: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4 (设置模态框)
 * 
 * 实现三栏布局（参考图片风格）：
 * - 最左侧：窄的垂直图标导航栏（主题色背景）
 * - 中间：侧边栏内容区
 * - 右侧：主聊天区域
 */

import React, { useEffect, useState, useRef, useCallback, createContext, useContext } from 'react';
import { useSettingsStore } from '../stores/settings';
import { useChatWindowStore } from '../stores/chatWindow';
import { useTemplateStore } from '../stores/template';
import type { PromptTemplate, CreateTemplateInput, UpdateTemplateInput } from '../stores/template';
import { breakpointValues } from '../design/tokens';
import type { ThemeMode } from '../types/models';
import { SettingsModal } from './Settings/SettingsModal';
import type { SettingsTabId } from './Settings/SettingsPanel';
import {
  ApiConfigSection,
  ModelSelectSection,
  GenerationConfigSection,
  SystemInstructionSection,
  SafetySettingsSection,
  DataManagementSection,
} from './Settings/SettingsSections';
import { DebugPanel } from './Debug';
import { FullscreenGallery } from './Gallery/FullscreenGallery';
import { ImagePreviewModal } from './ImagePreviewModal';
import { TemplateDetailView } from './Sidebar/TemplateDetailView';
import { TemplateEditorModal } from './Sidebar/TemplateEditorModal';
import { BookmarkDetailView } from './Sidebar/BookmarkDetailView';
import { useBookmarkStore } from '../stores/bookmark';
import type { Bookmark } from '../stores/bookmark';
import type { GeneratedImage } from '../types';

/** 侧边栏视图类型 */
export type SidebarView = 'assistants' | 'settings' | 'images' | 'templates' | 'bookmarks';

/** 侧边栏上下文 */
interface SidebarContextType {
  currentView: SidebarView;
  setCurrentView: (view: SidebarView) => void;
  /** 选中的模板 ID */
  selectedTemplateId: string | null;
  setSelectedTemplateId: (id: string | null) => void;
  /** 选中的书签 ID */
  selectedBookmarkId: string | null;
  setSelectedBookmarkId: (id: string | null) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

/** 使用侧边栏上下文的 Hook */
export function useSidebarView() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebarView must be used within Layout');
  }
  return context;
}

interface LayoutProps {
  /** 侧边栏内容 */
  sidebar: React.ReactNode;
  /** 主内容区 */
  children: React.ReactNode;
}

/**
 * 获取当前实际应用的主题（考虑系统主题）
 */
function getEffectiveTheme(theme: ThemeMode): 'light' | 'dark' {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

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

/**
 * 自定义 Hook：修复移动端浏览器视口高度问题
 * 解决手机 Edge 等浏览器地址栏导致 100vh 不准确的问题
 */
function useViewportHeight(): void {
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

/**
 * 触摸手势配置
 */
const SWIPE_CONFIG = {
  threshold: 50,
  edgeWidth: 20,
  maxTime: 300,
};

/**
 * 自定义 Hook：触摸手势处理
 */
function useSwipeGesture(
  onSwipeLeft: () => void,
  onSwipeRight: () => void,
  enabled: boolean = true
) {
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchStartTime = useRef<number | null>(null);
  const isEdgeSwipe = useRef<boolean>(false);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return;
    const touch = e.touches[0];
    if (!touch) return;
    touchStartX.current = touch.clientX;
    touchStartY.current = touch.clientY;
    touchStartTime.current = Date.now();
    isEdgeSwipe.current = touch.clientX <= SWIPE_CONFIG.edgeWidth;
  }, [enabled]);

  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled || touchStartX.current === null || touchStartY.current === null) return;
    const touch = e.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - touchStartX.current;
    const deltaY = touch.clientY - touchStartY.current;
    const deltaTime = Date.now() - (touchStartTime.current || 0);
    const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
    const isValidSwipe = Math.abs(deltaX) >= SWIPE_CONFIG.threshold && deltaTime <= SWIPE_CONFIG.maxTime;
    if (isHorizontalSwipe && isValidSwipe) {
      if (deltaX > 0 && isEdgeSwipe.current) {
        onSwipeRight();
      } else if (deltaX < 0) {
        onSwipeLeft();
      }
    }
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

/**
 * 渲染设置内容
 */
function renderSettingsContent(tabId: SettingsTabId): React.ReactNode {
  switch (tabId) {
    case 'api':
      return <ApiConfigSection />;
    case 'model':
      return <ModelSelectSection />;
    case 'generation':
      return <GenerationConfigSection />;
    case 'system':
      return <SystemInstructionSection />;
    case 'safety':
      return <SafetySettingsSection />;
    case 'data':
      return <DataManagementSection />;
    default:
      return null;
  }
}

/**
 * 应用主布局 - 三栏设计
 */
export function Layout({ sidebar, children }: LayoutProps) {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, theme, setTheme } = useSettingsStore();
  const { createWindow, selectWindow, selectSubTopic } = useChatWindowStore();
  const { currentModel } = useSettingsStore();
  const { updateTemplate, deleteTemplate, addTemplate } = useTemplateStore();
  const { removeBookmark } = useBookmarkStore();
  const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() => getEffectiveTheme(theme));
  const [currentView, setCurrentView] = useState<SidebarView>('assistants');
  // 选中的模板 ID - 需求: 2.3
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  // 选中的书签 ID - 需求: 3.3
  const [selectedBookmarkId, setSelectedBookmarkId] = useState<string | null>(null);
  // 设置模态框状态
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  // 调试面板状态
  // 需求: 6.1
  const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
  // 图片预览状态 - 需求: 5.2
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
  // 模板编辑器状态 - 需求: 2.5
  const [isTemplateEditorOpen, setIsTemplateEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PromptTemplate | null>(null);
  const isMobile = useIsMobile();

  // 修复移动端浏览器视口高度问题
  useViewportHeight();

  // 触摸手势处理
  useSwipeGesture(
    () => { if (!sidebarCollapsed) setSidebarCollapsed(true); },
    () => { if (sidebarCollapsed) setSidebarCollapsed(false); },
    isMobile
  );

  // 移动端默认折叠侧边栏
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      const hasInitialized = sessionStorage.getItem('layout-initialized');
      if (!hasInitialized) {
        setSidebarCollapsed(true);
        sessionStorage.setItem('layout-initialized', 'true');
      }
    }
  }, [isMobile, sidebarCollapsed, setSidebarCollapsed]);

  // 应用主题 - 优化过渡效果
  useEffect(() => {
    const root = document.documentElement;
    
    // 添加过渡类
    root.style.setProperty('--theme-transition-duration', '300ms');
    
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const applySystemTheme = () => {
        if (mediaQuery.matches) {
          root.classList.add('dark');
          setEffectiveTheme('dark');
        } else {
          root.classList.remove('dark');
          setEffectiveTheme('light');
        }
      };
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else if (theme === 'dark') {
      root.classList.add('dark');
      setEffectiveTheme('dark');
    } else {
      root.classList.remove('dark');
      setEffectiveTheme('light');
    }
  }, [theme]);

  // 切换主题 - 简化为只有浅色和深色
  const handleThemeToggle = useCallback(() => {
    const newTheme: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  }, [effectiveTheme, setTheme]);

  // 点击助手按钮
  const handleAssistantsClick = useCallback(() => {
    setCurrentView('assistants');
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  // 点击图片库按钮
  // 需求: 2.1, 4.1, 4.2 - 图片库视图时自动折叠侧边栏
  const handleImagesClick = useCallback(() => {
    setCurrentView('images');
    // 图片库视图时自动折叠侧边栏，让图片库占据更多空间
    setSidebarCollapsed(true);
  }, [setSidebarCollapsed]);

  // 点击模板按钮
  // 需求: 5.1
  const handleTemplatesClick = useCallback(() => {
    setCurrentView('templates');
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  // 点击书签按钮
  // 需求: 3.3
  const handleBookmarksClick = useCallback(() => {
    setCurrentView('bookmarks');
    setSidebarCollapsed(false);
  }, [setSidebarCollapsed]);

  // 点击设置按钮 - 打开毛玻璃设置模态框
  const handleSettingsClick = useCallback(() => {
    setIsSettingsModalOpen(true);
  }, []);

  // 关闭设置模态框
  const handleCloseSettingsModal = useCallback(() => {
    setIsSettingsModalOpen(false);
  }, []);

  // 点击调试按钮 - 打开调试面板
  // 需求: 6.1
  const handleDebugClick = useCallback(() => {
    setIsDebugPanelOpen(true);
  }, []);

  // 关闭调试面板
  const handleCloseDebugPanel = useCallback(() => {
    setIsDebugPanelOpen(false);
  }, []);

  // 返回对话视图 - 需求: 2.3
  const handleBackToChat = useCallback(() => {
    setCurrentView('assistants');
  }, []);

  // 处理图片点击 - 需求: 5.2
  const handleImageClick = useCallback((image: GeneratedImage) => {
    setPreviewImage(image);
  }, []);

  // 关闭图片预览
  const handleCloseImagePreview = useCallback(() => {
    setPreviewImage(null);
  }, []);

  // ============ 模板操作回调 - 需求: 2.5, 2.6, 2.7 ============

  // 编辑模板
  const handleEditTemplate = useCallback((template: PromptTemplate) => {
    setEditingTemplate(template);
    setIsTemplateEditorOpen(true);
  }, []);

  // 删除模板
  const handleDeleteTemplate = useCallback(async (templateId: string) => {
    await deleteTemplate(templateId);
    // 如果删除的是当前选中的模板，清除选中状态
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId(null);
    }
  }, [deleteTemplate, selectedTemplateId]);

  // 使用模板创建新对话 - 需求: 2.7
  const handleUseTemplate = useCallback((template: PromptTemplate) => {
    createWindow({
      model: currentModel,
      systemInstruction: template.systemInstruction,
    });
    // 切换到助手视图
    setCurrentView('assistants');
  }, [createWindow, currentModel]);

  // 保存模板（新建或编辑）
  const handleSaveTemplate = useCallback(async (data: CreateTemplateInput | { id: string; updates: UpdateTemplateInput }) => {
    if ('id' in data) {
      // 编辑模式
      await updateTemplate(data.id, data.updates);
    } else {
      // 新建模式
      await addTemplate(data);
    }
    setIsTemplateEditorOpen(false);
    setEditingTemplate(null);
  }, [updateTemplate, addTemplate]);

  // 关闭模板编辑器
  const handleCloseTemplateEditor = useCallback(() => {
    setIsTemplateEditorOpen(false);
    setEditingTemplate(null);
  }, []);

  // ============ 书签操作回调 - 需求: 3.6, 3.7 ============

  // 导航到原消息 - 需求: 3.6
  const handleNavigateToBookmark = useCallback((bookmark: Bookmark) => {
    // 先选择窗口
    selectWindow(bookmark.windowId);
    // 再选择子话题
    selectSubTopic(bookmark.windowId, bookmark.subTopicId);
    // 切换到助手视图
    setCurrentView('assistants');
    // 清除选中的书签
    setSelectedBookmarkId(null);
  }, [selectWindow, selectSubTopic]);

  // 删除书签 - 需求: 3.7
  const handleDeleteBookmark = useCallback(async (messageId: string) => {
    await removeBookmark(messageId);
    // 清除选中状态
    setSelectedBookmarkId(null);
  }, [removeBookmark]);

  return (
    <SidebarContext.Provider value={{ 
      currentView, 
      setCurrentView,
      selectedTemplateId,
      setSelectedTemplateId,
      selectedBookmarkId,
      setSelectedBookmarkId
    }}>
      <div className="flex overflow-hidden bg-white dark:bg-neutral-900 transition-colors duration-300" style={{ height: '100dvh', minHeight: 'calc(var(--vh, 1vh) * 100)' }}>
        {/* 移动端遮罩层 - 需求: 4.2 图片库视图时不显示遮罩 */}
        {!sidebarCollapsed && isMobile && currentView !== 'images' && (
          <div
            className="fixed inset-0 z-20 bg-black/50 transition-opacity duration-300"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* 左侧图标导航栏 - 只保留有功能的按钮 */}
        <nav className="flex flex-col w-12 bg-primary-600 dark:bg-primary-700 flex-shrink-0 z-40 transition-colors duration-300">
          {/* 顶部 Logo */}
          <div className="flex items-center justify-center h-12 border-b border-primary-500/30">
            <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
          </div>

          {/* 导航图标 - 助手、模板、书签和图片库 */}
          <div className="flex-1 flex flex-col items-center py-3 gap-2">
            <NavIconButton
              icon={<ChatIcon />}
              label="助手"
              isActive={currentView === 'assistants' && !sidebarCollapsed}
              onClick={handleAssistantsClick}
            />
            <NavIconButton
              icon={<TemplateNavIcon />}
              label="模板"
              isActive={currentView === 'templates' && !sidebarCollapsed}
              onClick={handleTemplatesClick}
            />
            <NavIconButton
              icon={<BookmarkNavIcon />}
              label="书签"
              isActive={currentView === 'bookmarks' && !sidebarCollapsed}
              onClick={handleBookmarksClick}
            />
            <NavIconButton
              icon={<ImageGalleryIcon />}
              label="图片库"
              isActive={currentView === 'images' && !sidebarCollapsed}
              onClick={handleImagesClick}
            />
          </div>

          {/* 底部工具 - 调试、主题切换和设置 */}
          <div className="flex flex-col items-center py-3 gap-2 border-t border-primary-500/30">
            {/* 调试面板入口按钮 - 需求: 6.1 */}
            <NavIconButton
              icon={<DebugIcon />}
              label="API 调试"
              isActive={isDebugPanelOpen}
              onClick={handleDebugClick}
            />
            <NavIconButton
              icon={effectiveTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
              label={effectiveTheme === 'dark' ? '切换到浅色' : '切换到深色'}
              onClick={handleThemeToggle}
            />
            <NavIconButton
              icon={<SettingsIcon />}
              label="设置"
              isActive={isSettingsModalOpen}
              onClick={handleSettingsClick}
            />
          </div>
        </nav>

        {/* 侧边栏内容区 - 需求: 4.2 图片库视图时隐藏侧边栏 */}
        <aside
          className={`
            fixed inset-y-0 left-12 z-30 w-64 transform transition-all duration-300 ease-out
            md:relative md:left-0 md:translate-x-0
            ${sidebarCollapsed || currentView === 'images' ? '-translate-x-full md:w-0 md:overflow-hidden' : 'translate-x-0'}
            bg-neutral-50 dark:bg-neutral-800 border-r border-neutral-200 dark:border-neutral-700
          `}
        >
          <div className="flex h-full flex-col">
            {sidebar}
          </div>
        </aside>

        {/* 主内容区 - 需求: 2.1, 2.2, 2.3, 3.3 */}
        <main className="flex flex-1 flex-col overflow-hidden transition-colors duration-300">
          {currentView === 'images' ? (
            <FullscreenGallery
              onBackToChat={handleBackToChat}
              onImageClick={handleImageClick}
            />
          ) : currentView === 'templates' ? (
            /* 模板详情视图 - 需求: 2.3 */
            <TemplateDetailView
              selectedTemplateId={selectedTemplateId}
              onEdit={handleEditTemplate}
              onDelete={handleDeleteTemplate}
              onUseTemplate={handleUseTemplate}
            />
          ) : currentView === 'bookmarks' ? (
            /* 书签详情视图 - 需求: 3.3 */
            <BookmarkDetailView
              selectedBookmarkId={selectedBookmarkId}
              onNavigate={handleNavigateToBookmark}
              onDelete={handleDeleteBookmark}
            />
          ) : (
            children
          )}
        </main>

        {/* 毛玻璃设置模态框 */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleCloseSettingsModal}
          renderContent={renderSettingsContent}
        />

        {/* 调试面板 - 需求: 6.1 */}
        <DebugPanel
          isOpen={isDebugPanelOpen}
          onClose={handleCloseDebugPanel}
        />

        {/* 图片预览模态框 - 需求: 5.2 */}
        <ImagePreviewModal
          image={previewImage}
          isOpen={previewImage !== null}
          onClose={handleCloseImagePreview}
        />

        {/* 模板编辑器模态框 - 需求: 2.5, 2.8 */}
        <TemplateEditorModal
          isOpen={isTemplateEditorOpen}
          onClose={handleCloseTemplateEditor}
          template={editingTemplate}
          onSave={handleSaveTemplate}
        />
      </div>
    </SidebarContext.Provider>
  );
}

// ============ 导航图标按钮组件 ============

interface NavIconButtonProps {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick: () => void;
}

function NavIconButton({ icon, label, isActive, onClick }: NavIconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200
        ${isActive 
          ? 'bg-white/25 text-white shadow-sm' 
          : 'text-white/70 hover:bg-white/15 hover:text-white'
        }
      `}
      title={label}
      aria-label={label}
    >
      <span className="w-5 h-5">{icon}</span>
    </button>
  );
}

// ============ 图标组件 ============

function ChatIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function ImageGalleryIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

/**
 * 模板导航图标
 * 需求: 5.1
 */
function TemplateNavIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

/**
 * 书签导航图标
 * 需求: 3.3
 */
function BookmarkNavIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

/**
 * 调试图标
 * 需求: 6.1
 */
function DebugIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

export default Layout;
