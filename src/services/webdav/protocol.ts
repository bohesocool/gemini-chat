/**
 * 跨平台 WebDAV 协议层
 *
 * 同时支持浏览器和 Node.js 18+（只依赖 fetch / WebCrypto / CompressionStream，不引入 Node 专属 API）。
 * 服务端和前端都通过这个模块与 WebDAV 交互，保证备份格式完全一致。
 *
 * 支持的备份格式：
 *   - backup-<timestamp>.json.gz          纯 gzip
 *   - backup-<timestamp>.json.gz.enc      gzip + AES-256-GCM 加密
 */

export interface WebDAVRuntimeConfig {
  /** 服务器基础 URL，末尾应带斜杠（例如 https://example.com/dav/） */
  url: string;
  username: string;
  password: string;
  /** 可选：AES-GCM 对称加密密钥（任意字符串，内部做 SHA-256 派生） */
  encryptionKey?: string;
  /** 远端存放目录（相对路径），默认 /gemini-chat */
  remoteDir?: string;
  /** 最多保留多少份备份，默认 10 */
  maxBackups?: number;
  /** 单次请求超时（毫秒），默认 30_000 */
  requestTimeoutMs?: number;
}

const DEFAULT_REMOTE_DIR = '/gemini-chat';
const DEFAULT_MAX_BACKUPS = 10;
const DEFAULT_TIMEOUT_MS = 30_000;
const ENC_MAGIC = 'GCENC1';
const ENC_MAGIC_BYTES = new TextEncoder().encode(ENC_MAGIC);

// ========== URL 拼接工具 ==========

function trimTrailingSlash(s: string): string {
  return s.replace(/\/+$/, '');
}

function trimLeadingSlash(s: string): string {
  return s.replace(/^\/+/, '');
}

function joinUrl(base: string, path: string): string {
  return `${trimTrailingSlash(base)}/${trimLeadingSlash(path)}`;
}

function resolveRemoteDir(cfg: WebDAVRuntimeConfig): string {
  const dir = cfg.remoteDir ?? DEFAULT_REMOTE_DIR;
  return `/${trimLeadingSlash(trimTrailingSlash(dir))}`;
}

function buildAuthHeader(cfg: WebDAVRuntimeConfig): string {
  const token = `${cfg.username}:${cfg.password}`;
  // btoa / Buffer 都不一定可用，统一走 TextEncoder + base64（Web 端 btoa 能处理 latin-1）
  if (typeof btoa === 'function') {
    return `Basic ${btoa(unescape(encodeURIComponent(token)))}`;
  }
  // Node fallback
  return `Basic ${Buffer.from(token, 'utf8').toString('base64')}`;
}

// ========== fetch 封装 ==========

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`WebDAV request timed out after ${ms}ms`)),
      ms
    );
    promise.then(
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

interface RequestOptions {
  method: string;
  body?: BodyInit | null;
  extraHeaders?: Record<string, string>;
  expectOk?: boolean;
  allowStatuses?: number[];
}

async function webdavFetch(
  cfg: WebDAVRuntimeConfig,
  path: string,
  opts: RequestOptions
): Promise<Response> {
  if (!cfg.url) throw new Error('WebDAV URL is not configured');

  const timeout = cfg.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const url = joinUrl(cfg.url, path);
  const headers: Record<string, string> = {
    Authorization: buildAuthHeader(cfg),
    ...(opts.extraHeaders ?? {}),
  };

  const res = await withTimeout(
    fetch(url, {
      method: opts.method,
      headers,
      body: opts.body ?? null,
      // 注意：浏览器模式下远程 WebDAV 不支持 CORS 会在这里抛错，上层有提示
      redirect: 'follow',
    }),
    timeout
  );

  if (opts.expectOk !== false) {
    const allowed = opts.allowStatuses ?? [];
    if (!res.ok && !allowed.includes(res.status)) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `WebDAV ${opts.method} ${path} failed: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`
      );
    }
  }

  return res;
}

// ========== gzip / ungzip（CompressionStream） ==========

async function readAllFromStream(
  stream: ReadableStream<Uint8Array>
): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.byteLength;
    }
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

function uint8ToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function gzip(data: Uint8Array): Promise<Uint8Array> {
  const CS = (globalThis as unknown as { CompressionStream?: typeof CompressionStream })
    .CompressionStream;
  if (!CS) throw new Error('CompressionStream is not available in this runtime');
  const stream = uint8ToStream(data).pipeThrough(new CS('gzip'));
  return readAllFromStream(stream);
}

