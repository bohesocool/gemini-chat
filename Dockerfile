# 构建阶段
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 生产阶段 - 使用 nginx 提供静态文件服务
FROM nginx:alpine AS production

# 创建非 root 用户（UID 1001）
RUN addgroup -g 1001 -S nginx-user && \
    adduser -S -D -H -u 1001 -h /var/cache/nginx -s /sbin/nologin -G nginx-user nginx-user

# 设置 nginx 运行所需目录的所有权
RUN chown -R nginx-user:nginx-user /var/cache/nginx /var/log/nginx /usr/share/nginx/html && \
    touch /tmp/nginx.pid && chown nginx-user:nginx-user /tmp/nginx.pid

# 在 nginx 主配置中设置 pid 文件路径为 /tmp/nginx.pid
RUN sed -i 's|/var/run/nginx.pid|/tmp/nginx.pid|g' /etc/nginx/nginx.conf

# 复制构建产物到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 复制启动脚本
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# 健康检查 - 使用 wget 检测 nginx 服务是否正常响应
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

# 切换到非 root 用户运行
USER nginx-user

# 暴露端口（非特权端口）
EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
