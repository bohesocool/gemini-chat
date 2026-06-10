import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'

// 从 package.json 读取版本号和应用名称
const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Electron 需要使用相对路径加载资源
  base: './',
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // 使用环境变量注入版本号和应用名称
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    'import.meta.env.VITE_APP_NAME': JSON.stringify(pkg.name),
  },
  build: {
    rollupOptions: {
      output: {
        // 将 React 核心拆为独立 vendor chunk，便于浏览器长期缓存
        // （应用代码更新时无需重新下载 React）。
        // 重型 Markdown 栈（react-markdown/katex/highlight.js）与 html-to-image
        // 通过动态 import() 自动拆分为按需加载的独立 chunk，无需在此枚举，
        // 也避免了 markdown 生态互相依赖时手动分块导致的初始化顺序问题。
        manualChunks(id) {
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/.test(id)) {
            return 'react-vendor';
          }
        },
      },
    },
  },
})
