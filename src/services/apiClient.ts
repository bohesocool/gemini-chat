/**
 * API 客户端 - 与后端 Express 服务通信
 * 当 DB_ENABLED=true 时，前端通过此模块访问服务端数据库
 */

const API_BASE = '/api/v1';
const SERVER_TOKEN_KEY = 'gemini-chat-server-token';

type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  onUnauthorized = handler;
}

export function getServerToken(): string | null {
  try {
    return localStorage.getItem(SERVER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setServerToken(token: string): void {
  try {
    localStorage.setItem(SERVER_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearServerToken(): void {
  try {
    localStorage.removeItem(SERVER_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

async function doFetch(path: string, options?: RequestInit): Promise<Response> {
  const headers = new Headers(options?.headers);
  if (!headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getServerToken();
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    clearServerToken();
    if (onUnauthorized) onUnauthorized();
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Unauthorized');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}: ${res.statusText}`);
  }
  return res;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await doFetch(path, options);
  return res.json();
}

async function requestText(path: string, options?: RequestInit): Promise<string> {
  const res = await doFetch(path, options);
  return res.text();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  getText: (path: string) => requestText(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  del: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'DELETE',
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    }),
};

export interface HealthStatus {
  status: string;
  dbEnabled?: boolean;
  dbStatus?: string;
  webdavEnabled?: boolean;
}

export async function checkHealth(): Promise<HealthStatus> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json();
}

export async function checkHealthDetail(): Promise<HealthStatus> {
  return api.get<HealthStatus>('/health/detail');
}

export interface LoginResponse {
  token: string;
  expiresIn: number;
}

export async function serverLogin(params: { password?: string; passwordHash?: string }): Promise<LoginResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Login failed: ${res.status}`);
  }
  const data = await res.json() as LoginResponse;
  setServerToken(data.token);
  return data;
}

export async function serverLogout(): Promise<void> {
  clearServerToken();
}

export async function serverChangePassword(params: {
  currentPassword?: string;
  currentPasswordHash?: string;
  newPasswordHash: string;
}): Promise<void> {
  await api.post('/auth/change-password', params);
}

export interface SyncStatus {
  webdavEnabled: boolean;
  lastSyncAt: number | null;
  lastSyncStatus: string | null;
  lastError: string | null;
  syncInterval: number;
}

export async function getSyncStatus(): Promise<SyncStatus> {
  return api.get<SyncStatus>('/sync/status');
}

export async function triggerSyncExport(): Promise<{ success: boolean; path?: string }> {
  return api.post('/sync/export', {});
}

export async function triggerSyncImport(): Promise<{ success: boolean }> {
  return api.post('/sync/import', {});
}

export interface ServerWebDAVPublicConfig {
  enabled: boolean;
  url: string;
  username: string;
  hasPassword: boolean;
  hasEncryptionKey: boolean;
  syncInterval: number;
  maxBackups: number;
  updatedAt: number;
}

export interface ServerWebDAVConfigUpdate {
  enabled?: boolean;
  url?: string;
  username?: string;
  password?: string;
  encryptionKey?: string;
  syncInterval?: number;
  maxBackups?: number;
}

export async function getWebDAVConfig(): Promise<ServerWebDAVPublicConfig> {
  return api.get<ServerWebDAVPublicConfig>('/sync/config');
}

export async function updateWebDAVConfig(
  patch: ServerWebDAVConfigUpdate
): Promise<ServerWebDAVPublicConfig> {
  return api.put<ServerWebDAVPublicConfig>('/sync/config', patch);
}

export async function testWebDAVConnection(params: {
  url: string;
  username: string;
  password: string;
  encryptionKey?: string;
}): Promise<{ success: boolean; error?: string }> {
  // 测试连接接口在失败时会返回 400 + { success: false, error }，
  // 这里用原始 fetch 绕过 doFetch 的 throw，以便拿到详细错误
  const token = getServerToken();
  const res = await fetch(`${API_BASE}/sync/test-connection`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(params),
  });
  const body = (await res.json().catch(() => ({}))) as { success?: boolean; error?: string };
  if (res.ok) return { success: Boolean(body.success) };
  return { success: false, error: body.error ?? `HTTP ${res.status}` };
}

export async function migrateFromIndexedDB(data: {
  chatWindows?: unknown[];
  settings?: unknown;
  modelConfigs?: unknown;
  bookmarks?: unknown[];
  templates?: unknown[];
  images?: unknown[];
}): Promise<{ success: boolean }> {
  return api.post('/sync/migrate-from-indexeddb', data);
}
