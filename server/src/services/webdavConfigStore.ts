/**
 * WebDAV 配置仓库
 *
 * 把账号密码存在数据库里，敏感字段用 AES-256-GCM 加密。
 * 加密密钥来自环境变量 CONFIG_ENCRYPTION_KEY（也支持 CONFIG_ENCRYPTION_KEY_FILE Docker secret）。
 *
 * 对外暴露的接口返回**明文**（仅在服务端内存里），路由层负责脱敏。
 */

import crypto from 'crypto';
import { prisma } from '../database.js';
import { config } from '../config.js';

const RECORD_ID = 'webdav-default';
const ENC_MAGIC = 'CFGENC1';

export interface WebDAVStoredConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  encryptionKey: string;
  syncInterval: number;
  maxBackups: number;
  updatedAt: number;
}

export interface WebDAVPublicConfig {
  enabled: boolean;
  url: string;
  username: string;
  hasPassword: boolean;
  hasEncryptionKey: boolean;
  syncInterval: number;
  maxBackups: number;
  updatedAt: number;
}

function deriveKey(keyInput: string): Buffer {
  return crypto.createHash('sha256').update(keyInput, 'utf8').digest();
}

function encrypt(plain: string, keyInput: string): string {
  if (plain.length === 0) return '';
  const key = deriveKey(keyInput);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  const blob = Buffer.concat([Buffer.from(ENC_MAGIC, 'utf8'), iv, tag, ciphertext]);
  return blob.toString('base64');
}

