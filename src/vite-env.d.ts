/// <reference types="vite/client" />

// 扩展 Vite 环境变量类型
interface ImportMetaEnv {
  /** 应用版本号，从 package.json 读取 */
  readonly VITE_APP_VERSION: string
  /** 应用名称，从 package.json 读取 */
  readonly VITE_APP_NAME: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

interface AppConfig {
  AUTH_PASSWORD_HASH?: string;
  DB_ENABLED?: string;
  WEBDAV_ENABLED?: string;
}

/**
 * Electron 预加载脚本（electron/preload.cjs）通过 contextBridge 暴露的 API。
 * 可选：浏览器环境下不存在，使用前需用 `'electronAPI' in window` 守卫。
 */
interface ElectronAPI {
  /** 发送消息到主进程（仅白名单通道生效） */
  send: (channel: string, data?: unknown) => void;
  /** 监听主进程消息 */
  receive: (channel: string, func: (...args: unknown[]) => void) => void;
  /** 单次监听主进程消息 */
  once: (channel: string, func: (...args: unknown[]) => void) => void;
  /** 复制图片到系统剪贴板 */
  copyImageToClipboard: (base64Data: string, mimeType: string) => Promise<{ success: boolean; error?: string }>;
  /** 运行平台（如 'darwin' / 'win32'） */
  platform: string;
  /** 运行时版本信息 */
  versions: {
    node: string;
    chrome: string;
    electron: string;
  };
}

interface Window {
  __APP_CONFIG__?: AppConfig;
  electronAPI?: ElectronAPI;
}
