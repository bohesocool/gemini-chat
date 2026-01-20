

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
    // Electron 环境下通过 electronAPI 获取平台信息
    return (window as any).electronAPI?.platform === 'darwin';
  }
  // 网页环境下通过 userAgent 检测
  return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
};

/**
 * 判断是否应该显示窗口控制按钮
 * macOS 版本不显示，Windows 版本和网页版本显示
 */
const shouldShowWindowControls = (): boolean => {
  return !isMacOS();
};

/**
 * 自定义窗口控制按钮组件
 * 包含：最小化、最大化、关闭
 * 在 macOS 版本中不显示，在 Windows 版本和网页版本中显示
 */
export function WindowControls() {
    // 如果是 macOS，不渲染任何内容
    if (!shouldShowWindowControls()) {
        return null;
    }

    const handleMinimize = () => {
        window.electronAPI?.send('window-minimize');
    };

    const handleMaximize = () => {
        window.electronAPI?.send('window-maximize');
    };

    const handleClose = () => {
        window.electronAPI?.send('window-close');
    };

    return (
        <div className="flex items-center gap-3 h-full no-drag">
            <button
                onClick={handleMinimize}
                className="w-12 h-8 flex items-center justify-center rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 no-drag focus:outline-none"
                aria-label="最小化"
                title="最小化"
            >
                <svg width="11" height="1" viewBox="0 0 11 1" fill="currentColor">
                    <rect width="11" height="1" rx="0.5" />
                </svg>
            </button>
            <button
                onClick={handleMaximize}
                className="w-12 h-8 flex items-center justify-center rounded-md hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100 no-drag focus:outline-none"
                aria-label="最大化"
                title="最大化"
            >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.2">
                    <rect x="1.5" y="1.5" width="7" height="7" rx="1.5" />
                </svg>
            </button>
            <button
                onClick={handleClose}
                className="w-12 h-8 flex items-center justify-center rounded-md hover:bg-red-500 hover:text-white transition-colors text-neutral-500 dark:text-neutral-400 no-drag focus:outline-none"
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
