/**
 * 生成参数设置
 *
 * Requirements: 3.5, 3.6
 */

import { memo, useState } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useTranslation } from '../../../i18n/useTranslation';

export const GenerationConfigSection = memo(function GenerationConfigSection() {
  const { t } = useTranslation();
  const { generationConfig, updateGenerationConfig, streamingEnabled, setStreamingEnabled } = useSettingsStore();
  const [stopSequencesInput, setStopSequencesInput] = useState(
    generationConfig.stopSequences?.join(', ') || ''
  );

  const handleStopSequencesChange = (value: string) => {
    setStopSequencesInput(value);
    const sequences = value
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    updateGenerationConfig({ stopSequences: sequences.length > 0 ? sequences : undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.generation')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.generationConfigDesc')}
        </p>
      </div>

      {/* 流式输出开关 - Requirements: 10.1, 10.2 */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('settings.streamingOutput')}
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {streamingEnabled
                ? t('settings.streamingEnabled')
                : t('settings.streamingDisabled')}
            </p>
          </div>
          <button
            onClick={() => setStreamingEnabled(!streamingEnabled)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${streamingEnabled
                ? 'bg-primary-500'
                : 'bg-slate-300 dark:bg-slate-600'}
            `}
            role="switch"
            aria-checked={streamingEnabled}
            aria-label={t('settings.streamingOutput')}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm
                ${streamingEnabled ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
        </div>
      </div>

      {/* Temperature 滑块 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('settings.temperature')}
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {generationConfig.temperature ?? 1}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={generationConfig.temperature ?? 1}
          onChange={(e) => updateGenerationConfig({ temperature: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>{t('settings.temperaturePrecise')}</span>
          <span>{t('settings.temperatureBalanced')}</span>
          <span>{t('settings.temperatureCreative')}</span>
        </div>
      </div>

      {/* Top P 滑块 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t('settings.topP')}
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {generationConfig.topP ?? 0.95}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={generationConfig.topP ?? 0.95}
          onChange={(e) => updateGenerationConfig({ topP: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span>
          <span>1</span>
        </div>
      </div>

      {/* Top K 输入框 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.topK')}
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={generationConfig.topK ?? 40}
          onChange={(e) => updateGenerationConfig({ topK: parseInt(e.target.value) || 40 })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.topKHint')}
        </p>
      </div>

      {/* Max Output Tokens 输入框 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.maxOutputTokens')}
        </label>
        <input
          type="number"
          min="1"
          max="8192"
          value={generationConfig.maxOutputTokens ?? ''}
          onChange={(e) => updateGenerationConfig({
            maxOutputTokens: e.target.value ? parseInt(e.target.value) : undefined
          })}
          placeholder={t('settings.maxOutputTokensPlaceholder')}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.maxOutputTokensHint')}
        </p>
      </div>

      {/* Stop Sequences 输入 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.stopSequences')}
        </label>
        <input
          type="text"
          value={stopSequencesInput}
          onChange={(e) => handleStopSequencesChange(e.target.value)}
          placeholder={t('settings.stopSequencesPlaceholder')}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.stopSequencesHint')}
        </p>
      </div>
    </div>
  );
});
