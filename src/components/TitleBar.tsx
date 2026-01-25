/**
 * 自定义标题栏组件
 * 在 Electron 环境下显示，与左侧导航栏同色
 * Windows 版本显示窗口控制按钮，macOS 版本不显示
 * 
 * 圆角过渡效果说明：
 * - 标题栏和左侧导航栏同色（绿色主题=绿色，雪白主题=白色）
 * - 右侧内容区域的左上角有内凹圆角过渡效果
 * - 使用伪元素和 radial-gradient 实现内凹圆角
 */

import { useSettingsStore } from '../stores/settings';

/**
 * 判断是否在 Electron 环境中运行
 */
const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
    'electronAPI' in window && 
    (window as { electronAPI?: unknown }).electronAPI !== undefined;
};

/**
 * 判断是否为 macOS 平台
 */
const isMacOS = (): boolean => {
  if (isElectronEnvironment()) {
    return (window as any).electronAPI?.platform === 'darwin';
  }
  return false;
};

interface WindowControlButtonsProps {
  /** 是否为浅色主题（按钮显示黑色） */
  isLightTheme: boolean;
}

/**
 * 窗口控制按钮组件（仅 Windows）
 */
function WindowControlButtons({ isLightTheme }: WindowControlButtonsProps) {
  const handleMinimize = () => {
    (window as any).electronAPI?.send('window-minimize');
  };

  const handleMaximize = () => {
    (window as any).electronAPI?.send('window-maximize');
  };

  const handleClose = () => {
    (window as any).electronAPI?.send('window-close');
  };

  // 根据主题决定按钮颜色
  const buttonClass = isLightTheme
    ? 'text-black/60 hover:text-black hover:bg-black/10'
    : 'text-white/80 hover:text-white hover:bg-white/20';

  return (
    <div className="flex items-center h-full no-drag">
      {/* 最小化按钮 */}
      <button
        onClick={handleMinimize}
        className={`w-12 h-8 flex items-center justify-center transition-colors ${buttonClass}`}
        aria-label="最小化"
        title="最小化"
      >
        <svg width="11" height="1" viewBox="0 0 11 1" fill="currentColor">
          <rect width="11" height="1" rx="0.5" />
        </svg>
      </button>
      {/* 最大化按钮 */}
      <button
        onClick={handleMaximize}
        className={`w-12 h-8 flex items-center justify-center transition-colors ${buttonClass}`}
        aria-label="最大化"
        title="最大化"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
          <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" />
        </svg>
      </button>
      {/* 关闭按钮 */}
      <button
        onClick={handleClose}
        className={`w-12 h-8 flex items-center justify-center transition-colors ${isLightTheme ? 'text-black/60 hover:bg-red-500 hover:text-white' : 'text-white/80 hover:bg-red-500 hover:text-white'}`}
        aria-label="关闭"
        title="关闭"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
          <path d="M1.5 1.5L8.5 8.5M8.5 1.5L1.5 8.5" />
        </svg>
      </button>
    </div>
  );
}

interface TitleBarProps {
  /** 当前生效的主题 */
  effectiveTheme: 'light' | 'dark';
}

/**
 * 自定义标题栏
 * 仅在 Electron 环境下渲染
 */
export function TitleBar({ effectiveTheme }: TitleBarProps) {
  const { theme } = useSettingsStore();
  
  // 非 Electron 环境不渲染
  if (!isElectronEnvironment()) {
    return null;
  }

  const isWindows = !isMacOS();
  const isLightTheme = theme === 'snow-white';
  
  // 获取导航栏背景色类名（与左侧导航栏一致）
  const getNavBgClass = () => {
    if (theme === 'snow-white') return 'bg-white';
    return effectiveTheme === 'dark' ? 'bg-black' : 'bg-primary-600';
  };

  return (
    <div className={`h-8 flex items-center justify-between select-none drag-region ${getNavBgClass()} relative`}>
      {/* 左侧占位 - 导航栏宽度 */}
      <div className="w-14 flex-shrink-0" />
      
      {/* 中间区域 - 与导航栏同色，填充整个标题栏 */}
      <div className="flex-1" />
      
      {/* 右侧窗口控制按钮（仅 Windows）*/}
      {isWindows && (
        <div className="relative z-10">
          <WindowControlButtons isLightTheme={isLightTheme} />
        </div>
      )}
    </div>
  );
}

export default TitleBar;
