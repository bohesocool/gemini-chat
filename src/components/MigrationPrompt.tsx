/**
 * 数据迁移提示对话框
 * 当首次启用数据库模式时，提示用户是否将本地 IndexedDB 数据迁移到服务端
 */

import { useState, useEffect } from 'react';
import {
  shouldPromptMigration,
  hasLocalData,
  performMigrationToServer,
  markMigrationDone,
} from '../services/dataMigration';

export function MigrationPrompt() {
  const [visible, setVisible] = useState(false);
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    if (!shouldPromptMigration()) return;
    hasLocalData().then(has => {
      if (has) setVisible(true);
      else markMigrationDone();
    });
  }, []);

  if (!visible) return null;

  const handleMigrate = async () => {
    setMigrating(true);
    try {
      const res = await performMigrationToServer();
      if (res.success) {
        const parts = Object.entries(res.counts)
          .filter(([, v]) => v > 0)
          .map(([k, v]) => `${k}: ${v}`);
        setResult({
          success: true,
          message: `迁移成功！${parts.length > 0 ? `(${parts.join(', ')})` : ''}`,
        });
        setTimeout(() => setVisible(false), 2000);
      } else {
        setResult({ success: false, message: '迁移失败，请稍后重试' });
      }
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : '迁移失败',
      });
    } finally {
      setMigrating(false);
    }
  };

  const handleSkip = () => {
    markMigrationDone();
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 max-w-md mx-4 w-full">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            数据迁移
          </h3>
        </div>

        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
          检测到本地浏览器中存有聊天数据。当前已启用服务端数据库模式，是否将本地数据迁移到数据库？
        </p>

        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          迁移后，数据将存储在服务端数据库中，支持多设备共享。本地数据不会被删除。
        </p>

        {result && (
          <div className={`mb-4 p-3 rounded-lg text-sm ${
            result.success
              ? 'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
              : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {result.message}
          </div>
        )}

        <div className="flex gap-3 justify-end">
          <button
            onClick={handleSkip}
            disabled={migrating}
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            跳过
          </button>
          <button
            onClick={handleMigrate}
            disabled={migrating}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg transition-colors"
          >
            {migrating ? '迁移中...' : '开始迁移'}
          </button>
        </div>
      </div>
    </div>
  );
}
