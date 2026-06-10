/**
 * 系统指令设置
 *
 * Requirements: 3.5, 3.6
 */

import { memo, useState } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useChatWindowStore } from '../../../stores/chatWindow';
import { useTranslation } from '../../../i18n/useTranslation';

export const SystemInstructionSection = memo(function SystemInstructionSection() {
  const { t } = useTranslation();
  const { systemInstruction, updateSystemInstruction } = useSettingsStore();
  const { activeWindowId, windows, updateWindowConfig } = useChatWindowStore();

  const currentWindow = windows.find(w => w.id === activeWindowId);
  const [windowInstruction, setWindowInstruction] = useState(
    currentWindow?.config.systemInstruction || ''
  );

  const handleWindowInstructionSave = () => {
    if (activeWindowId) {
      updateWindowConfig(activeWindowId, { systemInstruction: windowInstruction || undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.systemInstruction')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.systemInstructionDesc')}
        </p>
      </div>

      {/* 全局系统指令 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.globalSystemInstructionLabel')}
        </label>
        <textarea
          value={systemInstruction}
          onChange={(e) => updateSystemInstruction(e.target.value)}
          placeholder={t('settings.systemInstructionPlaceholder')}
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.globalSystemInstructionHint')}
        </p>
      </div>

      {/* 当前聊天窗口系统指令 */}
      {currentWindow && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            {t('settings.windowSystemInstruction')}
            <span className="ml-2 text-xs text-slate-400 font-normal">
              {t('settings.windowSystemInstructionNote')}
            </span>
          </label>
          <textarea
            value={windowInstruction}
            onChange={(e) => setWindowInstruction(e.target.value)}
            placeholder={t('settings.windowSystemInstructionPlaceholder')}
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('settings.windowSystemInstructionHint')}
            </p>
            <button
              onClick={handleWindowInstructionSave}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
});
