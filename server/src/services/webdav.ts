import { createClient, WebDAVClient } from 'webdav';
import crypto from 'crypto';
import { gzipSync, gunzipSync } from 'zlib';
import { config } from '../config.js';

let client: WebDAVClient | null = null;

const REMOTE_DIR = '/gemini-chat';
const MAX_BACKUPS = 10;
const REQUEST_TIMEOUT_MS = 30000;
const ENC_MAGIC = 'GCENC1';

export function getWebDAVClient(): WebDAVClient {
  if (!client) {
    if (!config.webdavUrl) throw new Error('WEBDAV_URL not configured');
    client = createClient(config.webdavUrl, {
      username: config.webdavUser,
      password: config.webdavPassword,
    });
  }
  return client;
}

export async function ensureRemoteDir(): Promise<void> {
  const dav = getWebDAVClient();
  const exists = await withTimeout(dav.exists(REMOTE_DIR));
  if (!exists) {
    await withTimeout(dav.createDirectory(REMOTE_DIR));
  }
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
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e); }
    );
  });
}

function encodePayload(jsonData: string): { body: Buffer; ext: string } {
  const gz = gzipSync(Buffer.from(jsonData, 'utf8'));
  if (config.webdavEncryptionKey) {
    const key = deriveKey(config.webdavEncryptionKey);
    const encrypted = encrypt(gz, key);
    return { body: encrypted, ext: '.json.gz.enc' };
  }
  return { body: gz, ext: '.json.gz' };
}

function decodePayload(content: Buffer, filename: string): string {
  let buf = content;
  if (filename.endsWith('.enc') || content.subarray(0, ENC_MAGIC.length).toString('utf8') === ENC_MAGIC) {
    if (!config.webdavEncryptionKey) {
      throw new Error('Encrypted backup detected but WEBDAV_ENCRYPTION_KEY is not configured');
    }
    buf = decrypt(buf, deriveKey(config.webdavEncryptionKey));
  }
  if (filename.endsWith('.gz') || filename.endsWith('.gz.enc') || isGzipHeader(buf)) {
    buf = gunzipSync(buf);
  }
  return buf.toString('utf8');
}

function isGzipHeader(buf: Buffer): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

export async function uploadBackup(jsonData: string): Promise<string> {
  const dav = getWebDAVClient();
  await ensureRemoteDir();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { body, ext } = encodePayload(jsonData);
  const filename = `backup-${timestamp}${ext}`;
  const remotePath = `${REMOTE_DIR}/${filename}`;

  await withTimeout(dav.putFileContents(remotePath, body, { overwrite: true }));
  return remotePath;
}

export async function listBackups(): Promise<string[]> {
  const dav = getWebDAVClient();
  await ensureRemoteDir();

  const items = await withTimeout(dav.getDirectoryContents(REMOTE_DIR)) as Array<{ basename: string; filename: string }>;
  return items
    .filter(item => item.basename.startsWith('backup-') && (
      item.basename.endsWith('.json') ||
      item.basename.endsWith('.json.gz') ||
      item.basename.endsWith('.json.gz.enc')
    ))
    .map(item => item.filename)
    .sort()
    .reverse();
}

export async function downloadLatestBackup(): Promise<string | null> {
  const backups = await listBackups();
  if (backups.length === 0) return null;

  const dav = getWebDAVClient();
  const filename = backups[0]!;
  const content = await withTimeout(dav.getFileContents(filename, { format: 'binary' }));
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content as ArrayBuffer);
  return decodePayload(buf, filename);
}

export async function cleanupOldBackups(): Promise<number> {
  const backups = await listBackups();
  if (backups.length <= MAX_BACKUPS) return 0;

  const dav = getWebDAVClient();
  const toDelete = backups.slice(MAX_BACKUPS);
  for (const path of toDelete) {
    try {
      await withTimeout(dav.deleteFile(path));
    } catch (err) {
      console.warn(`[WebDAV] Failed to delete old backup ${path}:`, err);
    }
  }
  return toDelete.length;
}
