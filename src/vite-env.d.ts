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
