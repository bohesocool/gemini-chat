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

interface Window {
  electronAPI: {
    send: (channel: string, data?: any) => void;
    receive: (channel: string, func: (...args: any[]) => void) => void;
    once: (channel: string, func: (...args: any[]) => void) => void;
    copyImageToClipboard: (base64Data: string, mimeType: string) => Promise<{ success: boolean; error?: string }>;
    platform: string;
    versions: {
      node: string;
      chrome: string;
      electron: string;
    }
  }
}
