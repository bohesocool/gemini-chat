#!/usr/bin/env node
/**
 * 生成 AUTH_PASSWORD_HASH 用的加盐 scrypt 哈希
 * 用法：node scripts/hash-password.js <password>
 *
 * 输出格式：scrypt$N$r$p$<salt b64url>$<hash b64url>
 * scrypt 的输入是密码的 sha256 hex（与登录接口的 passwordHash 传输格式一致）
 */
import crypto from 'crypto';

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.js <password>');
  process.exit(1);
}

const b64url = (buf) =>
  buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const sha256Hex = crypto.createHash('sha256').update(password, 'utf8').digest('hex');
const salt = crypto.randomBytes(16);
const key = crypto.scryptSync(sha256Hex, salt, 32, { N: 16384, r: 8, p: 1 });

console.log(['scrypt', 16384, 8, 1, b64url(salt), b64url(key)].join('$'));
