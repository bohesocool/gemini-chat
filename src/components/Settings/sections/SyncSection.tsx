/**
 * WebDAV 同步设置
 *
 * Requirements: 3.5, 3.6
 */

import { memo, useState, useEffect, useCallback } from 'react';
import { isApiMode } from '../../../services/storageAdapter';
import {
  getSyncStatus,
  triggerSyncExport,
  triggerSyncImport,
  getWebDAVConfig,
  updateWebDAVConfig,
  testWebDAVConnection,
  type SyncStatus,
  type ServerWebDAVPublicConfig,
} from '../../../services/apiClient';
import * as browserConfigStore from '../../../services/webdav/configStorage';
import * as browserSync from '../../../services/webdav/browserSync';
import {
  reloadBrowserScheduler,
  isBrowserSchedulerRunning,
} from '../../../services/webdav/browserScheduler';
import { testConnection as browserTestConnection } from '../../../services/webdav/protocol';
import { useTranslation } from '../../../i18n/useTranslation';

interface WebDAVFormState {
  enabled: boolean;
  url: string;
  username: string;
  password: string;
  passwordChanged: boolean;
  encryptionKey: string;
  encryptionKeyChanged: boolean;
  syncInterval: number;
  maxBackups: number;
  hasPassword: boolean;
  hasEncryptionKey: boolean;
}

const EMPTY_FORM: WebDAVFormState = {
  enabled: false,
  url: '',
  username: '',
  password: '',
  passwordChanged: false,
  encryptionKey: '',
  encryptionKeyChanged: false,
  syncInterval: 300,
  maxBackups: 10,
  hasPassword: false,
  hasEncryptionKey: false,
};

