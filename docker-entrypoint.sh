#!/bin/sh
set -eu

CONFIG_FILE="/usr/share/nginx/html/config.js"

echo "=== Docker Entrypoint ==="
echo "VITE_AUTH_PASSWORD: $([ -n "${VITE_AUTH_PASSWORD:-}" ] && echo 'set' || echo 'not set')"
echo "DB_ENABLED: ${DB_ENABLED:-false}"
echo "WEBDAV_ENABLED: ${WEBDAV_ENABLED:-false}"

simple_hash() {
  printf '%s' "$1" | sha256sum | cut -d' ' -f1
}

if [ -n "${VITE_AUTH_PASSWORD:-}" ]; then
  PASSWORD_HASH=$(simple_hash "$VITE_AUTH_PASSWORD")
  sed -i "s|__AUTH_PASSWORD_HASH__|$PASSWORD_HASH|g" "$CONFIG_FILE"
  export AUTH_PASSWORD_HASH="$PASSWORD_HASH"
fi

DB_FLAG="${DB_ENABLED:-false}"
WEBDAV_FLAG="${WEBDAV_ENABLED:-false}"

sed -i "s|__DB_ENABLED__|$DB_FLAG|g" "$CONFIG_FILE"
sed -i "s|__WEBDAV_ENABLED__|$WEBDAV_FLAG|g" "$CONFIG_FILE"

if [ "$DB_FLAG" = "true" ]; then
  echo "=== Starting Node.js server (database mode) ==="

  DB_PROVIDER="${DB_TYPE:-sqlite}"
  case "$DB_PROVIDER" in
    sqlite|mysql|postgresql)
      echo "DB provider: $DB_PROVIDER"
      ;;
    *)
      echo "ERROR: Invalid DB_TYPE '$DB_PROVIDER'. Must be sqlite/mysql/postgresql."
      exit 1
      ;;
  esac

  if [ -d "/app/prisma-clients/${DB_PROVIDER}/.prisma" ]; then
    rm -rf /app/server/node_modules/.prisma
    cp -r "/app/prisma-clients/${DB_PROVIDER}/.prisma" /app/server/node_modules/.prisma
    echo "Loaded Prisma client for $DB_PROVIDER"
  else
    echo "WARNING: Pre-built Prisma client for $DB_PROVIDER not found, continuing with default"
  fi

  node /app/server/scripts/set-db-provider.js "$DB_PROVIDER"

  cd /app/server
  export SQL_DSN="${SQL_DSN:-file:/app/data/gemini-chat.db}"
  export STATIC_DIR="/usr/share/nginx/html"
  export PORT="${PORT:-8080}"
  export NODE_ENV="${NODE_ENV:-production}"

  if [ -d "/app/server/prisma/migrations" ] && [ "$(ls -A /app/server/prisma/migrations 2>/dev/null)" ]; then
    echo "Running prisma migrate deploy..."
    npx prisma migrate deploy --schema=prisma/schema.prisma
  else
    echo "No migrations found; running prisma db push (first-time init)..."
    npx prisma db push --schema=prisma/schema.prisma --skip-generate
  fi

  echo "Starting Node.js server..."
  exec node /app/server/dist/index.js
else
  echo "=== Starting nginx (static mode) ==="
  exec nginx -g 'daemon off;'
fi
