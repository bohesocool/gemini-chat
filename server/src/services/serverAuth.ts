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
  if (fromEnv && /^[a-f0-9]{64}$/i.test(fromEnv)) {
    cachedAuthHash = fromEnv.toLowerCase();
  } else {
    cachedAuthHash = sha256Hex(FALLBACK_PASSWORD);
  }
  return cachedAuthHash;
}

export function setAuthPasswordHash(newHash: string): void {
  if (!/^[a-f0-9]{64}$/i.test(newHash)) {
    throw new Error('Invalid password hash format, expected SHA-256 hex');
  }
  cachedAuthHash = newHash.toLowerCase();
}

function getJwtSecret(): string {
  if (cachedSecret) return cachedSecret;
  const envSecret = config.jwtSecret;
  if (envSecret && envSecret.length >= 16) {
    cachedSecret = envSecret;
  } else {
    cachedSecret = crypto.randomBytes(32).toString('hex');
    console.log('[auth] JWT_SECRET not configured, generated ephemeral secret (tokens invalidated on restart)');
  }
  return cachedSecret;
}

export function verifyPasswordInput(input: { password?: string; passwordHash?: string }): boolean {
  const target = getAuthPasswordHash();
  let candidate: string | undefined;
  if (typeof input.passwordHash === 'string' && input.passwordHash.length > 0) {
    candidate = input.passwordHash.toLowerCase();
  } else if (typeof input.password === 'string' && input.password.length > 0) {
    candidate = sha256Hex(input.password);
  }
  if (!candidate) return false;
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
