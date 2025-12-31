# Gemini Chat

<p align="center">
  <img src="public/vite.svg" alt="Gemini Chat Logo" width="80" height="80">
</p>

<p align="center">
  一个功能丰富的 Google Gemini API 聊天客户端，支持多模型、图片生成、思维链展示等高级功能。
</p>

<p align="center">
  <a href="https://github.com/bohesocool/gemini-chat">GitHub</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#docker-部署">Docker 部署</a> •
  <a href="#配置说明">配置说明</a>
</p>

---

## 功能特性

### 🤖 多模型支持

- **Gemini 3 系列**: Gemini 3 Pro、Gemini 3 Pro Image（最智能的多模态模型）
- **Gemini 2.5 系列**: Gemini 2.5 Pro、Flash、Flash-Lite、Flash-Image
- **Gemini 2.0 系列**: Gemini 2.0 Flash、Flash-Lite
- 支持自定义 API 端点（兼容第三方代理）
- 每个模型独立的参数配置

### 💬 聊天功能

- **多窗口管理**: 创建多个独立的聊天窗口，每个窗口可配置不同的模型和参数
- **子话题对话**: 在同一窗口内创建多个子话题，方便组织不同的对话主题
- **消息编辑**: 支持编辑已发送的消息并重新生成回复
- **流式响应**: 实时显示 AI 回复，支持随时停止生成
- **思维链展示**: 支持显示模型的思考过程（Gemini 2.5/3 系列）
- **Markdown 渲染**: 完整支持 Markdown 格式，包括代码高亮和 LaTeX 数学公式

### 🖼️ 图片功能

- **图片上传**: 支持上传图片进行多模态对话
- **图片生成**: 使用 Imagen 模型生成图片（Gemini 3 Pro Image、2.5 Flash Image）
- **图片画廊**: 集中管理所有生成的图片
- **全屏预览**: 支持图片全屏查看和下载

### ⚙️ 高级配置

- **生成参数**: Temperature、Top-P、Top-K、最大输出 Token 等
- **思考预算**: 控制模型思考深度（Gemini 2.5 系列支持 Token 预算配置）
- **思考等级**: 选择思考深度级别（Gemini 3 系列支持 Low/High 等级）
- **媒体分辨率**: 调整输入图片/视频的处理分辨率
- **系统指令**: 为每个聊天窗口设置独立的系统提示词

### 🔐 安全功能

- **密码保护**: 支持通过环境变量 `VITE_AUTH_PASSWORD` 设置密码
- **默认密码**: 未设置环境变量时使用默认密码 `adminiadmin`，首次登录后需修改
- **本地存储**: 所有数据存储在浏览器本地（IndexedDB），不上传到服务器

### 🎨 界面特性

- **深色/浅色主题**: 支持手动切换或跟随系统
- **响应式设计**: 适配桌面和移动设备
- **可折叠侧边栏**: 最大化聊天区域
- **调试面板**: 查看 API 请求详情、响应时间、Token 使用量

---

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn 或 pnpm

### 本地开发

```bash
# 克隆项目
git clone https://github.com/bohesocool/gemini-chat.git
cd gemini-chat

# 安装依赖
npm install

# （可选）配置自定义密码
cp .env.example .env
# 编辑 .env 文件，设置 VITE_AUTH_PASSWORD=your_password

# 启动开发服务器
npm run dev
```

访问 http://localhost:5173 即可使用。

如果不设置 `VITE_AUTH_PASSWORD`，将使用默认密码 `adminiadmin`，首次登录后会提示修改。

### 构建生产版本

```bash
# 构建
npm run build

# 预览构建结果
npm run preview
```

---

## Docker 部署

### 方式一：直接拉取镜像运行（推荐）

最简单的部署方式，无需克隆代码：

```bash
# 拉取镜像
docker pull bohesocool/gemini-chat:latest

# 运行容器（使用默认密码 adminiadmin）
docker run -d \
  -p 5173:80 \
  --name gemini-chat \
  bohesocool/gemini-chat:latest

# 或者设置自定义密码
docker run -d \
  -p 5173:80 \
  -e VITE_AUTH_PASSWORD=your_password \
  --name gemini-chat \
  bohesocool/gemini-chat:latest
```

### 方式二：使用 Docker Compose

适合需要自定义配置或本地构建的场景：

```bash
# 克隆项目
git clone https://github.com/bohesocool/gemini-chat.git
cd gemini-chat

# （可选）编辑 docker-compose.yml 设置密码
# 修改 VITE_AUTH_PASSWORD 环境变量

# 启动服务
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 手动构建镜像

如果需要自定义构建：

```bash
# 克隆项目
git clone https://github.com/bohesocool/gemini-chat.git
cd gemini-chat

# 构建镜像
docker build -t gemini-chat .

# 运行容器
docker run -d \
  -p 5173:80 \
  -e VITE_AUTH_PASSWORD=your_password \
  --name gemini-chat \
  gemini-chat
```

### 密码说明

- 如果不设置 `VITE_AUTH_PASSWORD` 环境变量，将使用默认密码 `adminiadmin`
- 首次使用默认密码登录后会提示修改密码
- 设置了自定义密码后，不会强制要求修改

### 访问应用

部署完成后访问 http://localhost:5173 即可使用。

> **提示**: 应用同时支持 HTTP 和 HTTPS 环境部署。

---

## 配置说明

### API 配置

1. 打开应用后，点击侧边栏底部的设置图标
2. 在「API 设置」中填入你的 Google AI API Key
3. API 端点留空将使用官方地址，也可填入第三方代理地址

### 获取 API Key

1. 访问 [Google AI Studio](https://aistudio.google.com/)
2. 登录 Google 账号
3. 点击「Get API Key」获取密钥

### 模型参数说明

| 参数 | 说明 | 默认值 |
|------|------|--------|
| Temperature | 控制输出随机性，越高越有创意 | 1.0 |
| Top-P | 核采样参数 | 0.95 |
| Top-K | 限制候选 Token 数量 | 40 |
| Max Output Tokens | 最大输出长度 | 模型默认 |
| Thinking Budget | 思考预算（仅 2.5 系列） | 动态 |

---

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 18 + TypeScript |
| 构建工具 | Vite 6 |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS 3 |
| Markdown | react-markdown + rehype-highlight + rehype-katex |
| 本地存储 | IndexedDB (idb) |
| 部署 | Docker + Nginx |

---

## 常见问题

### Q: API 请求失败怎么办？

1. 检查 API Key 是否正确
2. 检查网络连接
3. 如果在国内使用，可能需要配置代理端点

### Q: 如何清除所有数据？

在浏览器开发者工具中清除 IndexedDB 和 LocalStorage 数据。

### Q: 支持哪些图片格式？

支持 JPEG、PNG、WebP、GIF 格式，单张图片最大 20MB。

---

## 许可证

本项目采用 [MIT License](LICENSE) 开源许可证。

---

## 致谢

- [Google Gemini API](https://ai.google.dev/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
