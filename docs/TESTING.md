# 远程存储 / 鉴权 / WebDAV 同步 实操测试指南（Ubuntu 服务器版）

> **适用场景**：本地 Windows 开发机，通过 SSH 连接 Ubuntu/Debian 服务器（有公网 IP），在服务器上用 Docker Compose 部署并测试"数据库 + WebDAV + 后端鉴权"整套新功能。
>
> **测试数据库范围**：SQLite、MySQL、PostgreSQL 全部覆盖。
>
> **测试路线**：先跑通最小闭环（SQLite），再分别切换到 MySQL / Postgres 验证多 provider 方案。WebDAV 部分在服务器本地额外起一个 `dufs` 容器做"对端"，不用依赖外部存储。

---

## 目录

- [0. 前置准备：登录服务器、装 Docker、拉代码](#0-前置准备登录服务器装-docker拉代码)
- [1. 场景 A：IndexedDB 模式（回归基线）](#1-场景-aindexeddb-模式回归基线)
- [2. 场景 B：SQLite 数据库模式（主线）](#2-场景-bsqlite-数据库模式主线)
- [3. 场景 C：MySQL 数据库模式](#3-场景-cmysql-数据库模式)
- [4. 场景 D：PostgreSQL 数据库模式](#4-场景-dpostgresql-数据库模式)
- [5. 场景 E：WebDAV 自动备份（gzip + AES-256-GCM）](#5-场景-ewebdav-自动备份gzip--aes-256-gcm)
- [6. 场景 F：IndexedDB → 服务端数据迁移](#6-场景-findexeddb--服务端数据迁移)
- [7. 场景 G：鉴权 & 安全加固](#7-场景-g鉴权--安全加固)
- [8. 场景 H：请求校验 / 事务 / 限额](#8-场景-h请求校验--事务--限额)
- [9. 场景 I：后端不可用时的降级行为](#9-场景-i后端不可用时的降级行为)
- [10. 公网暴露的安全加固（测试完请务必做）](#10-公网暴露的安全加固测试完请务必做)
- [11. 常见问题 & 排错](#11-常见问题--排错)
- [12. 收尾 & 清理](#12-收尾--清理)
- [验证通过 Checklist](#验证通过-checklist)

---

## 0. 前置准备：登录服务器、装 Docker、拉代码

### 0.1 登录服务器

```bash
# Windows Powershell 本地
ssh root@<你的服务器公网IP>

# 建议在服务器上用 tmux 或 screen 保持会话，避免 SSH 断开后测试流程中断
sudo apt install -y tmux
tmux new -s test     # 下次 ssh 上来用 tmux attach -t test
```

> 下文里凡是出现 `SERVER_IP`，都是指你的服务器公网 IP；浏览器访问时请把它替换成真实 IP。

### 0.2 安装 Docker & Docker Compose Plugin（Ubuntu）

如果服务器上还没装 Docker：

```bash
# 卸载老版本（如有）
sudo apt remove -y docker docker-engine docker.io containerd runc

# 安装依赖
sudo apt update
sudo apt install -y ca-certificates curl gnupg

# 添加 Docker 官方 GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# 添加 apt 源
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 docker + compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# 验证
docker --version
docker compose version

# 如果想让当前用户不用 sudo 就能跑 docker，执行一次就行：
sudo usermod -aG docker $USER
# 然后退出再重新 ssh 上来使其生效
```

> 国内服务器拉取 `docker.io` 可能很慢。如果卡住，可以加一份镜像加速：
>
> ```bash
> sudo mkdir -p /etc/docker
> sudo tee /etc/docker/daemon.json <<'EOF'
> { "registry-mirrors": ["https://docker.m.daocloud.io", "https://dockerproxy.com"] }
> EOF
> sudo systemctl restart docker
> ```

### 0.3 拉代码、切到测试分支

```bash
cd /opt
sudo mkdir -p gemini-chat-test && sudo chown $USER:$USER gemini-chat-test
cd gemini-chat-test

# 从 GitHub / 内部 Git 仓库拉取当前代码
git clone <你的仓库地址> .
# 或者在本地 git push 到一个远程，然后在服务器 pull
```

> 如果你是从 Windows 本地用 `scp` 或 `rsync` 同步过去的：
>
> ```powershell
> # Windows PowerShell（在项目根目录执行）
> scp -r . root@SERVER_IP:/opt/gemini-chat-test/
> # 更推荐 rsync（需要 git bash / wsl）：
> rsync -avz --exclude 'node_modules' --exclude '.git' ./ root@SERVER_IP:/opt/gemini-chat-test/
> ```

### 0.4 开放必要的防火墙端口（临时）

测试阶段需要开放（公网访问）：

| 端口 | 用途 | 何时需要 |
| --- | --- | --- |
| 5173 | 前端 + API 入口 | 全程 |
| 5000 | dufs WebDAV 管理面板 | 场景 E |
| 3306 | 外部直连 MySQL（可选） | 场景 C 诊断 |
| 5432 | 外部直连 PostgreSQL（可选） | 场景 D 诊断 |

```bash
# 如果服务器有 ufw：
sudo ufw allow 5173/tcp
sudo ufw allow 5000/tcp
# sudo ufw allow 3306/tcp  # 仅测试期开，测试完立刻关
# sudo ufw allow 5432/tcp
sudo ufw reload
```

> **云厂商安全组** 也要同步放行（阿里云 / 腾讯云 / AWS）。
>
> **警告**：测试完请立即 `sudo ufw delete allow 5173/tcp` 关掉，不要让没配 HTTPS 的测试环境长期挂在公网。

### 0.5 本地编译冒烟（在服务器上做一次）

把明显的代码错误先踩干净，不要打成镜像再发现：

```bash
cd /opt/gemini-chat-test

# 后端
cd server
docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm install && npx tsc --noEmit && npm run build"
cd ..

# 前端
docker run --rm -v "$PWD":/app -w /app node:20-alpine \
  sh -c "npm install && npx tsc -b && npm run build"
```

**预期**：两条都能走完，输出不出错。产物分别在 `server/dist/` 和 `dist/`。

> 服务器如果装了 Node.js 20+，也可以不用 docker 直接 `npm install && npm run build`。

---

## 1. 场景 A：IndexedDB 模式（回归基线）

**目标**：确认"不开数据库"时原有行为完全不变（浏览器 IndexedDB 存储）。

### 1.1 配置 `.env`

```bash
cd /opt/gemini-chat-test
cp .env.example .env
# 编辑 .env：只保留这一行即可
sed -i 's/^.*VITE_AUTH_PASSWORD=.*/VITE_AUTH_PASSWORD=123456/' .env
grep -v '^#' .env | grep -v '^$'
# 输出应该只有：VITE_AUTH_PASSWORD=123456
```

`docker-compose.yml` 保持默认（数据库、WebDAV 相关环境变量全部注释）。

### 1.2 启动

```bash
docker compose up --build -d
docker compose logs -f gemini-chat
```

**预期日志**：

```
=== Docker Entrypoint ===
VITE_AUTH_PASSWORD: set
DB_ENABLED: false
WEBDAV_ENABLED: false
=== Starting nginx (static mode) ===
```

用 `Ctrl+C` 退出日志跟踪（容器继续运行）。

### 1.3 功能回归

浏览器打开 `http://SERVER_IP:5173`：

1. 输入 `123456` 登录 → 进入主界面。
2. 创建 2 个聊天窗口，每个各加 2 个子主题，任选 1 个发送一条消息（可以不配置真实 Gemini Key，只观察 UI 行为）。
3. F12 打开 DevTools：
   - **Application → IndexedDB → `gemini-chat-db`**：能看到 `chatWindows` / `subTopics` / `bookmarks` / `templates` / `images` 等 objectStore，数据随操作增长 ✅
   - **Network**：除 `/config.js` 外，**不应** 出现任何 `/api/v1/...` 请求 ✅
   - **Console**：不应弹"数据迁移"对话框 ✅
4. 关闭标签页再打开，登录状态和数据仍在。

### 1.4 健康检查（负向用例）

```bash
curl -i http://SERVER_IP:5173/api/v1/health
```

**预期**：`404`（nginx 默认 404，因为后端没启动，这是正确行为）。

---

## 2. 场景 B：SQLite 数据库模式（主线）

**目标**：数据从浏览器下沉到服务端 SQLite 文件，所有读写走 REST API 并通过鉴权中间件。

### 2.1 生成一个强 JWT secret

```bash
openssl rand -hex 32
# 例：复制这个 64 位 16 进制字符串，下面会用到
```

### 2.2 修改 `docker-compose.yml`

把 `environment` 节里这几行取消注释并填值：

```yaml
    environment:
      - VITE_AUTH_PASSWORD=${VITE_AUTH_PASSWORD:-}

      - DB_ENABLED=true
      - DB_TYPE=sqlite
      - SQL_DSN=file:/app/data/gemini-chat.db

      - JWT_SECRET=把刚才 openssl 生成的字符串贴这里
      - NODE_ENV=production
```

> **不要** 把 JWT_SECRET 直接写死在仓库里。测试完记得换。

### 2.3 重新启动 & 观察启动日志

```bash
docker compose down
docker compose up --build -d
docker compose logs -f gemini-chat
```

**预期关键日志**：

```
DB_ENABLED: true
=== Starting Node.js server (database mode) ===
DB provider: sqlite
Loaded Prisma client for sqlite
No migrations found; running prisma db push (first-time init)...
=== Gemini Chat Server ===
DB_ENABLED: true
DB_PROVIDER: sqlite
WEBDAV_ENABLED: false
Database connected successfully
Server listening on port 8080
```

**异常信号**：

- `Pre-built Prisma client for sqlite not found` → Docker 构建阶段没跑完，重试 `docker compose build --no-cache`。
- `EACCES: permission denied` 写 `/app/data` → 旧 volume 权限问题：`docker compose down -v` 清掉再来。
- `Error: Can't reach database server` → SQL_DSN 拼错。

### 2.4 浏览器端验证

打开 `http://SERVER_IP:5173`：

1. 登录 `123456`。
2. F12 → **Network** 面板：
   - 登录提交时，应看到 `POST /api/v1/auth/login` → `200`，响应体含 `{ "token": "xxx.yyy.zzz", "expiresIn": 604800000 }`。
   - 创建 / 编辑聊天窗口时，应看到 `PUT /api/v1/chat-windows/:id` → `200`。
3. **Application → Local Storage**：`gemini-chat-server-token` 存在且不为空。
4. **Application → IndexedDB**：新操作 **不再** 写入（老数据可能还在，但不会增长）。
5. F5 刷新页面后数据仍在（来自服务端，不是浏览器）。
6. 在本地电脑的另一个浏览器（或无痕窗口）登录同一个 IP，应看到相同的数据 → 多端共享 ✅。

### 2.5 后端 API 黑盒测试（在服务器上用 curl）

```bash
SERVER=http://localhost:5173   # 在服务器上本地访问
# 如果在本地 Windows 跑 curl：SERVER=http://SERVER_IP:5173

# 1) 未鉴权 → 401
curl -i $SERVER/api/v1/chat-windows
# 预期：HTTP/1.1 401 Unauthorized
# 预期：{"error":"Authentication required"}

# 2) 登录拿 token
TOKEN=$(curl -s -X POST $SERVER/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"123456"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
echo "TOKEN=$TOKEN"
# 如果服务器没有 python3，用 jq：
# TOKEN=$(curl -s -X POST $SERVER/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)

# 3) 用 token 查列表
curl -i -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/chat-windows
# 预期：200 + JSON 数组

# 4) /auth/me
curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/auth/me
# 预期：{"authenticated":true,"authConfigured":true}

# 5) 详细健康检查（鉴权后才能拿到）
curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/health/detail
# 预期：{"status":"ok","dbEnabled":true,"webdavEnabled":false,"dbStatus":"connected"}

# 6) 匿名健康检查（对公网暴露的只有这个）
curl -s $SERVER/api/v1/health
# 预期：{"status":"ok"}
```

**从本地 Windows 访问公网 IP**（验证公网链路）：

```powershell
# 本地 Windows PowerShell
$SERVER = "http://SERVER_IP:5173"
curl.exe -s $SERVER/api/v1/health
```

### 2.6 检查 SQLite 数据库文件

```bash
docker compose exec gemini-chat ls -la /app/data/
# 预期看到 gemini-chat.db

# 如果容器内没有 sqlite3：
docker compose exec gemini-chat sh -c "apk add --no-cache sqlite 2>/dev/null || apt-get install -y sqlite3 2>/dev/null"

docker compose exec gemini-chat sqlite3 /app/data/gemini-chat.db ".tables"
# 预期看到：
# AppSetting        Bookmark          ChatWindow        ImageRecord
# ModelConfigStore  SubTopic          SyncState         Template

docker compose exec gemini-chat sqlite3 /app/data/gemini-chat.db "SELECT id, title FROM ChatWindow;"
# 预期：刚才在浏览器创建的聊天窗口都在
```

### 2.7 持久化验证

```bash
# 重启容器：数据必须还在
docker compose restart gemini-chat
# 浏览器 F5 → 数据仍在 ✅

# 停止再启动：数据也必须还在（volume chat_data 保留）
docker compose down
docker compose up -d
# 浏览器 F5 → 数据仍在 ✅

# 破坏性验证：清 volume
docker compose down -v
docker compose up -d
# 浏览器 F5 → 数据库被清空 ✅
```

---

## 3. 场景 C：MySQL 数据库模式

**目标**：验证多 provider 方案在运行时能切到 MySQL，构建期预生成的 Prisma client 被正确装载。

### 3.1 修改 `docker-compose.yml`

把 MySQL 服务块整块取消注释，并把 `gemini-chat` 的 `DB_TYPE` 改成 mysql：

```yaml
services:
  gemini-chat:
    # ...
    environment:
      - VITE_AUTH_PASSWORD=${VITE_AUTH_PASSWORD:-}
      - DB_ENABLED=true
      - DB_TYPE=mysql
      - SQL_DSN=mysql://root:123456@mysql:3306/gemini-chat
      - JWT_SECRET=你上一轮生成的那个
      - NODE_ENV=production
    depends_on:
      mysql:
        condition: service_healthy

  mysql:
    image: mysql:8.0
    container_name: gemini-chat-mysql
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: "123456"
      MYSQL_DATABASE: gemini-chat
      MYSQL_CHARSET: utf8mb4
      MYSQL_COLLATION: utf8mb4_unicode_ci
    ports:
      - "3306:3306"       # 测试期开，测试完删掉这行
    volumes:
      - mysql_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  chat_data:
  mysql_data:
```

### 3.2 彻底清空旧 SQLite 数据，重启

```bash
docker compose down -v
docker compose up --build -d
docker compose logs -f gemini-chat
```

**预期关键日志**：

```
DB provider: mysql
Loaded Prisma client for mysql
Running prisma db push (first-time init)...
=== Gemini Chat Server ===
DB_ENABLED: true
DB_PROVIDER: mysql
Database connected successfully
Server listening on port 8080
```

> `depends_on.condition: service_healthy` 会让 gemini-chat 等 MySQL 就绪（10-30 秒）。如果看到 "Can't reach database server" 过一会儿会自愈。

### 3.3 浏览器 / curl 验证

跟 2.4 / 2.5 完全一样。数据确实落在 MySQL：

```bash
docker compose exec mysql mysql -uroot -p123456 gemini-chat -e "SHOW TABLES;"
# 预期：AppSetting / Bookmark / ChatWindow / ImageRecord / ModelConfigStore / SubTopic / SyncState / Template

docker compose exec mysql mysql -uroot -p123456 gemini-chat -e "SELECT id, title, updatedAt FROM ChatWindow;"
# 预期：看到你刚创建的聊天窗口
```

### 3.4 字符集验证（曾经是 MySQL 的坑）

```bash
# 在浏览器里创建一个标题包含 "你好 🎉 emoji" 的窗口
docker compose exec mysql mysql -uroot -p123456 gemini-chat -e "SELECT id, title, HEX(title) FROM ChatWindow WHERE title LIKE '%🎉%';"
# 预期：title 正确显示中文 + emoji，不乱码（得益于 utf8mb4）
```

---

## 4. 场景 D：PostgreSQL 数据库模式

**目标**：同 C，换 Postgres 验证第三种 provider。

### 4.1 修改 `docker-compose.yml`

参考场景 C 的方式，把 `postgres` 服务块整块放开，gemini-chat 的环境变量改成：

```yaml
    environment:
      - DB_ENABLED=true
      - DB_TYPE=postgresql
      - SQL_DSN=postgresql://root:123456@postgres:5432/gemini-chat
      - JWT_SECRET=...
      - NODE_ENV=production
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    container_name: gemini-chat-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: root
      POSTGRES_PASSWORD: "123456"
      POSTGRES_DB: gemini-chat
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U root -d gemini-chat"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  chat_data:
  postgres_data:
```

> 如果你同时保留了 `mysql` 服务块，要记得把 `gemini-chat` 的 `depends_on` 改为依赖 postgres，否则 gemini-chat 起不来。

### 4.2 重启 & 验证

```bash
docker compose down -v
docker compose up --build -d
docker compose logs -f gemini-chat
```

**预期日志** 里 `DB_PROVIDER: postgresql` / `Loaded Prisma client for postgresql`。

数据库验证：

```bash
docker compose exec postgres psql -U root -d gemini-chat -c '\dt'
# 预期：同样 8 张表（Prisma 表名带双引号区分大小写）

docker compose exec postgres psql -U root -d gemini-chat -c 'SELECT id, title FROM "ChatWindow";'
```

### 4.3 跨 provider 迁移（选做）

跨 provider 不能直接切换，正确做法：

```bash
# 1) 在当前 provider（假设是 MySQL）导出 dump
TOKEN=$(curl -s -X POST http://SERVER_IP:5173/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)
curl -s -H "Authorization: Bearer $TOKEN" http://SERVER_IP:5173/api/v1/sync/dump > dump-mysql.json
ls -lh dump-mysql.json

# 2) docker compose down -v，切到 postgres 重启

# 3) 重新登录拿新 token，把 dump 灌回去
TOKEN_NEW=$(curl -s -X POST http://SERVER_IP:5173/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)
curl -s -X POST -H "Authorization: Bearer $TOKEN_NEW" -H "Content-Type: application/json" \
  --data-binary @dump-mysql.json \
  http://SERVER_IP:5173/api/v1/sync/migrate-from-indexeddb
# 预期：{"success":true}

# 4) 浏览器刷新应看到从 MySQL 搬过来的所有数据
```

---

## 5. 场景 E：WebDAV 自动备份（gzip + AES-256-GCM）

**目标**：在 compose 里顺便起一个 `dufs` 作 WebDAV 对端，验证自动备份、加密、手动同步、恢复、超时、并发互斥。

### 5.1 在 `docker-compose.yml` 加一个 dufs 服务

```yaml
  dufs:
    image: sigoden/dufs
    container_name: gemini-chat-dufs
    restart: unless-stopped
    ports:
      - "5000:5000"    # 浏览器可视化用，测试完可删
    volumes:
      - dufs_data:/data
    command: /data --auth 'admin:secret@/:rw' --allow-all

volumes:
  chat_data:
  mysql_data:      # 如果你在跑 MySQL
  postgres_data:   # 如果你在跑 Postgres
  dufs_data:
```

### 5.2 给 gemini-chat 加 WebDAV 环境变量

把现有 `environment` 节追加：

```yaml
      - WEBDAV_ENABLED=true
      - WEBDAV_URL=http://dufs:5000/
      - WEBDAV_USER=admin
      - WEBDAV_PASSWORD=secret
      - WEBDAV_SYNC_INTERVAL=30
      # - WEBDAV_ENCRYPTION_KEY=my-test-enc-key-2026   # 先留空测试明文，下一步再开
```

> **关键**：`WEBDAV_URL` 用服务名 `dufs`，不用 `localhost` 也不用 `host.docker.internal`——在同一个 compose 网络里，容器之间通过服务名直接通信。

### 5.3 重启 & 观察自动同步

```bash
docker compose up -d
docker compose logs -f gemini-chat
```

**预期**：`WebDAV sync started (interval: 30s)`。

1. 浏览器登录 → 创建 1 个聊天窗口 → 发送 1 条消息。
2. 写操作会触发内部 `markDirty()`。
3. 等 ≤ 30 秒，日志里应出现：

```
[WebDAV] Scheduled sync completed at 2026-xx-xxTxx:xx:xx.xxxZ
```

4. 浏览器打开 `http://SERVER_IP:5000`，用 `admin` / `secret` 登录 dufs：
   - 应看到目录 `/gemini-chat/`，里面有 `backup-<timestamp>.json.gz` 文件 ✅。

### 5.4 验证 gzip 内容正确

```bash
# 在服务器上：
docker compose exec dufs sh -c 'ls -la /data/gemini-chat/'

# 复制一个出来解压看
docker compose cp dufs:/data/gemini-chat/backup-xxxxx.json.gz /tmp/backup.json.gz
gzip -d /tmp/backup.json.gz
head -c 500 /tmp/backup.json
# 预期：看到 {"version":"2.0","exportedAt":...,"chatWindows":[...],...}
```

### 5.5 打开加密再测一遍

编辑 `docker-compose.yml` 把加密 key 那行取消注释：

```yaml
      - WEBDAV_ENCRYPTION_KEY=my-test-enc-key-2026
```

```bash
docker compose up -d       # 只重启 gemini-chat
# 浏览器再做一次写入，触发新备份
```

**预期**：`dufs` 里新文件扩展名变为 `backup-xxxxx.json.gz.enc`。

**验证加密头**：

```bash
docker compose cp dufs:/data/gemini-chat/backup-xxxxx.json.gz.enc /tmp/enc.bin
head -c 6 /tmp/enc.bin
# 预期输出：GCENC1
```

**负向用例**：把 `WEBDAV_ENCRYPTION_KEY` 环境变量删掉重启，然后手动触发恢复：

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)
curl -i -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/import
# 预期：500，生产环境响应只有 {"error":"Internal server error","requestId":"..."}
docker compose logs gemini-chat | grep -i 'encryption'
# 日志里能看到 "Encrypted backup detected but WEBDAV_ENCRYPTION_KEY is not configured"
```

把 key 加回来重启，再次 import 就能成功。

### 5.6 手动触发 & 状态查询

```bash
TOKEN=$(curl -s -X POST http://localhost:5173/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)

# 手动上传一次
curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/export
# 预期：{"success":true,"path":"/gemini-chat/backup-..."}

# 当前同步状态
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/status
# 预期：webdavEnabled:true, lastSyncAt:<timestamp>, lastSyncStatus:"success"

# 列出备份
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/backups
# 预期：按时间倒序的路径列表

# 从最新备份恢复
curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/import
# 预期：{"success":true}
```

### 5.7 并发互斥

快速连发两次手动 export：

```bash
(curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/export &
 curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/export &
 wait)
```

**预期**：两次都返回 `success`，但日志里看到两次同步**按先后串行执行**（`syncInFlight` mutex 生效，不会同时上传）。

### 5.8 WebDAV 不可达 → 超时

编辑 `docker-compose.yml` 把 `WEBDAV_URL` 改为一个黑洞地址：

```yaml
      - WEBDAV_URL=http://10.255.255.1:9999/
```

```bash
docker compose up -d
TOKEN=$(curl -s -X POST http://localhost:5173/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)

# 测试一次手动 export，计时
time curl -s -X POST -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/export
```

**预期**：
- 约 **30 秒** 后返回 `500`（不是永远卡住）。
- 响应体或日志里能看到 `WebDAV request timed out after 30000ms`。
- 再查 status：`lastSyncStatus: "error"`，`lastError` 含超时文本。

测完把 `WEBDAV_URL` 改回 `http://dufs:5000/`。

### 5.9 保留条数

`MAX_BACKUPS = 10`。把 `WEBDAV_SYNC_INTERVAL=15`（秒），连续创建/修改 12 次聊天窗口（每次 5-10 秒），观察：

```bash
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/backups | jq length
# 预期：10
```

---

## 6. 场景 F：IndexedDB → 服务端数据迁移

**目标**：老用户从纯 IndexedDB 升级到数据库模式时的迁移 UX。

### 6.1 制造本地旧数据

1. 先把 `docker-compose.yml` 里 `DB_ENABLED` 改成 `false`（或整行注释），其余保持。
2. `docker compose up -d`。
3. **清空浏览器 state**：DevTools → Application → Clear site data（彻底清理所有数据）。
4. 刷新 `http://SERVER_IP:5173`，登录，创建 3 个聊天窗口 + 各发几条消息 + 收藏 1 条。
5. DevTools → IndexedDB 确认有数据。**同时** DevTools → Local Storage 不能有 `indexeddb-migration-done` 键（有就删掉）。

### 6.2 切换到数据库模式

```yaml
      - DB_ENABLED=true
      - DB_TYPE=sqlite          # 或 mysql / postgresql
      - SQL_DSN=file:/app/data/gemini-chat.db
      - JWT_SECRET=...
```

```bash
# 注意：不要 -v，否则会把刚才 A 模式下的 chat_data volume 也清掉（虽然 IndexedDB 场景里 chat_data 是空的，但保持习惯）
docker compose down
docker compose up --build -d
```

### 6.3 触发迁移

1. **同一个浏览器** 刷新 `http://SERVER_IP:5173`。
2. 登录后应看到模态对话框 **"数据迁移"**，文案："检测到本地浏览器中存有聊天数据……"。
3. 点击 **"开始迁移"**：
   - 观察 Network 出现 `POST /api/v1/sync/migrate-from-indexeddb` → `200`。
   - 对话框变绿："迁移成功！(chatWindows: 3, bookmarks: 1, ...)"。
   - 2 秒后自动关闭。
4. Local Storage 里新增 `indexeddb-migration-done=true`。
5. 服务端验证：

   ```bash
   docker compose exec gemini-chat sqlite3 /app/data/gemini-chat.db \
     'SELECT COUNT(*) FROM ChatWindow; SELECT COUNT(*) FROM Bookmark;'
   # 预期：3 / 1
   ```

6. IndexedDB **不会** 被主动删除（文案承诺的"本地数据不会被删除"）——这是故意的，等用户手动清理。

### 6.4 边界用例

- **已迁移过的用户**刷新：不再弹窗（`shouldPromptMigration()` 返回 false）。
- **新浏览器**（无本地数据）登录：不弹窗，自动 `markMigrationDone()`。
- **非法迁移 body**：

  ```bash
  curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
    -d '{"chatWindows":[{"id":123,"title":null}]}' \
    http://localhost:5173/api/v1/sync/migrate-from-indexeddb
  # 预期：400 + 错误信息指向字段类型不对
  # 预期：数据库里没有残留半成品（事务回滚）
  ```

---

## 7. 场景 G：鉴权 & 安全加固

### 7.1 全路由未鉴权扫描

```bash
SERVER=http://localhost:5173
for path in chat-windows settings model-configs bookmarks templates images \
            sync/status sync/dump sync/backups health/detail auth/me; do
  code=$(curl -s -o /dev/null -w "%{http_code}" $SERVER/api/v1/$path)
  echo "$path -> $code"
done
```

**预期**：全部 `401`，没有一个漏网。

匿名路径验证：

```bash
curl -s $SERVER/api/v1/health
# 预期：{"status":"ok"}，没有 dbEnabled/webdavEnabled 等敏感信息
```

### 7.2 错误密码

```bash
curl -i -X POST $SERVER/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"wrong"}'
# 预期：401 {"error":"Invalid credentials"}
```

### 7.3 伪造 token

```bash
# 结构错误
curl -i -H "Authorization: Bearer not-a-real-token" $SERVER/api/v1/chat-windows
# 预期：401 {"error":"Invalid or expired token"}

# header 格式错误
curl -i -H "Authorization: Token abc" $SERVER/api/v1/chat-windows
# 预期：401 {"error":"Authentication required"}
```

### 7.4 登录限流（20 次 / 15 分钟）

```bash
for i in $(seq 1 22); do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" -d '{"password":"wrong"}' \
    $SERVER/api/v1/auth/login)
  echo "$i -> $code"
done
```

**预期**：前 20 次 `401`，第 21 起变 `429 {"error":"Too many login attempts, try again later"}`。

> 重启容器（`docker compose restart gemini-chat`）能清零内存里的限流计数，方便复测。

### 7.5 API 限流（300 次 / 分钟）

```bash
for i in $(seq 1 320); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "Authorization: Bearer $TOKEN" \
    $SERVER/api/v1/chat-windows
done | sort | uniq -c
```

**预期输出**：约 300 个 `200`，20 个 `429`。

### 7.6 CORS 白名单

加一行到 `docker-compose.yml`：

```yaml
      - CORS_ORIGINS=https://chat.example.com
```

```bash
docker compose up -d

# 非白名单 origin
curl -i -X OPTIONS $SERVER/api/v1/chat-windows \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET"
# 预期：响应头不含 Access-Control-Allow-Origin: https://evil.example.com

# 白名单 origin
curl -i -X OPTIONS $SERVER/api/v1/chat-windows \
  -H "Origin: https://chat.example.com" \
  -H "Access-Control-Request-Method: GET"
# 预期：响应头含 Access-Control-Allow-Origin: https://chat.example.com
```

测完删掉这一行重启。

### 7.7 错误详情脱敏（NODE_ENV=production）

手动触发一个 500（篡改加密备份的 key 后尝试恢复，接着 5.5 的负向用例）：

```bash
curl -i -X POST -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/sync/import
```

**预期响应体**：

```json
{ "error": "Internal server error", "requestId": "xxx-xxx-xxx" }
```

**不** 包含 `detail` 字段、**不** 包含 stack。容器日志里能用 `grep $requestId` 定位详情。

对比：改成 `NODE_ENV=development` 重启，同样触发，响应体里会多一个 `detail` 字段。测完改回 production。

### 7.8 安全响应头（helmet）

```bash
curl -I $SERVER/api/v1/health
```

**预期响应头**至少包含：

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`（或 `DENY`）
- `Strict-Transport-Security: max-age=...`（如果走 HTTPS）
- **不再** 出现 `X-Powered-By: Express`

### 7.9 JWT_SECRET 缺失 → 旧 token 失效

1. 把 compose 里 `JWT_SECRET` 那行注释掉。
2. `docker compose up -d`。
3. 启动日志应出现：`[auth] JWT_SECRET not configured, generated ephemeral secret (tokens invalidated on restart)`。
4. 用旧 token：

   ```bash
   curl -i -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/chat-windows
   # 预期：401
   ```

5. 重新登录拿新 token 恢复可用。**这是预期行为，提醒生产环境必须配置 JWT_SECRET。** 测完加回去。

---

## 8. 场景 H：请求校验 / 事务 / 限额

### 8.1 zod body 校验

```bash
# 必填字段缺失
curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{}' $SERVER/api/v1/chat-windows
# 预期：400
# 预期：error 包含 "Invalid request body: ..."，code=VALIDATION_ERROR

# 字段类型错误
curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":123,"title":null}' $SERVER/api/v1/chat-windows
# 预期：400

# 所有 POST/PUT 接口都可以类推：/bookmarks、/templates、/images、/sync/migrate-from-indexeddb
```

### 8.2 PUT upsert 语义

```bash
NOW=$(date +%s%3N)
BODY=$(cat <<EOF
{
  "id": "test-win-upsert-001",
  "title": "upsert test",
  "config": {},
  "subTopics": [],
  "createdAt": $NOW,
  "updatedAt": $NOW
}
EOF
)

# 目标 id 不存在 → 应自动创建（不是 404）
curl -i -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "$BODY" $SERVER/api/v1/chat-windows/test-win-upsert-001
# 预期：200

# 验证真的创建了
curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/chat-windows | grep upsert
# 预期：看到 test-win-upsert-001
```

### 8.3 Body 大小限制（1MB / 20MB / 50MB 分级）

```bash
# 默认 1MB 限额：生成 2MB 的 title
python3 -c "import json; print(json.dumps({'id':'big','title':'a'*2000000}))" > /tmp/big.json
curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/big.json \
  $SERVER/api/v1/chat-windows
# 预期：413 Payload Too Large

# /images 20MB 限额：生成 15MB base64
python3 -c "
import json, time
now = int(time.time()*1000)
print(json.dumps({
  'id': 'test-big-img',
  'data': 'data:image/png;base64,' + 'A' * 15000000,
  'createdAt': now,
  'updatedAt': now,
}))
" > /tmp/big-img.json
ls -lh /tmp/big-img.json
curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/big-img.json \
  $SERVER/api/v1/images
# 预期：200

# 超过 20MB 的图片则 413
python3 -c "
import json, time
now = int(time.time()*1000)
print(json.dumps({
  'id': 'test-huge-img',
  'data': 'data:image/png;base64,' + 'A' * 25000000,
  'createdAt': now,
  'updatedAt': now,
}))
" > /tmp/huge-img.json
curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/huge-img.json \
  $SERVER/api/v1/images
# 预期：413
```

### 8.4 事务回滚

**思路**：构造一个 migrate payload，里面一部分 chatWindows 合法、一部分非法 → 应全部回滚。

```bash
cat > /tmp/partial-invalid.json <<'EOF'
{
  "chatWindows": [
    {
      "id": "tx-test-ok-1", "title": "Valid",
      "config": {}, "subTopics": [],
      "createdAt": 1735000000000, "updatedAt": 1735000000000
    },
    {
      "id": "tx-test-bad",
      "title": 12345
    }
  ]
}
EOF

curl -i -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  --data-binary @/tmp/partial-invalid.json \
  $SERVER/api/v1/sync/migrate-from-indexeddb
# 预期：400（zod 在入口就拦截了）

# 查数据库：tx-test-ok-1 不应存在
curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/chat-windows | grep 'tx-test' || echo "未写入，事务/校验生效 ✅"
```

### 8.5 markDirty 只在写操作触发

（接场景 E 开着 WebDAV）

```bash
# 先记下当前 lastSyncAt
curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/sync/status | jq .lastSyncAt
BEFORE=$(curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/sync/status | jq -r .lastSyncAt)

# 只读 60 秒
for i in $(seq 1 60); do
  curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/chat-windows > /dev/null
  sleep 1
done

AFTER=$(curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/sync/status | jq -r .lastSyncAt)
echo "BEFORE=$BEFORE AFTER=$AFTER"
# 预期：AFTER == BEFORE（只读没触发 dirty）

# 发一次写
curl -s -X PUT -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"id":"dirty-test","title":"t","config":{},"subTopics":[],"createdAt":0,"updatedAt":0}' \
  $SERVER/api/v1/chat-windows/dirty-test > /dev/null

# 等一个同步周期（WEBDAV_SYNC_INTERVAL 秒）
sleep 35

AFTER2=$(curl -s -H "Authorization: Bearer $TOKEN" $SERVER/api/v1/sync/status | jq -r .lastSyncAt)
echo "AFTER2=$AFTER2"
# 预期：AFTER2 > AFTER（写操作触发了新一次同步）
```

---

## 9. 场景 I：后端不可用时的降级行为

**目标**：确认 `storageAdapter.detectStorageMode` **不会** 在后端挂掉时静默 fallback 到 IndexedDB。

```bash
# 1) 维持 DB_ENABLED=true，浏览器已登录并有数据
# 2) 服务器上停后端容器
docker compose stop gemini-chat
```

3. 浏览器强制刷新（Ctrl+Shift+R / Cmd+Shift+R）。
4. **预期**：页面应显示"后端不可用 / 存储检测失败"之类的显式错误（由 `storageAdapter.ts` 抛异常）。**不应** 静默切回 IndexedDB 让用户以为一切正常，避免数据写到错位置。
5. 恢复：

   ```bash
   docker compose start gemini-chat
   ```

   浏览器再刷新 → 正常恢复。

---

## 10. 公网暴露的安全加固（测试完请务必做）

测试机有公网 IP 非常危险，测试完必须立刻：

```bash
# 1) 关闭数据库端口的公网访问
# 编辑 docker-compose.yml，把 mysql/postgres 的 ports: 3306:3306 / 5432:5432 删掉
# 然后 docker compose up -d

# 2) 关闭 dufs 端口（如果不打算继续测 WebDAV）
# docker-compose.yml 里删掉 dufs 的 ports: 5000:5000

# 3) ufw 关口
sudo ufw delete allow 5173/tcp
sudo ufw delete allow 5000/tcp
sudo ufw delete allow 3306/tcp 2>/dev/null
sudo ufw delete allow 5432/tcp 2>/dev/null

# 4) 改一次强密码
# 修改 .env 里 VITE_AUTH_PASSWORD
# 修改 docker-compose.yml 里 MYSQL_ROOT_PASSWORD / POSTGRES_PASSWORD（如果还保留数据库容器）
# 生成全新 JWT_SECRET：openssl rand -hex 32

# 5) 云厂商安全组同步收紧
```

**永久部署前必须做到**：

- [ ] `JWT_SECRET` 用 `openssl rand -hex 32` 生成，落到 docker secrets / 环境变量文件（不要提交到 git）。
- [ ] `VITE_AUTH_PASSWORD` 至少 12 位强密码。
- [ ] `WEBDAV_ENCRYPTION_KEY` 用 `openssl rand -hex 32` 生成，非空。
- [ ] 前面加 nginx 反代，套 HTTPS（Let's Encrypt / acme.sh）。
- [ ] 只暴露 443（或 80→443 跳转），数据库端口、dufs 端口全部 Docker 内网。
- [ ] `CORS_ORIGINS` 写白名单，不要 `*`。

---

## 11. 常见问题 & 排错

### Q1. `docker compose up` 卡在拉镜像

换国内镜像加速（参见 0.2 末尾 `daemon.json`）。或者直接从项目的 GitHub Release / GHCR 拉 prebuilt 镜像，然后 `image:` 指过去。

### Q2. `Pre-built Prisma client for mysql not found`

Docker 构建阶段异常。重新：

```bash
docker compose down
docker compose build --no-cache gemini-chat
docker compose up -d
```

构建日志里应看到三次 `prisma generate`（sqlite/mysql/postgresql）。

### Q3. 浏览器一直 401，但我密码明明对的

1. DevTools → Application → Local Storage，看 `gemini-chat-server-token` 在不在。
2. 不在：服务重启过 + `JWT_SECRET` 没配 → 旧 token 全作废，重新登录即可。
3. 在：token 是否过期（7 天有效期），或者 `JWT_SECRET` 被换过了。
4. F5 试试；还不行：清 Local Storage 里 `gemini-chat-server-token` 整条，重新登录。

### Q4. 前端登录了，但刷新后又要求登录

前端本地鉴权（`VITE_AUTH_PASSWORD`）和服务端 token 两套需要同时就绪。检查：

- Network → `POST /api/v1/auth/login` 是否 200；
- Local Storage 里 token 是否被保存；
- 是否 500/401 导致前端登录流程回滚（看 Console）。

### Q5. 前后端密码不一致（本地开发才会遇到）

Docker Compose 部署下会自动对齐：entrypoint 根据 `VITE_AUTH_PASSWORD` 同时刷新前端 `config.js` 的 `__AUTH_PASSWORD_HASH__` 占位符**和**后端的 `AUTH_PASSWORD_HASH` 环境变量。所以只需改一个地方。

如果你同时跑了两个容器（一个 DB_ENABLED=false 用的 nginx 模式、一个 DB_ENABLED=true 用的 node 模式），两边 `VITE_AUTH_PASSWORD` 必须一致。

### Q6. WebDAV 报 `ECONNREFUSED` / `getaddrinfo ENOTFOUND dufs`

`WEBDAV_URL` 必须用 **compose 服务名**（例如 `http://dufs:5000/`），不能用 `localhost` / `127.0.0.1` / 宿主 IP。gemini-chat 容器里 `localhost` 指它自己。

### Q7. 切换 DB_TYPE 后数据没了

预期行为。跨 provider 数据不共享。正确做法走 4.3 的导出→切→导入。

### Q8. 公网 IP 访问能连通，但浏览器 Console 报 CORS 错

如果你把 `CORS_ORIGINS` 配成具体白名单，又用 `SERVER_IP:5173` 直连，origin 不在白名单里。测试期可以临时把 `CORS_ORIGINS` 那一行注释掉（默认允许所有），或者把 `http://SERVER_IP:5173` 加进白名单。

### Q9. 日志太多刷屏

```bash
docker compose logs --tail=100 -f gemini-chat        # 只看最近 100 行
docker compose logs --since=5m gemini-chat           # 最近 5 分钟
docker compose logs gemini-chat | grep '\[WebDAV\]'  # 只看 WebDAV
docker compose logs gemini-chat | grep -i error      # 只看错误
```

### Q10. 我想彻底推倒重来

```bash
docker compose down -v                  # 容器 + volume 一起清
docker volume prune -f                  # 再清一次悬挂 volume
# 浏览器里：DevTools → Application → Clear site data
```

### Q11. tmux 基础操作速查

| 目标 | 命令 |
| --- | --- |
| 新建会话 | `tmux new -s test` |
| 退出但不关会话 | `Ctrl+B`，松开，再按 `D` |
| 列出会话 | `tmux ls` |
| 回到会话 | `tmux attach -t test` |
| 拆成两个窗格上下 | `Ctrl+B`，松开，再按 `"` |
| 拆成两个窗格左右 | `Ctrl+B`，松开，再按 `%` |
| 切换窗格 | `Ctrl+B`，松开，再按方向键 |

---

## 12. 收尾 & 清理

```bash
# 1) 导出一份"通过时"的数据备份存档（可选）
TOKEN=$(curl -s -X POST http://localhost:5173/api/v1/auth/login -H "Content-Type: application/json" -d '{"password":"123456"}' | jq -r .token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:5173/api/v1/sync/dump > /tmp/final-dump-$(date +%Y%m%d).json
ls -lh /tmp/final-dump-*.json

# 2) 停服务、清 volume
docker compose down -v
docker volume prune -f

# 3) 关闭防火墙临时开放的端口
sudo ufw delete allow 5173/tcp
sudo ufw delete allow 5000/tcp
sudo ufw delete allow 3306/tcp 2>/dev/null
sudo ufw delete allow 5432/tcp 2>/dev/null
sudo ufw reload

# 4) 从云厂商安全组里删除 5173 / 5000 / 3306 / 5432 的入站规则
# （页面操作，此处略）

# 5) 退出 tmux
tmux kill-session -t test
exit
```

---

## 验证通过 Checklist

**基础功能**

- [ ] 场景 A：IndexedDB 模式，所有读写留在浏览器，无 `/api/v1/...` 请求
- [ ] 场景 B：SQLite 数据库模式，跨重启 / 跨 volume 持久化正确
- [ ] 场景 C：MySQL provider 切换成功，utf8mb4 中文+emoji 无乱码
- [ ] 场景 D：PostgreSQL provider 切换成功

**WebDAV**

- [ ] 场景 E.3：写入后 30 秒内触发一次自动备份，dufs 里出现 `.json.gz` 文件
- [ ] 场景 E.4：gzip 内容 gunzip 后能看到合法 JSON
- [ ] 场景 E.5：开启加密后文件扩展名 `.json.gz.enc`，前 6 字节 `GCENC1`
- [ ] 场景 E.5 负向：缺 key 时 import 返回 500，日志有明确提示
- [ ] 场景 E.7：并发两次 export，串行执行无冲突
- [ ] 场景 E.8：WEBDAV_URL 黑洞时 30 秒超时并记录 error
- [ ] 场景 E.9：`MAX_BACKUPS=10` 保留条数正确

**数据迁移**

- [ ] 场景 F：IndexedDB → 服务端迁移一键成功
- [ ] 场景 F.4：非法迁移 body 返回 400 且不破坏已有数据

**鉴权 & 安全**

- [ ] 场景 G.1：11 个受保护路由全部 401
- [ ] 场景 G.2：错误密码 401
- [ ] 场景 G.4：20 次后登录限流触发 429
- [ ] 场景 G.5：API 限流 300/min
- [ ] 场景 G.6：CORS_ORIGINS 白名单生效
- [ ] 场景 G.7：`NODE_ENV=production` 下 500 响应无 detail 字段
- [ ] 场景 G.8：响应头含 `X-Content-Type-Options: nosniff`，不含 `X-Powered-By`
- [ ] 场景 G.9：JWT_SECRET 缺失时旧 token 失效，日志有警告

**数据一致性**

- [ ] 场景 H.1：zod 校验非法 body → 400 + 字段级错误信息
- [ ] 场景 H.2：PUT 不存在 id 自动创建（upsert）
- [ ] 场景 H.3：body 1MB/20MB/50MB 分级限制正确
- [ ] 场景 H.4：部分非法 payload 整体回滚
- [ ] 场景 H.5：只读不触发 WebDAV 同步，写操作才触发

**降级**

- [ ] 场景 I：后端挂掉时浏览器显式报错，不静默回退 IndexedDB

**安全收尾**

- [ ] 测试完端口已关、强密码已换、JWT_SECRET 已换

全部打勾即为本轮整改验证通过。
