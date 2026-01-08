// Electron 主进程入口文件
// 需求: 1.1, 1.2, 1.4

const { app, BrowserWindow, Menu, ipcMain } = require('electron')
const path = require('path')

// 主窗口引用
let mainWindow = null

/**
 * 创建主窗口
 * 需求 1.2: 应用启动时创建主窗口显示聊天界面
 */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    // 需求 1.3: 支持窗口的最小化、最大化和关闭操作
    frame: false, // 移除原生标题栏
    // 隐藏菜单栏，让界面更简洁
    autoHideMenuBar: true,
    titleBarStyle: 'hidden', // macOS 风格隐藏标题栏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs')
    }
  })

  // 完全移除菜单栏
  Menu.setApplicationMenu(null)

  // 需求 1.1: 加载 Vite 构建的 Web 应用
  // 开发模式加载 Vite 开发服务器
  // 生产模式加载打包后的文件
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // 开发模式：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173')
    // 开发模式下打开开发者工具
    mainWindow.webContents.openDevTools()
  } else {
    // 生产模式：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // 窗口关闭时清理引用
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// IPC 监听：窗口控制
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize()
})

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize()
  } else {
    mainWindow?.maximize()
  }
})

ipcMain.on('window-close', () => {
  mainWindow?.close()
})

// 需求 1.4: 应用关闭时正确清理资源并退出进程
// 当所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// macOS 上点击 dock 图标时重新创建窗口
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

// 应用准备就绪时创建窗口
app.whenReady().then(createWindow)

// 应用退出前的清理工作
app.on('before-quit', () => {
  // 清理资源
  if (mainWindow) {
    mainWindow.removeAllListeners('closed')
    mainWindow = null
  }
})
