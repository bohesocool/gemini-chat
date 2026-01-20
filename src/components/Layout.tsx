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
  AppearanceSettingsSection,
} from './Settings/SettingsSections';
import { AboutPanel } from './Settings/AboutPanel';
import { DebugPanel } from './Debug';
import { FullscreenGallery } from './Gallery/FullscreenGallery';
import { ImagePreviewModal } from './ImagePreviewModal';
import { TemplateDetailView } from './Sidebar/TemplateDetailView';
import { TemplateEditorModal } from './Sidebar/TemplateEditorModal';
import { BookmarkDetailView } from './Sidebar/BookmarkDetailView';
import { useBookmarkStore } from '../stores/bookmark';
import type { Bookmark } from '../stores/bookmark';
import type { GeneratedImage } from '../types';

import { WindowControls } from './WindowControls';
import logoImage from '../assets/logo.png';
import { LiveApiView } from './LiveApi';
import { generatePalette, generateDarkPalette } from '../utils/color';

/** 侧边栏视图类型 */
export type SidebarView = 'assistants' | 'settings' | 'images' | 'templates' | 'bookmarks' | 'live';

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
  if (theme === 'midnight') return 'dark';
  if (theme === 'snow-white') return 'light';
  return theme === 'dark' ? 'dark' : 'light';
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
    case 'appearance':
      return <AppearanceSettingsSection />;
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
    case 'about':
      return <AboutPanel />;
    default:
      return null;
  }
}

/**
 * 应用主布局 - 三栏设计
 */
