/**
 * API 配置设置
 *
 * Requirements: 3.5, 3.6
 */

import { memo, useState } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useModelStore } from '../../../stores/model';
import { useTranslation } from '../../../i18n/useTranslation';
import { filterEnabledModels } from './utils';
import { CheckIcon, XIcon } from './shared';

export const ApiConfigSection = memo(function ApiConfigSection() {
  const { t } = useTranslation();
  const {
    apiEndpoint,
    apiKey,
    setApiEndpoint,
    setApiKey,
    testConnection,
    connectionStatus,
    connectionError,
  } = useSettingsStore();

  const { models } = useModelStore();

  // 需求: 1.2 - 默认选中 "gemini-2.5-flash" 模型
  const [selectedTestModel, setSelectedTestModel] = useState('gemini-2.5-flash');
  // 存储测试结果中的模型名称
  const [testedModelName, setTestedModelName] = useState<string | null>(null);

  // 需求: 1.3 - 只显示已启用的模型
  const enabledModels = filterEnabledModels(models);

  const handleTestConnection = async () => {
    // 获取选中模型的显示名称
    const selectedModel = models.find(m => m.id === selectedTestModel);
    const modelName = selectedModel?.name || selectedTestModel;
    setTestedModelName(modelName);
    // 需求: 1.4 - 使用选中的模型发送测试请求
    await testConnection(selectedTestModel);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.apiConfig')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.apiConfigDesc')}
        </p>
      </div>

      {/* API 端点 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.apiEndpointLabel')}
        </label>
        <input
          type="url"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://x666.me"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.apiEndpointHint')}
        </p>
      </div>

      {/* API 密钥 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {t('settings.apiKey')}
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={t('settings.apiKeyPlaceholder')}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {t('settings.apiKeyHint')}
        </p>
      </div>

      {/* 测试连接区域 - 需求: 1.1 */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          {/* 需求: 1.1 - 模型选择下拉框 */}
          {/* 需求: 2.4 - 使用模型的原始 ID */}
          <select
            value={selectedTestModel}
            onChange={(e) => setSelectedTestModel(e.target.value)}
            className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              text-sm min-w-[180px] font-mono"
          >
            {enabledModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.id}
              </option>
            ))}
          </select>

          {/* 测试连接按钮 - 需求: 1.5 允许端点为空时测试 */}
          <button
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing' || !apiKey}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600
              text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed whitespace-nowrap"
          >
            {connectionStatus === 'testing' ? t('settings.testing') : t('settings.testConnection')}
          </button>
        </div>

        {/* 需求: 1.5, 1.6 - 测试结果显示 */}
        {connectionStatus === 'success' && testedModelName && (
          <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <CheckIcon className="h-4 w-4" />
            {t('settings.connectionSuccess', { model: testedModelName })}
          </span>
        )}
        {connectionStatus === 'error' && testedModelName && (
          <span className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <XIcon className="h-4 w-4" />
            {t('settings.connectionFailed', { model: testedModelName, error: connectionError || t('common.unknownError') })}
          </span>
        )}
      </div>
    </div>
  );
});
