/**
 * 模型选择设置
 *
 * Requirements: 3.5, 3.6
 */

import { memo, useState } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useModelStore } from '../../../stores/model';
import { ModelList } from '../../ModelList';
import { ModelEditor } from '../../ModelEditor';
import { useTranslation } from '../../../i18n/useTranslation';
import type { ModelConfig } from '../../../types/models';
import {
  ConfirmDialog,
  CloseIcon,
  RefreshIcon,
  PlusIcon,
  ResetIcon,
  LoadingSpinner,
  ArrowRightIcon,
} from './shared';

export const ModelSelectSection = memo(function ModelSelectSection() {
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
    const { normalizeApiEndpoint } = await import('../../../services/gemini');
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
});

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