export function Layout({ sidebar, children }: LayoutProps) {
  const { sidebarCollapsed, toggleSidebar, setSidebarCollapsed, theme, setTheme, customThemeColor } = useSettingsStore();
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
          root.classList.remove('midnight');
          setEffectiveTheme('dark');
        } else {
          root.classList.remove('dark', 'midnight');
          setEffectiveTheme('light');
        }
      };
      applySystemTheme();
      mediaQuery.addEventListener('change', applySystemTheme);
      return () => mediaQuery.removeEventListener('change', applySystemTheme);
    } else if (theme === 'midnight') {
      root.classList.add('dark', 'midnight');
      root.classList.remove('snow-white');
      setEffectiveTheme('dark');
    } else if (theme === 'snow-white') {
      root.classList.remove('dark', 'midnight');
      root.classList.add('snow-white');
      setEffectiveTheme('light');
    } else if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('midnight', 'snow-white');
      setEffectiveTheme('dark');
    } else {
      root.classList.remove('dark', 'midnight', 'snow-white');
      setEffectiveTheme('light');
    }
  }, [theme]);

  // 应用自定义主题色 - 需求: 自定义UI颜色功能
  useEffect(() => {
    const root = document.documentElement;

    // 如果是雪白主题，使用 snow-white.css 控制，不应用 customThemeColor (保留用户选择的值)
    if (theme === 'snow-white') {
      // 需要清除所有自定义 CSS 变量，以免与 snow-white.css 冲突
      root.style.removeProperty('--color-primary-50');
      root.style.removeProperty('--color-primary-100');
      root.style.removeProperty('--color-primary-200');
      root.style.removeProperty('--color-primary-300');
      root.style.removeProperty('--color-primary-400');
      root.style.removeProperty('--color-primary-500');
      root.style.removeProperty('--color-primary-600');
      root.style.removeProperty('--color-primary-700');
      root.style.removeProperty('--color-primary-800');
      root.style.removeProperty('--color-primary-900');

      root.style.removeProperty('--color-mint-50');
      root.style.removeProperty('--color-mint-100');
      root.style.removeProperty('--color-mint-200');
      root.style.removeProperty('--color-mint-300');
      root.style.removeProperty('--color-mint-400');
      root.style.removeProperty('--color-mint-500');
      root.style.removeProperty('--color-mint-600');
      root.style.removeProperty('--color-mint-700');
      root.style.removeProperty('--color-mint-800');
      root.style.removeProperty('--color-mint-900');

      root.style.removeProperty('--color-brand-50');
      root.style.removeProperty('--color-brand-100');
      root.style.removeProperty('--color-brand-200');
      root.style.removeProperty('--color-brand-300');
      root.style.removeProperty('--color-brand-400');
      root.style.removeProperty('--color-brand-500');
      root.style.removeProperty('--color-brand-600');
      root.style.removeProperty('--color-brand-700');
      root.style.removeProperty('--color-brand-800');
      root.style.removeProperty('--color-brand-900');

      root.style.removeProperty('--brand');
      root.style.removeProperty('--brand-hover');
      root.style.removeProperty('--brand-active');
      root.style.removeProperty('--brand-light');
      root.style.removeProperty('--brand-dark');

      // 添加类 (Layout已处理，但为了保险)
      root.classList.add('snow-white');
      return;
    }

    if (customThemeColor) {
      // 根据当前生效的主题（深色/浅色）生成对应的色板
      // 注意：variables.css 中的逻辑是 --color-primary-50 在深色模式下也是深色 (??? Wait, let's re-verify variables.css)
      // Re-read variables.css: 
      // Light Mode: --color-primary-50: #f0fdf4; (Lightest)
      // Dark Mode:  --color-primary-50: #14532d; (Darkest)
      // 所以 Tailwind 类的 bg-primary-50 在 Light Mode 是浅色，在 Dark Mode 是深色。
      // 这意味着我们生成的 "50" 号颜色，应该根据模式来决定是浅还是深。

      let palette;
      if (effectiveTheme === 'dark') {
        // 深色模式：生成反转色板 (50=深, 900=浅)
        palette = generateDarkPalette(customThemeColor);
      } else {
        // 浅色模式：生成标准色板 (50=浅, 900=深)
        palette = generatePalette(customThemeColor);
      }

      // 应用变量 - Primary
      root.style.setProperty('--color-primary-50', palette[50]);
      root.style.setProperty('--color-primary-100', palette[100]);
      root.style.setProperty('--color-primary-200', palette[200]);
      root.style.setProperty('--color-primary-300', palette[300]);
      root.style.setProperty('--color-primary-400', palette[400]);
      root.style.setProperty('--color-primary-500', palette[500]);
      root.style.setProperty('--color-primary-600', palette[600]);
      root.style.setProperty('--color-primary-700', palette[700]);
      root.style.setProperty('--color-primary-800', palette[800]);
      root.style.setProperty('--color-primary-900', palette[900]);

      // 应用变量 - Mint (覆盖原有 mint 以实现全主题变色)
      root.style.setProperty('--color-mint-50', palette[50]);
      root.style.setProperty('--color-mint-100', palette[100]);
      root.style.setProperty('--color-mint-200', palette[200]);
      root.style.setProperty('--color-mint-300', palette[300]);
      root.style.setProperty('--color-mint-400', palette[400]);
      root.style.setProperty('--color-mint-500', palette[500]);
      root.style.setProperty('--color-mint-600', palette[600]);
      root.style.setProperty('--color-mint-700', palette[700]);
      root.style.setProperty('--color-mint-800', palette[800]);
      root.style.setProperty('--color-mint-900', palette[900]);

      // 应用变量 - Brand
      root.style.setProperty('--color-brand-50', palette[50]);
      root.style.setProperty('--color-brand-100', palette[100]);
      root.style.setProperty('--color-brand-200', palette[200]);
      root.style.setProperty('--color-brand-300', palette[300]);
      root.style.setProperty('--color-brand-400', palette[400]);
      root.style.setProperty('--color-brand-500', palette[500]);
      root.style.setProperty('--color-brand-600', palette[600]);
      root.style.setProperty('--color-brand-700', palette[700]);
      root.style.setProperty('--color-brand-800', palette[800]);
      root.style.setProperty('--color-brand-900', palette[900]);

      // 快捷变量
      root.style.setProperty('--brand', palette[500]);
      root.style.setProperty('--brand-hover', palette[600]);
      root.style.setProperty('--brand-active', palette[700]);
      // light/dark 快捷变量也需要适配
      root.style.setProperty('--brand-light', effectiveTheme === 'dark' ? palette[900] : palette[100]);
      root.style.setProperty('--brand-dark', effectiveTheme === 'dark' ? palette[100] : palette[800]);

    } else {
      root.classList.remove('snow-white');
      // 清除自定义颜色，恢复默认
      root.style.removeProperty('--color-primary-50');
      root.style.removeProperty('--color-primary-100');
      root.style.removeProperty('--color-primary-200');
      root.style.removeProperty('--color-primary-300');
      root.style.removeProperty('--color-primary-400');
      root.style.removeProperty('--color-primary-500');
      root.style.removeProperty('--color-primary-600');
      root.style.removeProperty('--color-primary-700');
      root.style.removeProperty('--color-primary-800');
      root.style.removeProperty('--color-primary-900');

      root.style.removeProperty('--color-mint-50');
      root.style.removeProperty('--color-mint-100');
      root.style.removeProperty('--color-mint-200');
      root.style.removeProperty('--color-mint-300');
      root.style.removeProperty('--color-mint-400');
      root.style.removeProperty('--color-mint-500');
      root.style.removeProperty('--color-mint-600');
      root.style.removeProperty('--color-mint-700');
      root.style.removeProperty('--color-mint-800');
      root.style.removeProperty('--color-mint-900');

      root.style.removeProperty('--color-brand-50');
      root.style.removeProperty('--color-brand-100');
      root.style.removeProperty('--color-brand-200');
      root.style.removeProperty('--color-brand-300');
      root.style.removeProperty('--color-brand-400');
      root.style.removeProperty('--color-brand-500');
      root.style.removeProperty('--color-brand-600');
      root.style.removeProperty('--color-brand-700');
      root.style.removeProperty('--color-brand-800');
      root.style.removeProperty('--color-brand-900');

      root.style.removeProperty('--brand');
      root.style.removeProperty('--brand-hover');
      root.style.removeProperty('--brand-active');
      root.style.removeProperty('--brand-light');
      root.style.removeProperty('--brand-dark');
    }
  }, [theme, customThemeColor, effectiveTheme]);

  // 切换主题 - 简化为只有浅色和深色 (如果当前是雪白，也切回深色)
  const handleThemeToggle = useCallback(() => {
    // 简单逻辑：如果当前不是深色，就切换到深色；如果是深色，切换到浅色
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

  // 点击 Live 按钮
  // 需求: 1.1 - Live API 实时对话入口
  const handleLiveClick = useCallback(() => {
    setCurrentView('live');
    // Live 视图时自动折叠侧边栏，让主视图占据更多空间
    setSidebarCollapsed(true);
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
      <div className="flex overflow-hidden bg-white dark:bg-neutral-900 transition-colors duration-300 relative" style={{ height: '100dvh', minHeight: 'calc(var(--vh, 1vh) * 100)' }}>


        {/* 移动端遮罩层 - 需求: 4.2 图片库视图时不显示遮罩 */}
        {!sidebarCollapsed && isMobile && currentView !== 'images' && (
          <div
            className="fixed inset-0 z-20 bg-black/50 transition-opacity duration-300"
            onClick={toggleSidebar}
            aria-hidden="true"
          />
        )}

        {/* 左侧图标导航栏 - 只保留有功能的按钮 */}
        {/* 左侧图标导航栏 - 只保留有功能的按钮 */}
        {/* 左侧图标导航栏 - 只保留有功能的按钮 */}
        <nav className={`
          flex flex-col w-20   flex-shrink-0 z-40 transition-colors duration-300 pt-2 no-drag
          ${theme === 'snow-white'
            ? 'bg-white border-r border-black'
            : effectiveTheme === 'dark' ? 'bg-black border-r border-white/5' : 'bg-primary-600'}
          layout-nav
        `}>
          {/* 顶部 Logo - 替换为图片 */}
          <div className="flex items-center justify-center h-12 mb-2 mt-5">
            <div className="w-10 h-10  rounded-lg bg-white/20 flex items-center justify-center overflow-hidden">
              <img src={logoImage} alt="Logo" className="w-full h-full object-cover" />
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
            <NavIconButton
              icon={<LiveIcon />}
              label="实时对话"
              isActive={currentView === 'live'}
              onClick={handleLiveClick}
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

        {/* 侧边栏内容区 - 图片库和 Live 视图时直接移除 (不渲染) */}
        {currentView !== 'images' && currentView !== 'live' && (
          <aside
            className={`
              fixed inset-y-0 left-12 z-30 transform transition-[width,transform,opacity] duration-300 ease-in-out overflow-hidden
              md:relative md:left-0 md:translate-x-0
              ${sidebarCollapsed ? '-translate-x-full md:w-0 md:opacity-0' : 'translate-x-0 md:w-64 md:opacity-100'}
              ${theme === 'snow-white'
                ? 'bg-white border-r border-black'
                : effectiveTheme === 'dark' ? 'bg-black border-r border-white/5' : 'bg-neutral-50 border-r border-neutral-200'}
              layout-sidebar
            `}
            style={theme === 'snow-white' ? { backgroundColor: '#ffffff', borderRightColor: '#000000' } : undefined}
          >
            {/* Fixed width container to prevent squashing */}
            <div className="w-64 h-full flex flex-col">
              {sidebar}
            </div>
          </aside>
        )}

        {/* 主内容区 - 需求: 2.1, 2.2, 2.3, 3.3 */}
        <main className={`
          flex flex-1 flex-col overflow-hidden transition-all duration-300 relative
          ${effectiveTheme === 'dark' ? 'bg-[#050505]' : 'bg-white'}
        `}>

          {/* Windows Controls Header Area - 需求: 顶部控制栏 */}
          <div className="h-10 flex items-center justify-between px-4 drag-region flex-shrink-0 z-50">
            {/* Left side spacer - Sidebar Toggle Button */}
            <div className="flex-1 flex items-center">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-1 rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 text-neutral-500 dark:text-neutral-400 no-drag focus:outline-none"
                  title="展开侧边栏"
                >
                  {/* Menu Icon */}
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              )}
            </div>
            {/* Window Controls - Right aligned */}
            <WindowControls />
          </div>

          <div className="flex-1 overflow-hidden relative flex flex-col">
            {currentView === 'images' ? (
              <FullscreenGallery
                onBackToChat={handleBackToChat}
                onImageClick={handleImageClick}
              />
            ) : currentView === 'live' ? (
              /* Live API 实时对话视图 - 需求: 1.1, 2.1 */
              <LiveApiView />
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
          </div>
        </main>

        {/* 毛玻璃设置模态框 */}
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleCloseSettingsModal}
          renderContent={renderSettingsContent}
        />

        {/* 调试面板 - 需求: 6.1 */}
        {isDebugPanelOpen && (
          <DebugPanel
            isOpen={isDebugPanelOpen}
            onClose={handleCloseDebugPanel}
          />
        )}

        {/* 图片预览模态框 - 需求: 5.2 */}
        {previewImage && (
          <ImagePreviewModal
            isOpen={!!previewImage}
            image={previewImage}
            onClose={handleCloseImagePreview}
          />
        )}

        {/* 模板编辑器模态框 - 需求: 2.5, 2.6 */}
        {isTemplateEditorOpen && (
          <TemplateEditorModal
            isOpen={isTemplateEditorOpen}
            onClose={handleCloseTemplateEditor}
            onSave={handleSaveTemplate}
            template={editingTemplate}
          />
        )}
      </div>
    </SidebarContext.Provider>
  );
}

// ============ 图标组件 ============

function NavIconButton({ icon, label, onClick, isActive }: { icon: React.ReactNode, label: string, onClick: () => void, isActive?: boolean }) {
  // Icon button styles
  const activeClass = isActive
    ? 'bg-black/20 text-white'
    : 'text-white/70 hover:text-white hover:bg-black/10';

  return (
    <button
      onClick={onClick}
      className={`
          w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
          ${activeClass}
        `}
      title={label}
    >
      <div className="w-6 h-6">
        {icon}
      </div>
    </button>
  );
}




// Icons (Simple SVGs)

function ChatIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function TemplateNavIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  );
}

function BookmarkNavIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  );
}

function ImageGalleryIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function DebugIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function LiveIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}
