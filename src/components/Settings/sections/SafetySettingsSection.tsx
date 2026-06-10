/**
 * 安全设置
 *
 * Requirements: 3.5, 3.6
 */

import { memo } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useTranslation } from '../../../i18n/useTranslation';
import {
  HARM_CATEGORIES,
  HARM_BLOCK_THRESHOLDS,
  type HarmCategory,
  type HarmBlockThreshold,
  type SafetySetting,
} from '../../../types/gemini';

export const SafetySettingsSection = memo(function SafetySettingsSection() {
  const { t } = useTranslation();
  const { safetySettings, updateSafetySettings } = useSettingsStore();

  // 使用翻译函数获取标签
  const getHarmCategoryLabel = (category: HarmCategory): string => {
    const labels: Record<HarmCategory, string> = {
      'HARM_CATEGORY_HARASSMENT': t('settings.harmCategoryHarassment'),
      'HARM_CATEGORY_HATE_SPEECH': t('settings.harmCategoryHateSpeech'),
      'HARM_CATEGORY_SEXUALLY_EXPLICIT': t('settings.harmCategorySexuallyExplicit'),
      'HARM_CATEGORY_DANGEROUS_CONTENT': t('settings.harmCategoryDangerousContent'),
    };
    return labels[category];
  };

  const getThresholdLabel = (threshold: HarmBlockThreshold): string => {
    const labels: Record<HarmBlockThreshold, string> = {
      'BLOCK_NONE': t('settings.thresholdBlockNone'),
      'BLOCK_LOW_AND_ABOVE': t('settings.thresholdBlockLowAndAbove'),
      'BLOCK_MEDIUM_AND_ABOVE': t('settings.thresholdBlockMediumAndAbove'),
      'BLOCK_ONLY_HIGH': t('settings.thresholdBlockOnlyHigh'),
    };
    return labels[threshold];
  };

  const getThresholdForCategory = (category: HarmCategory): HarmBlockThreshold | '' => {
    const setting = safetySettings.find(s => s.category === category);
    return setting?.threshold || '';
  };

  const handleThresholdChange = (category: HarmCategory, threshold: HarmBlockThreshold | '') => {
    let newSettings: SafetySetting[];

    if (threshold === '') {
      // 移除该类别的设置
      newSettings = safetySettings.filter(s => s.category !== category);
    } else {
      // 更新或添加设置
      const existingIndex = safetySettings.findIndex(s => s.category === category);
      if (existingIndex >= 0) {
        newSettings = [...safetySettings];
        newSettings[existingIndex] = { category, threshold };
      } else {
        newSettings = [...safetySettings, { category, threshold }];
      }
    }

    updateSafetySettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.safety')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.safetySettingsDesc')}
        </p>
      </div>

      <div className="space-y-4">
        {HARM_CATEGORIES.map((category) => (
          <div key={category} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {getHarmCategoryLabel(category)}
            </label>
            <select
              value={getThresholdForCategory(category)}
              onChange={(e) => handleThresholdChange(category, e.target.value as HarmBlockThreshold | '')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
                bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('settings.thresholdDefault')}</option>
              {HARM_BLOCK_THRESHOLDS.map((threshold) => (
                <option key={threshold} value={threshold}>
                  {getThresholdLabel(threshold)}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>{t('common.note')}：</strong>{t('settings.safetyWarning')}
        </p>
      </div>
    </div>
  );
});
