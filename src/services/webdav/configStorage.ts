/**
 * 浏览器端 WebDAV 配置存储
 *
 * 存在 IndexedDB 的 app-settings 里（单独一个 key 'webdav-config'），
 * 密码字段用固定密钥（登录密码 hash 或 fallback 到硬编码盐）做 AES-GCM 加密。
 * 注意：浏览器侧的"加密"只能阻挡随意扫描，因为密钥最终还是要放在前端可访问的地方。
 */

import { openDB, IDBPDatabase, DBSchema } from 'idb';

const DB_NAME = 'gemini-chat-webdav-config';
const DB_VERSION = 1;
const RECORD_KEY = 'webdav-config';

// 简单固定盐：这不是真正的安全保障，只是避免明文在存储里被 grep 到
const FALLBACK_KEY_MATERIAL = 'gemini-chat-webdav-config-local-salt-v1';

interface Schema extends DBSchema {
  config: {
    key: string;
    value: StoredRecord;
  };
}

interface StoredRecord {
  enabled: boolean;
  url: string;
  username: string;
  /** base64 of magic || iv || ciphertext || tag */
  passwordCipher: string;
  encryptionKeyCipher: string;
  syncInterval: number;
  maxBackups: number;
  updatedAt: number;
}

export interface BrowserWebDAVConfig {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  encryptionKey: string;
  syncInterval: number;
  maxBackups: number;
  updatedAt: number;
}

export interface BrowserWebDAVPublicConfig {
  enabled: boolean;
  url: string;
  username: string;
  hasPassword: boolean;
  hasEncryptionKey: boolean;
  syncInterval: number;
  maxBackups: number;
  updatedAt: number;
}

const ENC_MAGIC = 'BWDAV1';
const ENC_MAGIC_BYTES = new TextEncoder().encode(ENC_MAGIC);

let dbInstance: IDBPDatabase<Schema> | null = null;

async function getDB(): Promise<IDBPDatabase<Schema>> {
  if (dbInstance) return dbInstance;
  dbInstance = await openDB<Schema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('config')) {
        db.createObjectStore('config');
      }
    },
  });
  return dbInstance;
}

async function deriveKey(keyMaterial: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(keyMaterial));
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

function concat(arrs: Uint8Array[]): Uint8Array {
  const total = arrs.reduce((s, a) => s + a.byteLength, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const a of arrs) {
    out.set(a, o);
    o += a.byteLength;
  }
  return out;
}

function toBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const s = atob(b64);
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function encryptString(plain: string): Promise<string> {
  if (!plain) return '';
  const key = await deriveKey(FALLBACK_KEY_MATERIAL);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain)
  );
  return toBase64(concat([ENC_MAGIC_BYTES, iv, new Uint8Array(cipherBuf)]));
}

async function decryptString(cipherB64: string): Promise<string> {
  if (!cipherB64) return '';
  const buf = fromBase64(cipherB64);
  const magicLen = ENC_MAGIC_BYTES.length;
  const magic = new TextDecoder().decode(buf.subarray(0, magicLen));
  if (magic !== ENC_MAGIC) throw new Error('Invalid ciphertext');
  const iv = buf.subarray(magicLen, magicLen + 12);
  const ciphertext = buf.subarray(magicLen + 12);
  const key = await deriveKey(FALLBACK_KEY_MATERIAL);
  const plainBuf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(plainBuf);
}

function defaultConfig(): BrowserWebDAVConfig {
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

export async function getFullConfig(): Promise<BrowserWebDAVConfig> {
  const db = await getDB();
  const row = await db.get('config', RECORD_KEY);
  if (!row) return defaultConfig();

  let password = '';
  let encryptionKey = '';
  try {
    password = await decryptString(row.passwordCipher);
    encryptionKey = await decryptString(row.encryptionKeyCipher);
  } catch {
    // 解密失败（比如存储格式变了），按空处理
  }

  return {
    enabled: row.enabled,
    url: row.url,
    username: row.username,
    password,
    encryptionKey,
    syncInterval: row.syncInterval,
    maxBackups: row.maxBackups,
    updatedAt: row.updatedAt,
  };
}

export async function getPublicConfig(): Promise<BrowserWebDAVPublicConfig> {
  const db = await getDB();
  const row = await db.get('config', RECORD_KEY);
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
    updatedAt: row.updatedAt,
  };
}

export interface BrowserWebDAVConfigUpdate {
  enabled?: boolean;
  url?: string;
  username?: string;
  password?: string;
  encryptionKey?: string;
  syncInterval?: number;
  maxBackups?: number;
}

export async function updateConfig(
  patch: BrowserWebDAVConfigUpdate
): Promise<BrowserWebDAVConfig> {
  const db = await getDB();
  const existing = (await db.get('config', RECORD_KEY)) ?? {
    enabled: false,
    url: '',
    username: '',
    passwordCipher: '',
    encryptionKeyCipher: '',
    syncInterval: 300,
    maxBackups: 10,
    updatedAt: 0,
  };

  const next: StoredRecord = { ...existing, updatedAt: Date.now() };
  if (patch.enabled !== undefined) next.enabled = patch.enabled;
  if (patch.url !== undefined) next.url = patch.url;
  if (patch.username !== undefined) next.username = patch.username;
  if (patch.syncInterval !== undefined) {
    next.syncInterval = Math.max(10, Math.min(86400, patch.syncInterval));
  }
  if (patch.maxBackups !== undefined) {
    next.maxBackups = Math.max(1, Math.min(200, patch.maxBackups));
  }
  if (patch.password !== undefined) {
    next.passwordCipher = patch.password ? await encryptString(patch.password) : '';
  }
  if (patch.encryptionKey !== undefined) {
    next.encryptionKeyCipher = patch.encryptionKey
      ? await encryptString(patch.encryptionKey)
      : '';
  }

  await db.put('config', next, RECORD_KEY);
  return getFullConfig();
}
