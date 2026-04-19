import { Router } from 'express';
import {
  verifyPasswordInput,
  issueToken,
  TOKEN_EXPIRY_MS,
  setAuthPasswordHash,
  getAuthPasswordHash,
} from '../services/serverAuth.js';
import { requireAuth } from '../middleware/auth.js';
import { config } from '../config.js';

export const authRouter = Router();

authRouter.post('/login', (req, res) => {
  const body = (req.body ?? {}) as { password?: unknown; passwordHash?: unknown };
  const password = typeof body.password === 'string' ? body.password : undefined;
  const passwordHash = typeof body.passwordHash === 'string' ? body.passwordHash : undefined;

  if (!password && !passwordHash) {
    return res.status(400).json({ error: 'password or passwordHash required' });
  }

  const ok = verifyPasswordInput({ password, passwordHash });
  if (!ok) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = issueToken();
  res.json({ token, expiresIn: TOKEN_EXPIRY_MS });
});

authRouter.get('/me', requireAuth, (_req, res) => {
  res.json({
    authenticated: true,
    authConfigured: !!config.authPasswordHash,
  });
});

authRouter.post('/change-password', requireAuth, (req, res) => {
  const body = (req.body ?? {}) as {
    currentPassword?: unknown;
    currentPasswordHash?: unknown;
    newPasswordHash?: unknown;
  };
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : undefined;
  const currentPasswordHash = typeof body.currentPasswordHash === 'string' ? body.currentPasswordHash : undefined;
  const newPasswordHash = typeof body.newPasswordHash === 'string' ? body.newPasswordHash : undefined;

  if (!newPasswordHash || !/^[a-f0-9]{64}$/i.test(newPasswordHash)) {
    return res.status(400).json({ error: 'newPasswordHash required (SHA-256 hex)' });
  }

  const ok = verifyPasswordInput({ password: currentPassword, passwordHash: currentPasswordHash });
  if (!ok) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  try {
    setAuthPasswordHash(newPasswordHash);
    res.json({ success: true, activeHash: getAuthPasswordHash().slice(0, 8) });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : String(err) });
  }
});