export const SyncSection = memo(function SyncSection() {
  const { t } = useTranslation();
  const apiMode = isApiMode();

  const [form, setForm] = useState<WebDAVFormState>(EMPTY_FORM);
  const [initialized, setInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ tone: 'info' | 'ok' | 'error'; text: string } | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // 服务端模式的额外状态信息
  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  // 浏览器模式的本地同步状态快照
  const [browserState, setBrowserState] = useState(() => browserSync.readSyncState());

  const showTempMessage = useCallback(
    (tone: 'info' | 'ok' | 'error', text: string, timeout = 4000) => {
      setMessage({ tone, text });
      if (timeout > 0) {
        setTimeout(() => setMessage(null), timeout);
      }
    },
    []
  );

  const applyPublicConfig = useCallback(
    (
      cfg: ServerWebDAVPublicConfig | browserConfigStore.BrowserWebDAVPublicConfig
    ) => {
      setForm({
        enabled: cfg.enabled,
        url: cfg.url,
        username: cfg.username,
        password: '',
        passwordChanged: false,
        encryptionKey: '',
        encryptionKeyChanged: false,
        syncInterval: cfg.syncInterval,
        maxBackups: cfg.maxBackups,
        hasPassword: cfg.hasPassword,
        hasEncryptionKey: cfg.hasEncryptionKey,
      });
    },
    []
  );

  const refreshState = useCallback(async () => {
    try {
      if (apiMode) {
        const [cfg, status] = await Promise.all([
          getWebDAVConfig().catch(() => null),
          getSyncStatus().catch(() => null),
        ]);
        if (cfg) applyPublicConfig(cfg);
        setSyncStatus(status);
      } else {
        const cfg = await browserConfigStore.getPublicConfig();
        applyPublicConfig(cfg);
        setBrowserState(browserSync.readSyncState());
      }
    } finally {
      setInitialized(true);
    }
  }, [apiMode, applyPublicConfig]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const patch = {
        enabled: form.enabled,
        url: form.url.trim(),
        username: form.username.trim(),
        syncInterval: form.syncInterval,
        maxBackups: form.maxBackups,
        ...(form.passwordChanged ? { password: form.password } : {}),
        ...(form.encryptionKeyChanged ? { encryptionKey: form.encryptionKey } : {}),
      };
      if (apiMode) {
        await updateWebDAVConfig(patch);
      } else {
        await browserConfigStore.updateConfig(patch);
        await reloadBrowserScheduler();
      }
      showTempMessage('ok', t('settings.webdavSaved') || '配置已保存');
      await refreshState();
    } catch (err) {
      showTempMessage(
        'error',
        err instanceof Error ? err.message : t('settings.webdavSaveFailed') || '保存失败',
        8000
      );
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setMessage(null);
    try {
      // 如果用户没有改密码，就使用已保存的凭据测试；否则用当前表单
      if (apiMode) {
        if (form.passwordChanged || !form.hasPassword) {
          const res = await testWebDAVConnection({
            url: form.url.trim(),
            username: form.username.trim(),
            password: form.password,
            encryptionKey: form.encryptionKeyChanged ? form.encryptionKey : undefined,
          });
          if (res.success) showTempMessage('ok', t('settings.webdavTestOk') || '连接成功');
          else showTempMessage('error', res.error ?? 'Test failed', 8000);
        } else {
          // 没改密码 → 让后端用库内现有凭据（前端没有明文），先让用户保存再测
          showTempMessage(
            'info',
            t('settings.webdavTestNeedsPassword') ||
              '请重新填写密码后再测试（已保存的密码无法从前端回读）'
          );
        }
      } else {
        const runtime = {
          url: form.url.trim(),
          username: form.username.trim(),
          password: form.passwordChanged ? form.password : '',
          encryptionKey: form.encryptionKeyChanged ? form.encryptionKey : undefined,
        };
        if (!form.passwordChanged && form.hasPassword) {
          // 浏览器模式：从 IndexedDB 把明文读出来测
          const full = await browserConfigStore.getFullConfig();
          runtime.password = full.password;
          if (full.encryptionKey && !form.encryptionKeyChanged) {
            runtime.encryptionKey = full.encryptionKey;
          }
        }
        const res = await browserTestConnection(runtime);
        if (res.ok) showTempMessage('ok', t('settings.webdavTestOk') || '连接成功');
        else showTempMessage('error', res.error, 10000);
      }
    } catch (err) {
      showTempMessage('error', err instanceof Error ? err.message : 'Test failed', 8000);
    } finally {
      setTesting(false);
    }
  };

  const handleManualExport = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      if (apiMode) {
        await triggerSyncExport();
      } else {
        const res = await browserSync.runBrowserSyncOnce();
        if (!res.success) throw new Error(res.error ?? 'sync failed');
      }
      showTempMessage('ok', t('settings.syncExportSuccess') || '已导出到 WebDAV');
      await refreshState();
    } catch (err) {
      showTempMessage('error', err instanceof Error ? err.message : '同步失败', 10000);
    } finally {
      setSyncing(false);
    }
  };

  const handleManualImport = async () => {
    if (!window.confirm(t('settings.syncImportConfirm') || '从 WebDAV 恢复将覆盖本地数据，确定继续吗？')) return;
    setSyncing(true);
    setMessage(null);
    try {
      if (apiMode) {
        await triggerSyncImport();
      } else {
        const res = await browserSync.runBrowserImportOnce();
        if (!res.success) throw new Error(res.error ?? 'import failed');
      }
      showTempMessage('ok', t('settings.syncImportSuccess') || '已从 WebDAV 导入');
      await refreshState();
    } catch (err) {
      showTempMessage('error', err instanceof Error ? err.message : '同步失败', 10000);
    } finally {
      setSyncing(false);
    }
  };

  const lastSyncAt = apiMode ? syncStatus?.lastSyncAt : browserState.lastSyncAt;
  const lastSyncStatus = apiMode ? syncStatus?.lastSyncStatus : browserState.lastSyncStatus;
  const lastError = apiMode ? syncStatus?.lastError : browserState.lastError;
  const webdavEffectivelyEnabled = apiMode
    ? Boolean(syncStatus?.webdavEnabled)
    : form.enabled && form.url.length > 0;

  const lastSyncText = lastSyncAt ? new Date(lastSyncAt).toLocaleString() : '-';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
          {t('settings.syncTitle') || '数据同步'}
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('settings.syncDesc') || '通过 WebDAV 在多设备间同步数据。'}
        </p>
        {!apiMode && (
          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t('settings.syncBrowserModeNote') ||
                '当前为浏览器本地存储模式。WebDAV 将在浏览器中直接连接远端服务器，数据来自 IndexedDB。自动备份仅在页面打开时运行。'}
              <br />
              <strong>{t('common.note') || '注意'}：</strong>
              {t('settings.syncBrowserModeCorsWarn') ||
                '许多公共 WebDAV 服务（如坚果云）默认不允许浏览器跨域请求，可能会出现 CORS 错误。若遇到该问题，请改用支持 CORS 的 WebDAV 服务（如自建 Nextcloud / dufs）或启用数据库模式让服务器代为同步。'}
            </p>
          </div>
        )}
      </div>

      {/* 同步状态 */}
      {initialized && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {t('settings.syncStatus') || '同步状态'}
            </span>
            <span
              className={`text-sm font-medium ${
                lastSyncStatus === 'success'
                  ? 'text-green-600 dark:text-green-400'
                  : lastSyncStatus === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {webdavEffectivelyEnabled
                ? lastSyncStatus === 'success'
                  ? '✓ ' + (t('settings.syncOk') || '正常')
                  : lastSyncStatus === 'error'
                  ? '✗ ' + (t('settings.syncError') || '错误')
                  : t('settings.syncWaiting') || '等待中'
                : t('settings.syncWebdavOff') || 'WebDAV 未启用'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {t('settings.syncLastTime') || '上次同步'}
            </span>
            <span className="text-sm text-slate-500 dark:text-slate-400">{lastSyncText}</span>
          </div>
          {!apiMode && form.enabled && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {t('settings.syncSchedulerState') || '定时器'}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {isBrowserSchedulerRunning()
                  ? t('settings.syncSchedulerOn') || '运行中'
                  : t('settings.syncSchedulerOff') || '未运行'}
              </span>
            </div>
          )}
          {lastError && (
            <p className="text-xs text-red-500 dark:text-red-400 break-all">{lastError}</p>
          )}
        </div>
      )}

      {/* 配置表单 */}
      <div className="space-y-4">
        <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200">
          {t('settings.webdavConfig') || 'WebDAV 配置'}
        </h4>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
            className="w-4 h-4"
          />
          <span className="text-sm text-slate-700 dark:text-slate-300">
            {t('settings.webdavEnable') || '启用 WebDAV 同步'}
          </span>
        </label>

        <div>
          <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
            {t('settings.webdavUrl') || 'WebDAV 服务器地址'}
            <span className="ml-1 text-slate-400">
              ({t('settings.webdavUrlHint') || '末尾需带斜杠，示例 https://dav.example.com/remote.php/webdav/'})
            </span>
          </label>
          <input
            type="url"
            value={form.url}
            onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            placeholder="https://dav.example.com/dav/"
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              {t('settings.webdavUsername') || '用户名'}
            </label>
            <input
              type="text"
              autoComplete="username"
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              {t('settings.webdavPassword') || '密码'}
              {form.hasPassword && !form.passwordChanged && (
                <span className="ml-1 text-green-600 dark:text-green-400">
                  ({t('settings.webdavPasswordSaved') || '已保存'})
                </span>
              )}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(e) =>
                setForm((f) => ({ ...f, password: e.target.value, passwordChanged: true }))
              }
              placeholder={
                form.hasPassword && !form.passwordChanged
                  ? t('settings.webdavPasswordPlaceholderKeep') || '留空则保持原密码'
                  : t('settings.webdavPasswordPlaceholder') || '输入 WebDAV 密码'
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              {t('settings.webdavSyncInterval') || '自动同步间隔（秒）'}
            </label>
            <input
              type="number"
              min={10}
              max={86400}
              value={form.syncInterval}
              onChange={(e) =>
                setForm((f) => ({ ...f, syncInterval: Number(e.target.value) || 300 }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              {t('settings.webdavMaxBackups') || '保留备份数量'}
            </label>
            <input
              type="number"
              min={1}
              max={200}
              value={form.maxBackups}
              onChange={(e) =>
                setForm((f) => ({ ...f, maxBackups: Number(e.target.value) || 10 }))
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowAdvanced((s) => !s)}
          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
        >
          {showAdvanced
            ? t('settings.hideAdvanced') || '隐藏高级选项'
            : t('settings.showAdvanced') || '显示高级选项'}
        </button>

        {showAdvanced && (
          <div>
            <label className="block text-xs text-slate-600 dark:text-slate-400 mb-1">
              {t('settings.webdavEncryptionKey') || '备份加密密钥（可选）'}
              {form.hasEncryptionKey && !form.encryptionKeyChanged && (
                <span className="ml-1 text-green-600 dark:text-green-400">
                  ({t('settings.webdavPasswordSaved') || '已保存'})
                </span>
              )}
            </label>
            <input
              type="password"
              autoComplete="new-password"
              value={form.encryptionKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, encryptionKey: e.target.value, encryptionKeyChanged: true }))
              }
              placeholder={
                t('settings.webdavEncryptionKeyPlaceholder') ||
                '留空不加密；设置后备份会以 AES-256-GCM 加密上传'
              }
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
            />
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {t('settings.webdavEncryptionKeyHelp') ||
                '请牢记此密钥；更换或丢失后旧备份将无法恢复。'}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleTestConnection}
            disabled={testing || !form.url.trim() || !form.username.trim()}
            className="px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-lg font-medium text-sm transition-colors"
          >
            {testing
              ? t('settings.webdavTesting') || '测试中...'
              : t('settings.webdavTestConnection') || '测试连接'}
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium text-sm transition-colors"
          >
            {saving
              ? t('settings.webdavSaving') || '保存中...'
              : t('settings.webdavSave') || '保存配置'}
          </button>
        </div>
      </div>

      {/* 手动同步 */}
      {webdavEffectivelyEnabled && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
          <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">
            {t('settings.syncManualActions') || '手动同步'}
          </h4>
          <div className="flex gap-3">
            <button
              onClick={handleManualExport}
              disabled={syncing}
              className="flex-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg font-medium transition-colors text-sm"
            >
              {syncing
                ? t('settings.syncing') || '同步中...'
                : t('settings.syncExportNow') || '立即备份到 WebDAV'}
            </button>
            <button
              onClick={handleManualImport}
              disabled={syncing}
              className="flex-1 px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 disabled:opacity-50 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors text-sm"
            >
              {t('settings.syncImportNow') || '从 WebDAV 恢复'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.tone === 'ok'
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : message.tone === 'error'
              ? 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
});
