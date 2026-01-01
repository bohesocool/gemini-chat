# 设计文档

## 概述

本设计将 Gemini Chat 从纯 Web 应用扩展为支持 Electron 桌面应用，实现 Windows exe 安装包的自动化构建和发布。采用 Vite + Electron 的集成方案，使用 electron-builder 进行打包，通过 GitHub Actions 实现 CI/CD 自动化。

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Repository                         │
├─────────────────────────────────────────────────────────────┤
│  推送 v* 标签                                                │
│       ↓                                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              GitHub Actions Workflow                 │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │    │
│  │  │ 检出代码    │→│ 构建 Vite   │→│ 构建 Electron│  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  │    │
│  │         ↓                                            │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 生成 Release Notes (Conventional Commits)   │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │         ↓                                            │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │ 上传 Assets 到 GitHub Releases              │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## 组件和接口

### 1. Electron 主进程 (electron/main.js)

```javascript
// 主进程入口文件
const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  // 开发模式加载 Vite 开发服务器
  // 生产模式加载打包后的文件
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173')
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(createWindow)
```

### 2. electron-builder 配置 (electron-builder.yml)

```yaml
appId: com.gemini.chat
productName: Gemini Chat
directories:
  output: release
  buildResources: build

files:
  - dist/**/*
  - electron/**/*

win:
  target:
    - target: nsis
      arch: [x64]
  icon: build/icon.ico

nsis:
  oneClick: false
  allowToChangeInstallationDirectory: true
  createDesktopShortcut: true
  createStartMenuShortcut: true
```

### 3. GitHub Actions 工作流

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build
        run: npm run build
      
      - name: Build Electron
        run: npm run electron:build
      
      - name: Generate Release Notes
        id: changelog
        uses: conventional-changelog/conventional-changelog-action@v5
      
      - name: Create Release
        uses: softprops/action-gh-release@v1
        with:
          body: ${{ steps.changelog.outputs.changelog }}
          files: release/*.exe
```

## 数据模型

### package.json 新增脚本

```json
{
  "scripts": {
    "electron:dev": "concurrently \"npm run dev\" \"wait-on http://localhost:5173 && electron .\"",
    "electron:build": "npm run build && electron-builder"
  },
  "main": "electron/main.js",
  "build": {
    "extends": "electron-builder.yml"
  }
}
```

### Conventional Commits 类型映射

| Commit 类型 | Release Notes 分类 | 示例 |
|------------|-------------------|------|
| feat | ✨ Features | feat: 添加导出功能 |
| fix | 🐛 Bug Fixes | fix: 修复消息显示问题 |
| refactor | ♻️ Code Refactoring | refactor: 重构消息组件 |
| style | 💄 Styles | style: 优化 UI 样式 |
| perf | ⚡ Performance | perf: 优化渲染性能 |
| docs | 📝 Documentation | docs: 更新 README |

## 目录结构

```
gemini-chat/
├── electron/
│   └── main.js              # Electron 主进程
├── build/
│   └── icon.ico             # 应用图标
├── .github/
│   └── workflows/
│       ├── docker-build.yml # 现有 Docker 构建
│       └── release.yml      # 新增 Release 构建
├── electron-builder.yml     # electron-builder 配置
├── commitlint.config.js     # commitlint 配置
└── package.json             # 更新后的配置
```


## 正确性属性

*正确性属性是指在系统所有有效执行中都应该保持为真的特征或行为——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

由于本功能主要涉及配置文件和 CI/CD 流程，大部分需求是配置性的，不适合属性测试。以下是可测试的属性：

### Property 1: Commitlint 拒绝无效提交信息

*对于任意* 不符合 Conventional Commits 规范的提交信息，commitlint 应该返回验证错误。

**验证: 需求 3.3**

### Property 2: Release Notes 包含所有提交

*对于任意* 符合 Conventional Commits 规范的提交列表，生成的 Release Notes 应该包含所有提交的描述信息，并按类型正确分组。

**验证: 需求 4.4, 4.5**

## 错误处理

### Electron 应用错误

| 错误场景 | 处理方式 |
|---------|---------|
| 加载页面失败 | 显示错误页面，提供重试选项 |
| 主进程崩溃 | 记录错误日志，优雅退出 |

### 构建错误

| 错误场景 | 处理方式 |
|---------|---------|
| 依赖安装失败 | GitHub Actions 报告失败，不创建 Release |
| 构建失败 | GitHub Actions 报告失败，不上传 Assets |
| 签名失败 | 跳过签名，继续构建（可选） |

## 测试策略

### 单元测试

由于本功能主要是配置和集成，单元测试范围有限：
- 验证配置文件格式正确
- 验证脚本命令存在

### 集成测试

- 本地运行 `npm run electron:dev` 验证开发模式
- 本地运行 `npm run electron:build` 验证构建流程
- 推送测试标签验证 GitHub Actions 流程

### 属性测试

使用 fast-check 进行属性测试：
- 测试 commitlint 对各种输入的验证行为
- 测试 Release Notes 生成的正确性

测试配置：
- 每个属性测试运行至少 100 次迭代
- 使用 fast-check 生成随机测试数据
