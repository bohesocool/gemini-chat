# 需求文档

## 简介

为 Gemini Chat 项目添加 Electron 桌面应用打包能力，实现自动化构建 Windows exe 安装包，并通过 GitHub Actions 自动发布到 Releases，同时自动生成基于 Conventional Commits 的更新说明。

## 术语表

- **Electron**：将 Web 应用打包成桌面应用的框架
- **electron-builder**：Electron 应用的打包和发布工具
- **Conventional_Commits**：标准化的 Git 提交信息格式
- **semantic-release**：基于提交信息自动生成版本号和更新说明的工具
- **GitHub_Actions**：GitHub 的 CI/CD 自动化平台
- **NSIS**：Windows 安装包制作工具

## 需求

### 需求 1：Electron 桌面应用支持

**用户故事：** 作为开发者，我希望将现有的 React Web 应用打包成 Electron 桌面应用，以便用户可以在 Windows 上本地运行。

#### 验收标准

1. THE Electron_Main_Process SHALL 加载 Vite 构建的 Web 应用
2. WHEN 应用启动时，THE Electron_App SHALL 创建一个主窗口显示聊天界面
3. THE Electron_App SHALL 支持窗口的最小化、最大化和关闭操作
4. WHEN 应用关闭时，THE Electron_App SHALL 正确清理资源并退出进程

### 需求 2：Windows 安装包构建

**用户故事：** 作为开发者，我希望能够构建 Windows exe 安装包，以便用户可以方便地安装应用。

#### 验收标准

1. THE electron-builder SHALL 生成 NSIS 格式的 Windows 安装包
2. THE 安装包 SHALL 包含应用图标和基本元数据
3. WHEN 用户运行安装包时，THE 安装程序 SHALL 引导用户完成安装
4. THE 安装包 SHALL 在开始菜单和桌面创建快捷方式

### 需求 3：Conventional Commits 规范

**用户故事：** 作为开发者，我希望使用标准化的提交信息格式，以便自动生成更新说明。

#### 验收标准

1. THE 项目 SHALL 定义 Conventional Commits 的提交类型（feat、fix、refactor、style 等）
2. THE 项目 SHALL 提供提交信息的格式说明文档
3. WHEN 提交信息不符合规范时，THE commitlint SHALL 给出警告提示

### 需求 4：自动化 Release 发布

**用户故事：** 作为开发者，我希望在推送版本标签时自动构建并发布到 GitHub Releases，以便简化发布流程。

#### 验收标准

1. WHEN 推送 v* 格式的标签时，THE GitHub_Actions SHALL 触发构建流程
2. THE GitHub_Actions SHALL 自动构建 Windows exe 安装包
3. THE GitHub_Actions SHALL 将构建产物上传到 GitHub Releases 的 Assets
4. THE GitHub_Actions SHALL 基于 Conventional Commits 自动生成 Release Notes
5. THE Release_Notes SHALL 按类型分组显示（Features、Bug Fixes、Refactoring 等）

### 需求 5：本地开发体验

**用户故事：** 作为开发者，我希望在本地能够方便地开发和测试 Electron 应用。

#### 验收标准

1. THE 项目 SHALL 提供 `npm run electron:dev` 命令启动开发模式
2. WHEN 代码变更时，THE 开发模式 SHALL 支持热重载
3. THE 项目 SHALL 提供 `npm run electron:build` 命令本地构建安装包
