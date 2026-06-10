/**
 * 数据管理设置
 *
 * Requirements: 3.5, 3.6
 */

import React, { memo, useState, useRef } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useChatWindowStore } from '../../../stores/chatWindow';
import { exportAllData, importData } from '../../../services/storageProxy';
import { useTranslation } from '../../../i18n/useTranslation';
import { createLogger } from '../../../services/logger';
import { DownloadIcon, UploadIcon } from './shared';

// 模块日志记录器
const logger = createLogger('Settings');

export const DataManagementSection = memo(function DataManagementSection() {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const { loadWindows } = useChatWindowStore();
  const { loadSettings } = useSettingsStore();

  // 导出数据
  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('导出失败:', error);
    }
  };

  // 导入数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      // 重新加载数据
      await loadWindows();
      await loadSettings();
      setImportStatus('success');
      setImportMessage(t('settings.importSuccess'));
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : t('settings.importFailed'));
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 3秒后清除状态
    setTimeout(() => {
      setImportStatus('idle');
      setImportMessage('');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.dataManagement')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.dataManagementDesc')}
        </p>
      </div>

      {/* 导出 */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">{t('settings.exportData')}</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t('settings.exportDataDesc')}
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          {t('settings.exportData')}
        </button>
      </div>

      {/* 导入 */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">{t('settings.importData')}</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          {t('settings.importDataDesc')}
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
        >
          <UploadIcon className="h-4 w-4" />
          {t('settings.selectFileToImport')}
        </button>

        {/* 导入状态提示 */}
        {importStatus !== 'idle' && (
          <div className={`mt-4 p-3 rounded-lg ${importStatus === 'success'
            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
            : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
            }`}>
            {importMessage}
          </div>
        )}
      </div>

      {/* 警告 */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>{t('common.note')}：</strong>{t('settings.importWarning')}
        </p>
      </div>
    </div>
  );
});