async function gunzip(data: Uint8Array): Promise<Uint8Array> {
  const DS = (globalThis as unknown as { DecompressionStream?: typeof DecompressionStream })
    .DecompressionStream;
  if (!DS) throw new Error('DecompressionStream is not available in this runtime');
  const stream = uint8ToStream(data).pipeThrough(new DS('gzip'));
  return readAllFromStream(stream);
}

// ========== AES-256-GCM（WebCrypto） ==========

async function deriveKey(keyInput: string): Promise<CryptoKey> {
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(keyInput)
  );
  return crypto.subtle.importKey('raw', hash, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ]);
}

function concat(parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((s, p) => s + p.byteLength, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.byteLength;
  }
  return out;
}

async function encryptAesGcm(plain: Uint8Array, keyInput: string): Promise<Uint8Array> {
  const key = await deriveKey(keyInput);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipherBuf = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, plain);
  // WebCrypto 输出是 ciphertext||tag（tag=16字节）；为了与 Node cipher 的 getAuthTag 模式兼容，
  // 我们把 tag 拆到前面：magic || iv(12) || tag(16) || ciphertext
  const cipherWithTag = new Uint8Array(cipherBuf);
  const tag = cipherWithTag.slice(cipherWithTag.length - 16);
  const ciphertext = cipherWithTag.slice(0, cipherWithTag.length - 16);
  return concat([ENC_MAGIC_BYTES, iv, tag, ciphertext]);
}

async function decryptAesGcm(buf: Uint8Array, keyInput: string): Promise<Uint8Array> {
  const magicLen = ENC_MAGIC_BYTES.length;
  const magic = new TextDecoder().decode(buf.subarray(0, magicLen));
  if (magic !== ENC_MAGIC) {
    throw new Error('Invalid encrypted payload (missing magic header)');
  }
  const iv = buf.subarray(magicLen, magicLen + 12);
  const tag = buf.subarray(magicLen + 12, magicLen + 12 + 16);
  const ciphertext = buf.subarray(magicLen + 12 + 16);
  // 拼回 WebCrypto 需要的 ciphertext||tag
  const combined = concat([ciphertext, tag]);
  const key = await deriveKey(keyInput);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, combined);
  return new Uint8Array(plain);
}

function isGzipHeader(buf: Uint8Array): boolean {
  return buf.length >= 2 && buf[0] === 0x1f && buf[1] === 0x8b;
}

function looksEncrypted(buf: Uint8Array): boolean {
  if (buf.length < ENC_MAGIC_BYTES.length) return false;
  for (let i = 0; i < ENC_MAGIC_BYTES.length; i++) {
    if (buf[i] !== ENC_MAGIC_BYTES[i]) return false;
  }
  return true;
}

// ========== payload 编解码 ==========

async function encodePayload(
  jsonData: string,
  encryptionKey?: string
): Promise<{ body: Uint8Array; ext: string }> {
  const gz = await gzip(new TextEncoder().encode(jsonData));
  if (encryptionKey && encryptionKey.length > 0) {
    const enc = await encryptAesGcm(gz, encryptionKey);
    return { body: enc, ext: '.json.gz.enc' };
  }
  return { body: gz, ext: '.json.gz' };
}

async function decodePayload(
  content: Uint8Array,
  filename: string,
  encryptionKey?: string
): Promise<string> {
  let buf: Uint8Array = content;
  if (filename.endsWith('.enc') || looksEncrypted(buf)) {
    if (!encryptionKey) {
      throw new Error(
        'Encrypted backup detected but encryption key is not configured'
      );
    }
    buf = await decryptAesGcm(buf, encryptionKey);
  }
  if (
    filename.endsWith('.gz') ||
    filename.endsWith('.gz.enc') ||
    isGzipHeader(buf)
  ) {
    buf = await gunzip(buf);
  }
  return new TextDecoder().decode(buf);
}

// ========== 目录操作 ==========

async function exists(cfg: WebDAVRuntimeConfig, path: string): Promise<boolean> {
  const res = await webdavFetch(cfg, path, {
    method: 'PROPFIND',
    extraHeaders: { Depth: '0' },
    expectOk: false,
  });
  return res.status >= 200 && res.status < 300;
}

async function createDirectory(cfg: WebDAVRuntimeConfig, path: string): Promise<void> {
  const res = await webdavFetch(cfg, path, {
    method: 'MKCOL',
    expectOk: false,
    allowStatuses: [405, 301, 409],
  });
  // 405 通常表示目录已存在，允许通过
  if (res.status >= 400 && res.status !== 405 && res.status !== 301 && res.status !== 409) {
    const text = await res.text().catch(() => '');
    throw new Error(
      `MKCOL ${path} failed: ${res.status} ${res.statusText}${text ? ` - ${text.slice(0, 200)}` : ''}`
    );
  }
}

