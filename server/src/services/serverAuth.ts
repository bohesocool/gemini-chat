import crypto from 'crypto';
import { config } from '../config.js';

const FALLBACK_PASSWORD = 'adminiadmin';

export const TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

interface TokenPayload {
  iat: number;
  exp: number;
  sub: string;
}

let cachedAuthHash: string | null = null;
let cachedSecret: string | null = null;

function sha256Hex(input: string): string {
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex');
}

// ============ scrypt 密码哈希 ============
// 存储格式：scrypt$N$r$p$<salt b64url>$<hash b64url>
// 输入统一为密码的 sha256 hex（与登录接口的 passwordHash 传输格式一致），
// 这样无论客户端传明文还是 sha256，服务端都能用同一份 scrypt 哈希校验。

const SCRYPT_PREFIX = 'scrypt';
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 32;
const SCRYPT_MAXMEM = 256 * 1024 * 1024;

function isScryptHash(value: string): boolean {
  return value.startsWith(`${SCRYPT_PREFIX}$`);
}

export function scryptHashFromSha256Hex(sha256HexInput: string): string {
  const salt = crypto.randomBytes(16);
  const key = crypto.scryptSync(sha256HexInput.toLowerCase(), salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
    maxmem: SCRYPT_MAXMEM,
  });
  return [
    SCRYPT_PREFIX,
    SCRYPT_N,
    SCRYPT_R,
    SCRYPT_P,
    base64UrlEncode(salt),
    base64UrlEncode(key),
  ].join('$');
}

function verifyScrypt(candidateSha256Hex: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6) return false;
  const N = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  const saltB64 = parts[4];
  const hashB64 = parts[5];
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
  if (!saltB64 || !hashB64) return false;
  try {
    const salt = base64UrlDecode(saltB64);
    const expected = base64UrlDecode(hashB64);
    if (expected.length === 0) return false;
    const key = crypto.scryptSync(candidateSha256Hex.toLowerCase(), salt, expected.length, {
      N,
      r,
      p,
      maxmem: SCRYPT_MAXMEM,
    });
    return crypto.timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}

function base64UrlEncode(buf: Buffer | string): string {
  const b = typeof buf === 'string' ? Buffer.from(buf, 'utf8') : buf;
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Buffer {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad) s += '='.repeat(4 - pad);
  return Buffer.from(s, 'base64');
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function getAuthPasswordHash(): string {
  if (cachedAuthHash) return cachedAuthHash;
  const fromEnv = config.authPasswordHash;
  if (fromEnv && isScryptHash(fromEnv)) {
    cachedAuthHash = fromEnv;
  } else if (fromEnv && /^[a-f0-9]{64}$/i.test(fromEnv)) {
    // 兼容旧的无盐 SHA-256 格式
    cachedAuthHash = fromEnv.toLowerCase();
    console.warn(
      '[auth] AUTH_PASSWORD_HASH is a legacy unsalted SHA-256 hash. ' +
      'Run `node scripts/hash-password.js <password>` to generate a salted scrypt hash.'
    );
  } else {
    cachedAuthHash = sha256Hex(FALLBACK_PASSWORD);
  }
  return cachedAuthHash;
}

export function setAuthPasswordHash(newSha256Hash: string): void {
  if (!/^[a-f0-9]{64}$/i.test(newSha256Hash)) {
    throw new Error('Invalid password hash format, expected SHA-256 hex');
  }
  // 内存中以加盐 scrypt 形式保存
  cachedAuthHash = scryptHashFromSha256Hex(newSha256Hash);
}

function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const envSecret = config.jwtSecret;
  if (envSecret && envSecret.length >= 16) {
    cachedSecret = envSecret;
  } else {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    console.warn('='.repeat(64));
    console.warn('[auth] WARNING: JWT_SECRET is not configured (or shorter than 16 chars).');
    console.warn('[auth] Using an ephemeral secret: EVERY RESTART LOGS OUT ALL USERS.');
    console.warn('[auth] Set JWT_SECRET or JWT_SECRET_FILE to a long random string.');
    console.warn('='.repeat(64));
  }
  return cachedSecret;
}

/**
 * 启动时校验 JWT 密钥配置，未配置则立即打印告警（而不是等到第一次登录）
 */
export function warnIfJwtSecretMissing(): void {
  getJwtSecret();
}

export function verifyPasswordInput(input: { password?: string; passwordHash?: string }): boolean {
  const target = getAuthPasswordHash();
  let candidate: string | undefined;
  const hashCandidate =
    typeof input.passwordHash === 'string' && /^[a-f0-9]{64}$/i.test(input.passwordHash)
      ? input.passwordHash.toLowerCase()
      : undefined;
  if (hashCandidate) {
    candidate = hashCandidate;
  } else if (typeof input.password === 'string' && input.password.length > 0) {
    candidate = sha256Hex(input.password);
  }
  if (!candidate) return false;
  if (isScryptHash(target)) {
    return verifyScrypt(candidate, target);
  }
  return timingSafeEqualStr(candidate, target);
}

export function issueToken(subject = 'user'): string {
  const now = Date.now();
  const payload: TokenPayload = {
    iat: now,
    exp: now + TOKEN_EXPIRY_MS,
    sub: subject,
  };
  const headerB64 = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(signingInput).digest();
  const sigB64 = base64UrlEncode(sig);
  return `${signingInput}.${sigB64}`;
}

export function verifyServerToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts as [string, string, string];

    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(signingInput).digest();
    const providedSig = base64UrlDecode(sigB64);

    if (expectedSig.length !== providedSig.length) return null;
    if (!crypto.timingSafeEqual(expectedSig, providedSig)) return null;

    const headerJson = base64UrlDecode(headerB64).toString('utf8');
    const header = JSON.parse(headerJson) as { alg?: string; typ?: string };
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return null;

    const payloadJson = base64UrlDecode(payloadB64).toString('utf8');
    const payload = JSON.parse(payloadJson) as TokenPayload;
    if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null;
    if (Date.now() >= payload.exp) return null;

    return payload;
  } catch {
    return null;
  }
}