function decrypt(cipherB64: string, keyInput: string): string {
  if (cipherB64.length === 0) return '';
  const buf = Buffer.from(cipherB64, 'base64');
  const magicLen = ENC_MAGIC.length;
  const magic = buf.subarray(0, magicLen).toString('utf8');
  if (magic !== ENC_MAGIC) {
    throw new Error('Invalid ciphertext (missing magic)');
  }
  const iv = buf.subarray(magicLen, magicLen + 12);
  const tag = buf.subarray(magicLen + 12, magicLen + 12 + 16);
  const ciphertext = buf.subarray(magicLen + 12 + 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', deriveKey(keyInput), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

function getEncryptionKeyOrThrow(): string {
  const k = config.configEncryptionKey;
  if (!k || k.length === 0) {
    throw new Error(
      'CONFIG_ENCRYPTION_KEY is not configured. Set it in environment or Docker secrets to store WebDAV credentials.'
    );
  }
  return k;
}

/** 默认值（全部为空）：DB 里还没 seed 时临时使用 */
function emptyDefault(): WebDAVStoredConfig {
  return {
    enabled: false,
    url: '',
    username: '',
    password: '',
    encryptionKey: '',
    syncInterval: 300,
    maxBackups: 10,
    updatedAt: 0,
  };
}

/**
 * 首次启动 seed：若 DB 里没有记录，从环境变量把历史配置写入。
 * 注：env 只影响「首次初始化」，后续以 DB 为准。
 */
export async function seedFromEnvIfEmpty(): Promise<void> {
  const existing = await prisma.webDAVConfig.findUnique({ where: { id: RECORD_ID } });
  if (existing) return;

  const hasEnv = Boolean(
    config.webdavUrl || config.webdavUser || config.webdavPassword || config.webdavEncryptionKey
  );

  if (!hasEnv) {
    // 没任何 env 就不用 seed，等用户从 UI 填
    await prisma.webDAVConfig.create({
      data: {
        id: RECORD_ID,
        enabled: false,
        url: '',
        username: '',
        passwordCipher: '',
        encryptionKeyCipher: '',
        syncInterval: config.webdavSyncInterval || 300,
        maxBackups: 10,
        updatedAt: BigInt(Date.now()),
      },
    });
    return;
  }

  // 有 env → seed 进 DB；加密字段用 configEncryptionKey 加密
  const cek = config.configEncryptionKey;
  if (!cek) {
    console.warn(
      '[webdav] WARNING: WEBDAV_* environment variables are set but CONFIG_ENCRYPTION_KEY is missing. ' +
        'Cannot seed credentials into database; please set CONFIG_ENCRYPTION_KEY or configure via UI.'
    );
    await prisma.webDAVConfig.create({
      data: {
        id: RECORD_ID,
        enabled: false,
        url: config.webdavUrl,
        username: config.webdavUser,
        passwordCipher: '',
        encryptionKeyCipher: '',
        syncInterval: config.webdavSyncInterval || 300,
        maxBackups: 10,
        updatedAt: BigInt(Date.now()),
      },
    });
    return;
  }

  await prisma.webDAVConfig.create({
    data: {
      id: RECORD_ID,
      enabled: config.webdavEnabled,
      url: config.webdavUrl,
      username: config.webdavUser,
      passwordCipher: config.webdavPassword ? encrypt(config.webdavPassword, cek) : '',
      encryptionKeyCipher: config.webdavEncryptionKey ? encrypt(config.webdavEncryptionKey, cek) : '',
      syncInterval: config.webdavSyncInterval || 300,
      maxBackups: 10,
      updatedAt: BigInt(Date.now()),
    },
  });
  console.log('[webdav] Seeded WebDAV configuration from environment variables');
}

/**
 * 读取完整配置（含明文密码）。只能在服务端内部使用，**严禁**直接返回给前端。
 */
export async function getFullConfig(): Promise<WebDAVStoredConfig> {
  const row = await prisma.webDAVConfig.findUnique({ where: { id: RECORD_ID } });
  if (!row) return emptyDefault();

  let password = '';
  let encryptionKey = '';
  if (row.passwordCipher || row.encryptionKeyCipher) {
    try {
      const cek = getEncryptionKeyOrThrow();
      password = row.passwordCipher ? decrypt(row.passwordCipher, cek) : '';
      encryptionKey = row.encryptionKeyCipher ? decrypt(row.encryptionKeyCipher, cek) : '';
    } catch (err) {
      console.warn(
        '[webdav] Failed to decrypt stored credentials, returning empty values. ' +
          'Check CONFIG_ENCRYPTION_KEY matches the one used to save the credentials.',
        err
      );
    }
  }

  return {
    enabled: row.enabled,
    url: row.url,
    username: row.username,
    password,
    encryptionKey,
    syncInterval: row.syncInterval,
    maxBackups: row.maxBackups,
    updatedAt: Number(row.updatedAt),
  };
}

/**
 * 给前端使用的脱敏版本（永不返回明文密码 / 加密密钥）。
 */
export async function getPublicConfig(): Promise<WebDAVPublicConfig> {
  const row = await prisma.webDAVConfig.findUnique({ where: { id: RECORD_ID } });
  if (!row) {
    return {
      enabled: false,
      url: '',
      username: '',
      hasPassword: false,
      hasEncryptionKey: false,
      syncInterval: 300,
      maxBackups: 10,
      updatedAt: 0,
    };
  }
  return {
    enabled: row.enabled,
    url: row.url,
    username: row.username,
    hasPassword: row.passwordCipher.length > 0,
    hasEncryptionKey: row.encryptionKeyCipher.length > 0,
    syncInterval: row.syncInterval,
    maxBackups: row.maxBackups,
    updatedAt: Number(row.updatedAt),
  };
}

export interface WebDAVConfigUpdate {
  enabled?: boolean;
  url?: string;
  username?: string;
  /** 传空字符串表示清空，undefined 表示保持不变 */
  password?: string | undefined;
  encryptionKey?: string | undefined;
  syncInterval?: number;
  maxBackups?: number;
}

/**
 * 更新配置。
 * - password/encryptionKey 为 `undefined` 时保留原值
 * - password/encryptionKey 为 `""` 时清空
 */
export async function updateConfig(patch: WebDAVConfigUpdate): Promise<WebDAVStoredConfig> {
  const current = await prisma.webDAVConfig.findUnique({ where: { id: RECORD_ID } });

  const updates: Record<string, unknown> = {
    updatedAt: BigInt(Date.now()),
  };

  if (patch.enabled !== undefined) updates.enabled = patch.enabled;
  if (patch.url !== undefined) updates.url = patch.url;
  if (patch.username !== undefined) updates.username = patch.username;
  if (patch.syncInterval !== undefined) {
    updates.syncInterval = Math.max(10, Math.min(86400, patch.syncInterval));
  }
  if (patch.maxBackups !== undefined) {
    updates.maxBackups = Math.max(1, Math.min(200, patch.maxBackups));
  }

  // 只在需要变动密码/加密密钥时校验 configEncryptionKey
  if (patch.password !== undefined || patch.encryptionKey !== undefined) {
    const cek = getEncryptionKeyOrThrow();
    if (patch.password !== undefined) {
      updates.passwordCipher = patch.password ? encrypt(patch.password, cek) : '';
    }
    if (patch.encryptionKey !== undefined) {
      updates.encryptionKeyCipher = patch.encryptionKey ? encrypt(patch.encryptionKey, cek) : '';
    }
  }

  if (current) {
    await prisma.webDAVConfig.update({ where: { id: RECORD_ID }, data: updates });
  } else {
    await prisma.webDAVConfig.create({
      data: {
        id: RECORD_ID,
        enabled: (updates.enabled as boolean | undefined) ?? false,
        url: (updates.url as string | undefined) ?? '',
        username: (updates.username as string | undefined) ?? '',
        passwordCipher: (updates.passwordCipher as string | undefined) ?? '',
        encryptionKeyCipher: (updates.encryptionKeyCipher as string | undefined) ?? '',
        syncInterval: (updates.syncInterval as number | undefined) ?? 300,
        maxBackups: (updates.maxBackups as number | undefined) ?? 10,
        updatedAt: BigInt(Date.now()),
      },
    });
  }

  return getFullConfig();
}
