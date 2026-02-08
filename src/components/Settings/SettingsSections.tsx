/**
 * 设置分类组件
 * 包含所有设置面板的分类内容组件
 * 
 * Requirements: 3.5, 3.6
 */

import React, { useState, useRef } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { useChatWindowStore } from '../../stores/chatWindow';
import { useModelStore } from '../../stores/model';
import { exportAllData, importData } from '../../services/storage';
import { ModelList } from '../ModelList';
import { ModelEditor } from '../ModelEditor';
import { useTranslation } from '../../i18n/useTranslation';
import { createLogger } from '../../services/logger';
import type { ModelConfig } from '../../types/models';

// 模块日志记录器
const logger = createLogger('Settings');
import {
  HARM_CATEGORIES,
  HARM_BLOCK_THRESHOLDS,
  type HarmCategory,
  type HarmBlockThreshold,
  type SafetySetting,
} from '../../types/gemini';

// ============================================
// API 配置设置
// ============================================

/**
 * 过滤启用的模型
 * 需求: 1.3 - 只显示已启用的模型
 * @param models - 模型配置列表
 * @returns 只包含启用模型的列表
 */
export function filterEnabledModels(models: ModelConfig[]): ModelConfig[] {
  return models.filter(m => m.enabled !== false);
}

export function ApiConfigSection() {
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
}


// ============================================
// 模型选择设置
// ============================================