export async function ensureRemoteDir(cfg: WebDAVRuntimeConfig): Promise<void> {
  const dir = resolveRemoteDir(cfg);
  const found = await exists(cfg, dir);
  if (!found) {
    await createDirectory(cfg, dir);
  }
}

// ========== PROPFIND 解析（获取目录下文件列表） ==========

/**
 * 解析 PROPFIND multistatus XML，提取所有 <d:response><d:href>。
 * 同时兼容 `D:`、`d:`、无前缀这三种命名空间写法。
 */
function parseHrefsFromMultistatus(xml: string): string[] {
  // 匹配 <href>...</href>，大小写不敏感，忽略命名空间前缀
  const re = /<[a-zA-Z]*:?href[^>]*>([^<]+)<\/[a-zA-Z]*:?href>/gi;
  const hrefs: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const raw = (match[1] ?? '').trim();
    if (raw) {
      try {
        hrefs.push(decodeURIComponent(raw));
      } catch {
        hrefs.push(raw);
      }
    }
  }
  return hrefs;
}

function hrefBasename(href: string): string {
  const noTrailing = href.replace(/\/+$/, '');
  const idx = noTrailing.lastIndexOf('/');
  return idx >= 0 ? noTrailing.substring(idx + 1) : noTrailing;
}

// ========== 备份 API ==========

export async function uploadBackup(
  cfg: WebDAVRuntimeConfig,
  jsonData: string
): Promise<string> {
  await ensureRemoteDir(cfg);
  const dir = resolveRemoteDir(cfg);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const { body, ext } = await encodePayload(jsonData, cfg.encryptionKey);
  const filename = `backup-${timestamp}${ext}`;
  const remotePath = `${dir}/${filename}`;
  await webdavFetch(cfg, remotePath, {
    method: 'PUT',
    body: body as BodyInit,
    extraHeaders: { 'Content-Type': 'application/octet-stream' },
  });
  return remotePath;
}

export async function listBackups(cfg: WebDAVRuntimeConfig): Promise<string[]> {
  await ensureRemoteDir(cfg);
  const dir = resolveRemoteDir(cfg);
  const res = await webdavFetch(cfg, dir, {
    method: 'PROPFIND',
    extraHeaders: {
      Depth: '1',
      'Content-Type': 'application/xml; charset=utf-8',
    },
    body: `<?xml version="1.0" encoding="utf-8"?>
<propfind xmlns="DAV:"><prop><getcontentlength/><getlastmodified/></prop></propfind>`,
    allowStatuses: [207],
  });
  const xml = await res.text();
  const hrefs = parseHrefsFromMultistatus(xml);
  const filtered = hrefs
    .filter((href) => {
      const name = hrefBasename(href);
      return (
        name.startsWith('backup-') &&
        (name.endsWith('.json') ||
          name.endsWith('.json.gz') ||
          name.endsWith('.json.gz.enc'))
      );
    })
    // 规范成 /<dir>/<name> 形式（去掉可能的 host 前缀）
    .map((href) => {
      try {
        const parsed = new URL(href, cfg.url);
        return parsed.pathname;
      } catch {
        return href;
      }
    });
  // 按文件名里的 ISO 时间戳降序（最新在前）
  return filtered.sort().reverse();
}

export async function downloadLatestBackup(
  cfg: WebDAVRuntimeConfig
): Promise<string | null> {
  const backups = await listBackups(cfg);
  if (backups.length === 0) return null;
  const path = backups[0]!;
  const res = await webdavFetch(cfg, path, { method: 'GET' });
  const buf = new Uint8Array(await res.arrayBuffer());
  return decodePayload(buf, path, cfg.encryptionKey);
}

export async function cleanupOldBackups(cfg: WebDAVRuntimeConfig): Promise<number> {
  const max = cfg.maxBackups ?? DEFAULT_MAX_BACKUPS;
  const backups = await listBackups(cfg);
  if (backups.length <= max) return 0;
  const toDelete = backups.slice(max);
  let deleted = 0;
  for (const path of toDelete) {
    try {
      await webdavFetch(cfg, path, { method: 'DELETE', allowStatuses: [404] });
      deleted++;
    } catch {
      // 删除失败不中断主流程
    }
  }
  return deleted;
}

export async function testConnection(
  cfg: WebDAVRuntimeConfig
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    if (!cfg.url) return { ok: false, error: 'URL is empty' };
    await ensureRemoteDir(cfg);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
