# 实现计划：Electron 桌面应用自动发布

## 概述

将 Gemini Chat 扩展为 Electron 桌面应用，实现 Windows exe 安装包的自动化构建和发布。

## 任务

- [x] 1. 安装 Electron 相关依赖
  - 安装 electron、electron-builder、concurrently、wait-on
  - 更新 package.json 的 main 字段和构建脚本
  - _需求: 1.1, 5.1, 5.3_

- [ ] 2. 创建 Electron 主进程
  - [ ] 2.1 创建 electron/main.js 主进程入口文件
    - 实现窗口创建和生命周期管理
    - 支持开发模式和生产模式的不同加载方式
    - _需求: 1.1, 1.2, 1.4_
  
  - [ ] 2.2 创建 electron/preload.js 预加载脚本（可选）
    - 提供安全的 IPC 通信接口
    - _需求: 1.1_

- [ ] 3. 配置 electron-builder
  - [ ] 3.1 创建 electron-builder.yml 配置文件
    - 配置应用 ID、名称、输出目录
    - 配置 Windows NSIS 安装包选项
    - _需求: 2.1, 2.2, 2.4_
  
  - [ ] 3.2 创建应用图标
    - 创建 build/icon.ico 图标文件
    - _需求: 2.2_

- [ ] 4. 检查点 - 本地构建测试
  - 运行 `npm run electron:dev` 测试开发模式
  - 运行 `npm run electron:build` 测试构建流程
  - 确保生成 exe 安装包

- [ ] 5. 配置 Conventional Commits
  - [ ] 5.1 安装 commitlint 和 husky
    - 安装 @commitlint/cli、@commitlint/config-conventional、husky
    - _需求: 3.1, 3.3_
  
  - [ ] 5.2 创建 commitlint.config.js 配置文件
    - 配置 Conventional Commits 规则
    - _需求: 3.1_
  
  - [ ] 5.3 配置 husky Git hooks
    - 添加 commit-msg hook 验证提交信息
    - _需求: 3.3_

  - [ ] 5.4 编写 commitlint 属性测试
    - **Property 1: Commitlint 拒绝无效提交信息**
    - **验证: 需求 3.3**

- [ ] 6. 创建 GitHub Actions Release 工作流
  - [ ] 6.1 创建 .github/workflows/release.yml
    - 配置 v* 标签触发
    - 配置 Windows 构建环境
    - 配置依赖安装和构建步骤
    - _需求: 4.1, 4.2_
  
  - [ ] 6.2 配置 Release Notes 自动生成
    - 使用 conventional-changelog-action 生成更新说明
    - 配置按类型分组显示
    - _需求: 4.4, 4.5_
  
  - [ ] 6.3 配置 Assets 上传
    - 使用 softprops/action-gh-release 上传 exe 文件
    - _需求: 4.3_

- [ ] 7. 更新项目文档
  - [ ] 7.1 更新 README.md
    - 添加 Conventional Commits 使用说明
    - 添加发布流程说明
    - _需求: 3.2_

- [ ] 8. 最终检查点
  - 确保所有配置文件正确
  - 本地测试构建流程
  - 准备推送测试标签验证 CI/CD

## 备注

- 所有任务都必须完成
- 每个任务都引用了具体的需求以便追溯
- 检查点用于确保增量验证
