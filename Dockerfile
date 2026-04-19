# ==================== 前端构建阶段 ====================
FROM node:20-alpine AS frontend-builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ==================== 后端构建阶段 ====================
FROM node:20-alpine AS server-builder

WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci
COPY server/ ./

RUN mkdir -p /prisma-clients/sqlite /prisma-clients/mysql /prisma-clients/postgresql

RUN node scripts/set-db-provider.js sqlite \
 && npx prisma generate --schema=prisma/schema.prisma \
 && cp -r node_modules/.prisma /prisma-clients/sqlite/

RUN node scripts/set-db-provider.js mysql \
 && npx prisma generate --schema=prisma/schema.prisma \
 && cp -r node_modules/.prisma /prisma-clients/mysql/

RUN node scripts/set-db-provider.js postgresql \
 && npx prisma generate --schema=prisma/schema.prisma \
 && cp -r node_modules/.prisma /prisma-clients/postgresql/

RUN node scripts/set-db-provider.js sqlite \
 && npx prisma generate --schema=prisma/schema.prisma

RUN npm run build

# ==================== 生产阶段 ====================
FROM node:20-alpine AS production

RUN apk add --no-cache nginx && \
    mkdir -p /var/cache/nginx /var/log/nginx /run/nginx

RUN addgroup -g 1001 -S appuser && \
    adduser -S -D -H -u 1001 -h /app -s /sbin/nologin -G appuser appuser

COPY --from=frontend-builder /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/nginx.conf

WORKDIR /app

COPY --from=server-builder /app/server/dist ./server/dist
COPY --from=server-builder /app/server/prisma ./server/prisma
COPY --from=server-builder /app/server/scripts ./server/scripts
COPY --from=server-builder /app/server/node_modules ./server/node_modules
COPY --from=server-builder /prisma-clients /app/prisma-clients
COPY --from=server-builder /app/server/package.json ./server/package.json

RUN mkdir -p /app/data && chown -R appuser:appuser /app/data /app/server /app/prisma-clients

COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN chown -R appuser:appuser /var/cache/nginx /var/log/nginx /usr/share/nginx/html /app && \
    touch /tmp/nginx.pid && chown appuser:appuser /tmp/nginx.pid

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || \
      wget --no-verbose --tries=1 --spider http://localhost:8080/ || exit 1

USER appuser

EXPOSE 8080

ENTRYPOINT ["/docker-entrypoint.sh"]
