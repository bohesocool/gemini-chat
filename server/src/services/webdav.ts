/**
 * 服务端 WebDAV 服务
 *
 * 配置从数据库 WebDAVConfig 表读取（通过 webdavConfigStore）。
 * 备份二进制格式：
 *   - .json.gz        纯 gzip
 *   - .json.gz.enc    gzip 明文 → AES-256-GCM 加密
 *     结构：magic=GCENC1 (6) || iv (12) || tag (16) || ciphertext
 * 该格式与 `src/services/webdav/protocol.ts`（浏览器端）完全兼容，两端互通。
 */

import { createClient, WebDAVClient } from 'webdav';
import crypto from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import { getFullConfig, type WebDAVStoredConfig } from './webdavConfigStore.js';

const REMOTE_DIR = '/gemini-chat';
const REQUEST_TIMEOUT_MS = 30000;
const ENC_MAGIC = 'GCENC1';

async function currentConfig(): Promise<WebDAVStoredConfig> {
  const cfg = await getFullConfig();
  if (!cfg.url) throw new Error('WEBDAV_URL is not configured');
  return cfg;
}

function buildClient(cfg: WebDAVStoredConfig): WebDAVClient {
  return createClient(cfg.url, {
    username: cfg.username,
    password: cfg.password,
  });
}

function deriveKey(keyInput: string): Buffer {
  return crypto.createHash('sha256').update(keyInput, 'utf8').digest();
}

function encrypt(plain: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from(ENC_MAGIC, 'utf8'), iv, tag, ciphertext]);
}

function decrypt(buf: Buffer, key: Buffer): Buffer {
  const magicLen = ENC_MAGIC.length;
  const magic = buf.subarray(0, magicLen).toString('utf8');
  if (magic !== ENC_MAGIC) throw new Error('Invalid encrypted payload (missing magic)');
  const iv = buf.subarray(magicLen, magicLen + 12);
  const tag = buf.subarray(magicLen + 12, magicLen + 12 + 16);
  const ciphertext = buf.subarray(magicLen + 12 + 16);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function withTimeout<T>(p: Promise<T>, ms: number = REQUEST_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`WebDAV request timed out after ${ms}ms`)), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

function encodePayload(jsonData: string, encryptionKey: string): { body: Buffer; ext: string } {
  const gz = gzipSync(Buffer.from(jsonData, 'utf8'));
  if (encryptionKey) {
    const key = deriveKey(encryptionKey);
    const encrypted = encrypt(gz, key);
    return { body: encrypted, ext: '.json.gz.enc' };
  }
  return { body: gz, ext: '.json.gz' };
}

function decodePayload(content: Buffer, filename: string, encryptionKey: string): string {
  let buf = content;
  if (filename.endsWith('.enc') || content.subarray(0, ENC_MAGIC.length).toString('utf8') === ENC_MAGIC) {
    if (!encryptionKey) {
      throw new Error('Encrypted backup detected but encryption key is not configured');
    }
    buf = decrypt(buf, deriveKey(encryptionKey));
  }
  if (filename.endsWith('.gz') || filename.endsWith('.gz.enc') || isGzipHeader(buf)) {
    buf = gunzipSync(buf);
  }
  return buf.toString('utf8');
}

function isGzipHeader(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

async function ensureRemoteDir(dav: WebDAVClient): Promise<void> {
  const exists = await withTimeout(dav.exists(REMOTE_DIR));
  if (!exists) {
    await withTimeout(dav.createDirectory(REMOTE_DIR));
  }
}

export async function uploadBackup(jsonData: string): Promise<string> {
  const cfg = await currentConfig();
  const dav = buildClient(cfg);
  await ensureRemoteDir(dav);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { body, ext } = encodePayload(jsonData, cfg.encryptionKey);
  const filename = `backup-${timestamp}${ext}`;
  const remotePath = `${REMOTE_DIR}/${filename}`;

  await withTimeout(dav.putFileContents(remotePath, body, { overwrite: true }));
  return remotePath;
}

export async function listBackups(): Promise<string[]> {
  const cfg = await currentConfig();
  const dav = buildClient(cfg);
  await ensureRemoteDir(dav);

  const items = (await withTimeout(dav.getDirectoryContents(REMOTE_DIR))) as Array<{
    basename: string;
    filename: string;
  }>;
  return items
    .filter(
      (item) =>
        item.basename.startsWith('backup-') &&
        (item.basename.endsWith('.json') ||
          item.basename.endsWith('.json.gz') ||
          item.basename.endsWith('.json.gz.enc'))
    )
    .map((item) => item.filename)
    .sort()
    .reverse();
}

export async function downloadLatestBackup(): Promise<string | null> {
  const cfg = await currentConfig();
  const dav = buildClient(cfg);
  await ensureRemoteDir(dav);

  const items = (await withTimeout(dav.getDirectoryContents(REMOTE_DIR))) as Array<{
    basename: string;
    filename: string;
  }>;
  const backups = items
    .filter(
      (item) =>
        item.basename.startsWith('backup-') &&
        (item.basename.endsWith('.json') ||
          item.basename.endsWith('.json.gz') ||
          item.basename.endsWith('.json.gz.enc'))
    )
    .map((item) => item.filename)
    .sort()
    .reverse();

  if (backups.length === 0) return null;

  const filename = backups[0]!;
  const content = await withTimeout(dav.getFileContents(filename, { format: 'binary' }));
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content as ArrayBuffer);
  return decodePayload(buf, filename, cfg.encryptionKey);
}

export async function cleanupOldBackups(): Promise<number> {
  const cfg = await currentConfig();
  const dav = buildClient(cfg);
  const backups = await listBackups();
  if (backups.length <= cfg.maxBackups) return 0;

  const toDelete = backups.slice(cfg.maxBackups);
  for (const path of toDelete) {
    try {
      await withTimeout(dav.deleteFile(path));
    } catch (err) {
      console.warn(`[WebDAV] Failed to delete old backup ${path}:`, err);
    }
  }
  return toDelete.length;
}

export interface TestOverride {
  url?: string;
  username?: string;
  password?: string;
  encryptionKey?: string;
}

export async function testConnection(
  override?: TestOverride
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    let cfg: WebDAVStoredConfig;
    if (override && override.url && override.username !== undefined) {
      cfg = {
        enabled: true,
        url: override.url,
        username: override.username,
        password: override.password ?? '',
        encryptionKey: override.encryptionKey ?? '',
        syncInterval: 300,
        maxBackups: 10,
        updatedAt: 0,
      };
    } else {
      cfg = await currentConfig();
    }
    const dav = buildClient(cfg);
    await ensureRemoteDir(dav);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
