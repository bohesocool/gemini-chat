# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.2.25](https://github.com/bohesocool/gemini-chat/compare/v0.2.24...v0.2.25) (2026-06-10)


### ✅ 测试 (Tests)

* 为核心逻辑层补充单元测试（数据迁移/SSE 解析/IndexedDB 存储/聊天窗口 Store） ([589c890](https://github.com/bohesocool/gemini-chat/commit/589c890605c2db2e0d50062d9a80a5d7942755f4))

### [0.2.24](https://github.com/bohesocool/gemini-chat/compare/v0.2.23...v0.2.24) (2026-06-10)


### 🐛 Bug 修复 (Bug Fixes)

* 安全加固（iframe 沙箱、图片预览 XSS、WebDAV SSRF） ([1efd924](https://github.com/bohesocool/gemini-chat/commit/1efd924d747f8b0ecde1a0b512b8d7e865c1b08b))
* 安全加固第二批（启动告警 + 数据库端口收敛） ([b0c1266](https://github.com/bohesocool/gemini-chat/commit/b0c1266e5bd64d011006f009cbf668eaaaa123e8))

### [0.2.23](https://github.com/bohesocool/gemini-chat/compare/v0.2.22...v0.2.23) (2026-06-10)


### 🐛 Bug 修复 (Bug Fixes)

* 服务端安全加固 ([6b27cb3](https://github.com/bohesocool/gemini-chat/commit/6b27cb35e9b0edc009c1b94871de207fb06936a8))

### [0.2.22](https://github.com/bohesocool/gemini-chat/compare/v0.2.21...v0.2.22) (2026-06-10)


### ⚡ 性能优化 (Performance)

* Markdown 渲染器拆分为按需加载 chunk，React 核心独立 vendor 缓存 ([1bcb907](https://github.com/bohesocool/gemini-chat/commit/1bcb9075fd5bc778ca25598c7341e57639639adb))


### 🐛 Bug 修复 (Bug Fixes)

* Live API 音频缓存设置 5s 上限，防止网络积压导致内存无限增长 ([1f91355](https://github.com/bohesocool/gemini-chat/commit/1f913556c00b35638dcf3b84f462f97d2f89515c))

### [0.2.21](https://github.com/bohesocool/gemini-chat/compare/v0.2.20...v0.2.21) (2026-06-09)


### ⚡ 性能优化 (Performance)

* 细化 store 订阅与列表卡片记忆化，减少多窗口场景重渲染 ([7cdcf82](https://github.com/bohesocool/gemini-chat/commit/7cdcf8299d55ffead62f1bf0256eb588426b6a70))

### [0.2.20](https://github.com/bohesocool/gemini-chat/compare/v0.2.19...v0.2.20) (2026-06-09)


### ⚡ 性能优化 (Performance)

* Markdown 流式渲染按块记忆化，避免整段重复解析 ([14d7eaa](https://github.com/bohesocool/gemini-chat/commit/14d7eaa64adfae71877300df5fe23c2b059981af))


### 🔧 其他更改 (Chores)

* 移除单元测试文件并同步 package-lock ([a69c5e2](https://github.com/bohesocool/gemini-chat/commit/a69c5e29eff9c3352d67d63dd4b5b1395bdd1424))

### [0.2.19](https://github.com/bohesocool/gemini-chat/compare/v0.2.18...v0.2.19) (2026-04-22)


### 🔧 其他更改 (Chores)

* enhance Dockerfile by adding additional Nginx directories for improved logging and permissions ([58eddf7](https://github.com/bohesocool/gemini-chat/commit/58eddf7bfa8636fa4701b98e6ab113fac4ce2364))
* remove version specification from docker-compose and fix variable name in entrypoint script ([0594bbf](https://github.com/bohesocool/gemini-chat/commit/0594bbfd4064f2a0bcf6dc52987a59d20da2a28c))


### ♻️ 代码重构 (Code Refactoring)

* improve password hashing and verification logic for consistency and security ([c6cd7f1](https://github.com/bohesocool/gemini-chat/commit/c6cd7f10e2a507aa211f40f01f251b93fd95bff5))
* update Nginx configuration and Dockerfile for improved structure and permissions ([5163b68](https://github.com/bohesocool/gemini-chat/commit/5163b684653faccbd1e21483823d9a2af1ba80c4))


### ✨ 新功能 (Features)

* enhance WebDAV configuration and sync functionality with new database model and UI updates ([a596264](https://github.com/bohesocool/gemini-chat/commit/a5962644f6212b6515461f379022b60e0cd11224))
* enhance WebDAV sync functionality and update environment configurations ([74c0a1e](https://github.com/bohesocool/gemini-chat/commit/74c0a1e9c4af8561ae437eaa0617ffdbfb799952))
* update .env.example and docker-compose.yml for enhanced configuration options and improved WebDAV support ([cd2bc31](https://github.com/bohesocool/gemini-chat/commit/cd2bc31b65a1877979351976df2c1f585806c2cc))

### [0.2.18](https://github.com/bohesocool/gemini-chat/compare/v0.2.17...v0.2.18) (2026-03-12)


### ✨ 新功能 (Features)

* update image config, model params and UI improvements ([00b813b](https://github.com/bohesocool/gemini-chat/commit/00b813bef3a3ed7d4f441eb46c3005be9cbda53e))

### [0.2.17](https://github.com/bohesocool/gemini-chat/compare/v0.2.16...v0.2.17) (2026-02-24)


### ✨ 新功能 (Features)

* add gemini-3.1-pro-preview model ([d5f1414](https://github.com/bohesocool/gemini-chat/commit/d5f14140f51cc95a081018ad08b66ef963d1eb95))

### [0.2.16](https://github.com/bohesocool/gemini-chat/compare/v0.2.15...v0.2.16) (2026-02-24)


### 🐛 Bug 修复 (Bug Fixes)

* add missing activeSubTopicId to ChatWindow mocks in tests ([78a864f](https://github.com/bohesocool/gemini-chat/commit/78a864f1ff0c115812e421c79e9aea3be10136c5))
* exclude test files from production tsconfig to fix Docker build ([4b8c0fe](https://github.com/bohesocool/gemini-chat/commit/4b8c0fe364990ad95ab71c758759c46e9be9e016))

### [0.2.15](https://github.com/bohesocool/gemini-chat/compare/v0.2.14...v0.2.15) (2026-02-24)


### ✨ 新功能 (Features)

* add AI title generation and related improvements ([04ff6f0](https://github.com/bohesocool/gemini-chat/commit/04ff6f084608b805f1d3aa7e24fa7401fad908c0))

### [0.2.14](https://github.com/bohesocool/gemini-chat/compare/v0.2.13...v0.2.14) (2026-02-09)


### 🔧 其他更改 (Chores)

* **docker:** enhance security and performance with non-root user and debouncing ([ff4aa95](https://github.com/bohesocool/gemini-chat/commit/ff4aa95474402ba80cbb746f3fdef2a599fb249e))


### ♻️ 代码重构 (Code Refactoring)

* **logging:** replace console methods with centralized logger service ([1a6b9ea](https://github.com/bohesocool/gemini-chat/commit/1a6b9ea4bc34295db0689adfc108ca8c528b254c))


### 🐛 Bug 修复 (Bug Fixes)

* **ErrorBoundary:** improve error logging with structured object format ([6d2852d](https://github.com/bohesocool/gemini-chat/commit/6d2852da0afeaa91667e81f5cb3bd1a4d9630e3a))


### ✨ 新功能 (Features)

* 添加屏幕共享功能支持 Live API ([8f49515](https://github.com/bohesocool/gemini-chat/commit/8f495159ec233d40ca5f8eeb2b10eefbf8ce5f30))

### [0.2.13](https://github.com/bohesocool/gemini-chat/compare/v0.2.12...v0.2.13) (2026-02-08)


### ⚡ 性能优化 (Performance)

* **Layout:** memoize SidebarContext value to prevent unnecessary re-renders ([0d7136d](https://github.com/bohesocool/gemini-chat/commit/0d7136d2e294c55be4b573185645d670347f6044))


### ♻️ 代码重构 (Code Refactoring)

* **chatWindow:** migrate to Immer for immutable state updates ([b298d21](https://github.com/bohesocool/gemini-chat/commit/b298d21b3402d28137421d5bcb0cd05a97fbe6b2))
* **model:** extract generic chain resolution logic for reusable redirect handling ([4820cd3](https://github.com/bohesocool/gemini-chat/commit/4820cd324dd506d087826fad5894bc9338ee2a8d))
* remove MessageList component in favor of shared component library ([2017fe6](https://github.com/bohesocool/gemini-chat/commit/2017fe6466e249f5964b3cf0d415b4bcb63db84a))
* **storage:** extract storage configuration descriptors for import/export ([03ea2d8](https://github.com/bohesocool/gemini-chat/commit/03ea2d84cb5cdc03641ae4dc7fd1f18850c77e61))


### ✨ 新功能 (Features)

* 优化移动端响应式布局和侧边栏交互 ([b8826d6](https://github.com/bohesocool/gemini-chat/commit/b8826d6c7dd7774de1d69ef0a8997e1e0f221f9b))

### [0.2.12](https://github.com/bohesocool/gemini-chat/compare/v0.2.11...v0.2.12) (2026-02-07)


### ♻️ 代码重构 (Code Refactoring)

* **gemini:** enhance API message handling and introduce orchestrateSend function ([49e0d73](https://github.com/bohesocool/gemini-chat/commit/49e0d73370143571dfd979ed107ecab2b804714c))


### ✨ 新功能 (Features)

* 提取共享图标组件库，统一图标管理 ([411a2c1](https://github.com/bohesocool/gemini-chat/commit/411a2c18757ee5130e4bd5d137ad5cfab9001c70))

### [0.2.11](https://github.com/bohesocool/gemini-chat/compare/v0.2.10...v0.2.11) (2026-02-07)


### ✨ 新功能 (Features)

* **security:** enhance security headers in nginx configuration ([b029c00](https://github.com/bohesocool/gemini-chat/commit/b029c00f79a32a34c2e613fb4af7e4993cdb4840))
* update before v0.2.11 release ([14d1dbf](https://github.com/bohesocool/gemini-chat/commit/14d1dbf43748a7b9c46d0f29055df0c4dfab5301))

### [0.2.10](https://github.com/bohesocool/gemini-chat/compare/v0.2.9...v0.2.10) (2026-02-06)


### 🔧 其他更改 (Chores)

* update README with new image assets and translations for English version ([352a34e](https://github.com/bohesocool/gemini-chat/commit/352a34ecff2557d4cff5ad146ad327a919e924f5))


### 🐛 Bug 修复 (Bug Fixes)

* **security:** migrate API key from URL query params to request headers ([399f882](https://github.com/bohesocool/gemini-chat/commit/399f882741c1cac829008023f4cab5d443b2a8dc))

### [0.2.9](https://github.com/bohesocool/gemini-chat/compare/v0.2.8...v0.2.9) (2026-02-06)


### 🔧 其他更改 (Chores)

* **storage:** update database version to 4 to resolve version conflicts ([286e7f7](https://github.com/bohesocool/gemini-chat/commit/286e7f719b7ddceed62a9677bc5504e6a3d85486))


### ♻️ 代码重构 (Code Refactoring)

* **chatWindow:** extract message helpers and simplify messageActions ([9143697](https://github.com/bohesocool/gemini-chat/commit/91436972e062205ed87ca546e0d035c3aeeb83cf))

### [0.2.8](https://github.com/bohesocool/gemini-chat/compare/v0.2.7...v0.2.8) (2026-02-02)


### ✨ 新功能 (Features)

* improve image copy and timeline sticky features ([dce5878](https://github.com/bohesocool/gemini-chat/commit/dce5878eeb0f37db6cdf586f80cf808106afeb5e))

### [0.2.7](https://github.com/bohesocool/gemini-chat/compare/v0.2.6...v0.2.7) (2026-01-29)


### ♻️ 代码重构 (Code Refactoring)

* **theme:** refine Snow White theme polish with unified borders and smooth transitions ([fc71604](https://github.com/bohesocool/gemini-chat/commit/fc716044b11b514461fd53a7b0ffb264c7534222))


### 🔧 其他更改 (Chores)

* 更新聊天界面组件和样式 ([256ccb1](https://github.com/bohesocool/gemini-chat/commit/256ccb117879bd45f7641f66f063d95eb58ed512))

### [0.2.6](https://github.com/bohesocool/gemini-chat/compare/v0.2.5...v0.2.6) (2026-01-25)


### ✨ 新功能 (Features)

* 更新布局组件和聊天窗口卡片，添加标题栏组件 ([26bf2e6](https://github.com/bohesocool/gemini-chat/commit/26bf2e6bf322d026b4d6bb5ecca19019572ea355))
* 优化UI交互体验 - 历史对话悬停时模型名渐隐显示编辑删除按钮 - 修复发送按钮与输入框垂直居中对齐 ([dbbeaf1](https://github.com/bohesocool/gemini-chat/commit/dbbeaf18a759c024617991a4b4a3e2381706ae75))


### 🔧 其他更改 (Chores)

* update UI and translations ([2f143be](https://github.com/bohesocool/gemini-chat/commit/2f143bef0c36224a6ff216b5559bc625ed3612ed))

### [0.2.5](https://github.com/bohesocool/gemini-chat/compare/v0.2.4...v0.2.5) (2026-01-21)


### ✨ 新功能 (Features)

* 添加国际化支持并删除测试文件 ([ec46ed6](https://github.com/bohesocool/gemini-chat/commit/ec46ed68b5207e6680e9caafe122c5eb88bef09b))

### [0.2.4](https://github.com/bohesocool/gemini-chat/compare/v0.2.3...v0.2.4) (2026-01-20)


### ✨ 新功能 (Features)

* **ui:** enhance cross-platform UI consistency and navigation UX ([2376481](https://github.com/bohesocool/gemini-chat/commit/23764813308071a361e72ee601a24b27a54fc08c))


### 🔧 其他更改 (Chores)

* 准备发布v0.2.4 ([bca2f15](https://github.com/bohesocool/gemini-chat/commit/bca2f15526c5ca38b8968846c5ec80e7e5e5f6dc))

### [0.2.4](https://github.com/bohesocool/gemini-chat/compare/v0.2.3...v0.2.4) (2026-01-20)


### ✨ 新功能 (Features)

* **ui:** enhance cross-platform UI consistency and navigation UX ([2376481](https://github.com/bohesocool/gemini-chat/commit/23764813308071a361e72ee601a24b27a54fc08c))

### [0.2.3](https://github.com/bohesocool/gemini-chat/compare/v0.2.2...v0.2.3) (2026-01-19)


### 🔧 其他更改 (Chores)

* update workflow and model service ([12ea1f9](https://github.com/bohesocool/gemini-chat/commit/12ea1f91e5240fcb76364a329d7e05313f90705c))

### [0.2.2](https://github.com/bohesocool/gemini-chat/compare/v0.2.1...v0.2.2) (2026-01-19)


### 🔧 其他更改 (Chores)

* add release script ([32034f3](https://github.com/bohesocool/gemini-chat/commit/32034f36f2183e8e708286bed705c5fe4abac5b3))

### [0.2.1](https://github.com/bohesocool/gemini-chat/compare/v0.2.0...v0.2.1) (2026-01-18)


### 🔧 其他更改 (Chores)

* **release:** 0.2.0 ([69f52b4](https://github.com/bohesocool/gemini-chat/commit/69f52b4064cf517fc325b98d6ed0eeaab8ef86a3))


### ✨ 新功能 (Features)

* add macOS build support and GitHub Actions workflow ([edd413c](https://github.com/bohesocool/gemini-chat/commit/edd413c0be3e4d371e5974af30b0645bf5a535b9))

# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.
