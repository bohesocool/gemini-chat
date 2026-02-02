// Electron 预加载脚本
// 需求: 1.1 - 提供安全的 IPC 通信接口

const { contextBridge, ipcRenderer } = require('electron')

/**
 * 通过 contextBridge 安全地暴露 API 给渲染进程
 * 这样可以在保持 contextIsolation 的同时，
 * 让渲染进程能够与主进程通信
 */
contextBridge.exposeInMainWorld('electronAPI', {
  // 平台信息
  platform: process.platform,

  // 版本信息
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  },

  // 复制图片到剪贴板
  copyImageToClipboard: (base64Data, mimeType) => {
    return ipcRenderer.invoke('copy-image-to-clipboard', base64Data, mimeType)
  },

  // 发送消息到主进程
  send: (channel, data) => {
    // 白名单通道，确保安全
    const validChannels = ['app-ready', 'window-minimize', 'window-maximize', 'window-close']
    if (validChannels.includes(channel)) {
      ipcRenderer.send(channel, data)
    }
  },

  // 从主进程接收消息
  receive: (channel, callback) => {
    const validChannels = ['app-update', 'app-error']
    if (validChannels.includes(channel)) {
      // 移除旧的监听器以避免内存泄漏
      ipcRenderer.removeAllListeners(channel)
      ipcRenderer.on(channel, (event, ...args) => callback(...args))
    }
  },

  // 单次接收消息
  once: (channel, callback) => {
    const validChannels = ['app-update', 'app-error']
    if (validChannels.includes(channel)) {
      ipcRenderer.once(channel, (event, ...args) => callback(...args))
    }
  }
})