export function ModelSelectSection() {
  const { t } = useTranslation();
  const { currentModel, setCurrentModel, apiEndpoint, apiKey } = useSettingsStore();
  const {
    models,
    isLoading,
    error,
    fetchModels,
    addModel,
    updateModel,
    deleteModel,
    resetModels,
    clearError,
    getEffectiveConfig,
  } = useModelStore();

  const [editorMode, setEditorMode] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editingModel, setEditingModel] = useState<ModelConfig | undefined>(undefined);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleSelectModel = (model: ModelConfig) => {
    setCurrentModel(model.id);
  };

  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(model);
    setEditorMode('edit');
  };

  const handleDeleteModel = async (modelId: string) => {
    setShowDeleteConfirm(modelId);
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      await deleteModel(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  const handleSaveModel = async (model: ModelConfig) => {
    if (editorMode === 'new') {
      await addModel(model);
    } else {
      await updateModel(model.id, model);
    }
    setEditorMode('closed');
    setEditingModel(undefined);
  };

  const handleFetchModels = async () => {
    if (!apiKey) return;
    // 需求 1.1: 端点为空时使用官方地址
    const { normalizeApiEndpoint } = await import('../../services/gemini');
    const effectiveEndpoint = normalizeApiEndpoint(apiEndpoint);
    await fetchModels(effectiveEndpoint, apiKey);
  };

  const handleResetModels = async () => {
    await resetModels();
    setShowResetConfirm(false);
  };

  const openNewModelEditor = () => {
    setEditingModel(undefined);
    setEditorMode('new');
  };

  const closeEditor = () => {
    setEditorMode('closed');
    setEditingModel(undefined);
  };

  // 获取当前模型配置
  const currentModelConfig = models.find((m) => m.id === currentModel);
  const effectiveConfig = getEffectiveConfig(currentModel);
  const hasRedirect = currentModelConfig?.redirectTo;
  const targetModel = hasRedirect
    ? models.find((m) => m.id === currentModelConfig.redirectTo)
    : null;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.modelManagement')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.modelManagementDesc')}
        </p>
      </div>

      {/* 操作按钮栏 */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleFetchModels}
          disabled={isLoading || !apiKey}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 
            disabled:bg-slate-300 dark:disabled:bg-slate-600
            text-white text-sm rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? <LoadingSpinner className="h-4 w-4" /> : <RefreshIcon className="h-4 w-4" />}
          {t('settings.fetchModels')}
        </button>

        <button
          onClick={openNewModelEditor}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 
            text-white text-sm rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          {t('settings.addCustomModel')}
        </button>

        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-600 
            hover:bg-slate-300 dark:hover:bg-slate-500
            text-slate-700 dark:text-slate-200 text-sm rounded-lg font-medium transition-colors"
        >
          <ResetIcon className="h-4 w-4" />
          {t('settings.resetModels')}
        </button>
      </div>

      {/* API 配置提示 */}
      {!apiKey && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            {t('settings.apiKeyRequired')}
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button onClick={clearError} className="text-red-500 hover:text-red-600 p-1">
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 模型编辑器 */}
      {editorMode !== 'closed' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
            {editorMode === 'new' ? t('settings.addCustomModelTitle') : t('settings.editModel')}
          </h4>
          <ModelEditor
            model={editingModel}
            allModels={models}
            isNew={editorMode === 'new'}
            onSave={handleSaveModel}
            onCancel={closeEditor}
          />
        </div>
      )}

      {/* 模型列表 */}
      {editorMode === 'closed' && (
        <ModelList
          models={models}
          selectedModelId={currentModel}
          onSelectModel={handleSelectModel}
          onEditModel={handleEditModel}
          onDeleteModel={handleDeleteModel}
          onToggleEnabled={async (modelId, enabled) => {
            // 需求: 4.1, 4.5 - 切换模型启用状态
            await updateModel(modelId, { enabled });
          }}
        />
      )}

      {/* 当前模型信息 */}
      <CurrentModelInfo
        currentModel={currentModel}
        currentModelConfig={currentModelConfig}
        effectiveConfig={effectiveConfig}
        hasRedirect={hasRedirect}
        targetModel={targetModel}
      />

      {/* 重置确认对话框 */}
      {showResetConfirm && (
        <ConfirmDialog
          title={t('settings.resetModelConfig')}
          message={t('settings.resetModelConfigConfirm')}
          confirmText={t('common.reset')}
          cancelText={t('common.cancel')}
          onConfirm={handleResetModels}
          onCancel={() => setShowResetConfirm(false)}
          variant="danger"
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title={t('settings.deleteModel')}
          message={t('settings.deleteModelConfirm', { model: showDeleteConfirm })}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// ============================================
// 当前模型信息组件
// ============================================

interface CurrentModelInfoProps {
  currentModel: string;
  currentModelConfig: ModelConfig | undefined;
  effectiveConfig: { thinkingLevel?: string; mediaResolution?: string };
  hasRedirect: string | undefined;
  targetModel: ModelConfig | null | undefined;
}

function CurrentModelInfo({
  currentModel,
  currentModelConfig,
  effectiveConfig,
  hasRedirect,
  targetModel,
}: CurrentModelInfoProps) {
  const { t } = useTranslation();
  
  // 获取翻译后的描述
  const translatedDescription = currentModelConfig?.description?.startsWith('models.')
    ? t(currentModelConfig.description)
    : currentModelConfig?.description;
  
  const getMediaResolutionLabel = (resolution: string): string => {
    const labels: Record<string, string> = {
      MEDIA_RESOLUTION_LOW: t('settings.mediaResolutionLow'),
      MEDIA_RESOLUTION_MEDIUM: t('settings.mediaResolutionMedium'),
      MEDIA_RESOLUTION_HIGH: t('settings.mediaResolutionHigh'),
    };
    return labels[resolution] || resolution;
  };

  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg space-y-3">
      {/* 需求: 2.3 - 显示模型的原始 ID */}
      <div>
        <div className="text-sm text-slate-500 dark:text-slate-400">{t('settings.currentUsingModel')}</div>
        <div className="font-medium text-slate-900 dark:text-slate-100 mt-1 font-mono">
          {currentModel}
        </div>
        {translatedDescription && (
          <div className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {translatedDescription}
          </div>
        )}
      </div>

      {hasRedirect && targetModel && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <ArrowRightIcon className="h-4 w-4" />
            <span>{t('settings.redirectTo')}: <span className="font-mono">{targetModel.id}</span></span>
          </div>
        </div>
      )}

      {(effectiveConfig.thinkingLevel || effectiveConfig.mediaResolution) && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {hasRedirect ? t('settings.advancedParamsFromTarget') : t('settings.advancedParamsConfig')}
          </div>
          <div className="space-y-1">
            {effectiveConfig.thinkingLevel && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{t('settings.thinkingDepth')}:</span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                  {effectiveConfig.thinkingLevel === 'high' ? t('settings.thinkingDepthHigh') : t('settings.thinkingDepthLow')}
                </span>
              </div>
            )}
            {effectiveConfig.mediaResolution && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">{t('settings.mediaResolution')}:</span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                  {getMediaResolutionLabel(effectiveConfig.mediaResolution)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================
// 生成参数设置
// ============================================

export function GenerationConfigSection() {
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
}

// ============================================
// 系统指令设置
// ============================================

export function SystemInstructionSection() {
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
}

// ============================================
// 安全设置
// ============================================

export function SafetySettingsSection() {
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
}

// ============================================
// 数据管理设置
// ============================================

export function DataManagementSection() {
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
}

// ============================================
// 确认对话框组件
// ============================================

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">{title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
              ${variant === 'danger'
                ? 'bg-red-500 hover:bg-red-600'
                : 'bg-blue-500 hover:bg-blue-600'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}


// ============================================
// 图标组件
// ============================================

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 4v5h.582m0 0a8.001 8.001 0 0115.356 2M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}


function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

// ============================================
// 外观设置 (新增)
// ============================================

export function AppearanceSettingsSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.appearance')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.appearanceDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 浅色主题 */}
        <button
          onClick={() => setTheme('light')}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'light'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-100">
              <SunIcon className="w-5 h-5 text-amber-500" />
            </div>
            {theme === 'light' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.lightMode')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.lightModeDesc')}</div>
        </button>

        {/* 深色主题 */}
        <button
          onClick={() => setTheme('dark')}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'dark'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-slate-800 shadow-sm border border-slate-700">
              <MoonIcon className="w-5 h-5 text-slate-200" />
            </div>
            {theme === 'dark' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.darkMode')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.darkModeDesc')}</div>
        </button>

        {/* 雪白主题 (Snow White) */}
        <button
          onClick={() => {
            setTheme('snow-white');
            // 切换回浅色/深色时保留用户的自定义颜色偏好
          }}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'snow-white'
              ? 'border-neutral-900 bg-neutral-50 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg shadow-sm border ${theme === 'snow-white' ? 'bg-white border-neutral-200' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="w-5 h-5 rounded-full bg-neutral-900" />
            </div>
            {theme === 'snow-white' && <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 ring-2 ring-white" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.snowWhite')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.snowWhiteDesc')}</div>
        </button>

        {/* 跟随系统 */}
        <button
          onClick={() => setTheme('system')}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'system'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <ComputerDesktopIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            {theme === 'system' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.followSystem')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.followSystemDesc')}</div>
        </button>

        {/* 自定义颜色 */}
        <CustomColorSelector />
      </div>
    </div>
  );
}

function CustomColorSelector() {
  const { t } = useTranslation();
  const { customThemeColor, setCustomThemeColor } = useSettingsStore();

  return (
    <div className={`
      relative p-4 rounded-xl border-2 transition-all duration-200 text-left
      ${customThemeColor
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
          <div
            className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
            style={{ backgroundColor: customThemeColor || 'transparent', backgroundImage: !customThemeColor ? 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' : 'none' }}
          />
        </div>
        {customThemeColor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCustomThemeColor(''); // 清除
            }}
            className="text-xs text-slate-500 hover:text-red-500 underline z-10"
          >
            {t('settings.resetColor')}
          </button>
        )}
      </div>

      <div className="font-medium text-slate-900 dark:text-slate-100">
        {customThemeColor ? t('settings.customColor') : t('settings.selectColor')}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {customThemeColor ? customThemeColor : t('settings.selectCustomColor')}
      </div>

      <input
        type="color"
        value={customThemeColor || '#22c55e'}
        onChange={(e) => setCustomThemeColor(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
        title={t('settings.selectCustomThemeColor')}
      />
    </div>
  );
}

// Icons
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function ComputerDesktopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
