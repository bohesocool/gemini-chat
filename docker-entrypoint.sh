#!/bin/sh

# 替换配置文件中的占位符
CONFIG_FILE="/usr/share/nginx/html/config.js"

echo "=== Docker Entrypoint ==="
echo "VITE_AUTH_PASSWORD 是否设置: $([ -n "$VITE_AUTH_PASSWORD" ] && echo '是' || echo '否')"

# 简单哈希函数（与前端 simpleHash 保持一致）
# 由于 shell 脚本难以精确复制 JavaScript 的位运算，我们直接存储 SHA-256 哈希
# 前端会检测是否为 SHA-256 格式（64位十六进制），如果是则使用 SHA-256 验证
simple_hash() {
  echo -n "$1" | sha256sum | cut -d' ' -f1
}

if [ -n "$VITE_AUTH_PASSWORD" ]; then
  echo "正在计算密码哈希并注入到 config.js..."
  PASSWORD_HASH=$(simple_hash "$VITE_AUTH_PASSWORD")
  echo "密码哈希已计算（SHA-256）"
  # 使用 | 作为分隔符
  sed -i "s|__AUTH_PASSWORD_HASH__|$PASSWORD_HASH|g" $CONFIG_FILE
  echo "哈希注入完成"
else
  echo "未设置 VITE_AUTH_PASSWORD，使用默认密码"
fi

echo "config.js 内容:"
cat $CONFIG_FILE
echo "=== 启动 nginx ==="

# 启动 nginx
exec nginx -g 'daemon off;'
