import fs from 'fs';

export interface ServerConfig {
  port: number;
  dbEnabled: boolean;
  dbProvider: 'sqlite' | 'mysql' | 'postgresql';
  sqlDsn: string;
  // 以下 webdav* 仅作为「首次初始化」时 seed 进数据库的默认值
  // 运行时真正生效的是数据库里 WebDAVConfig 表的内容
  webdavEnabled: boolean;
  webdavUrl: string;
  webdavUser: string;
  webdavPassword: string;
  webdavSyncInterval: number;
  webdavEncryptionKey: string | undefined;
  // 对 DB 里存储的 WebDAV 密码/加密密钥做 AES-GCM 加密用
  configEncryptionKey: string | undefined;
  authPasswordHash: string | undefined;
  jwtSecret: string | undefined;
  corsOrigins: string | undefined;
  staticDir: string;
  nodeEnv: string;
}

function resolveDsnProvider(dsn: string): 'sqlite' | 'mysql' | 'postgresql' {
  if (dsn.startsWith('file:') || dsn.startsWith('sqlite:')) return 'sqlite';
  if (dsn.startsWith('mysql:')) return 'mysql';
  if (dsn.startsWith('postgresql:') || dsn.startsWith('postgres:')) return 'postgresql';
  return 'sqlite';
}

function readSecret(envVar: string, fileEnvVar: string): string | undefined {
  const direct = process.env[envVar];
  if (direct && direct.length > 0) return direct;
  const file = process.env[fileEnvVar];
  if (file) {
    try {
      const content = fs.readFileSync(file, 'utf8').trim();
      if (content) return content;
    } catch (err) {
      console.warn(`[config] Failed to read secret from ${file}:`, err);
    }
  }
  return undefined;
}

function safeParseInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function loadConfig(): ServerConfig {
  const dbEnabled = process.env.DB_ENABLED === 'true';
  const sqlDsn = process.env.SQL_DSN || 'file:./data/gemini-chat.db';
  const dbType = process.env.DB_TYPE as ServerConfig['dbProvider'] | undefined;
  const dbProvider = dbType || resolveDsnProvider(sqlDsn);

  return {
    port: safeParseInt(process.env.PORT, 8080),
    dbEnabled,
    dbProvider,
    sqlDsn,
    webdavEnabled: process.env.WEBDAV_ENABLED === 'true',
    webdavUrl: process.env.WEBDAV_URL || '',
    webdavUser: process.env.WEBDAV_USER || '',
    webdavPassword: readSecret('WEBDAV_PASSWORD', 'WEBDAV_PASSWORD_FILE') || '',
    webdavSyncInterval: safeParseInt(process.env.WEBDAV_SYNC_INTERVAL, 300),
    webdavEncryptionKey: readSecret('WEBDAV_ENCRYPTION_KEY', 'WEBDAV_ENCRYPTION_KEY_FILE'),
    configEncryptionKey: readSecret('CONFIG_ENCRYPTION_KEY', 'CONFIG_ENCRYPTION_KEY_FILE'),
    authPasswordHash: readSecret('AUTH_PASSWORD_HASH', 'AUTH_PASSWORD_HASH_FILE'),
    jwtSecret: readSecret('JWT_SECRET', 'JWT_SECRET_FILE'),
    corsOrigins: process.env.CORS_ORIGINS,
    staticDir: process.env.STATIC_DIR || '/usr/share/nginx/html',
    nodeEnv: process.env.NODE_ENV || 'development',
  };
}

export const config = loadConfig();
