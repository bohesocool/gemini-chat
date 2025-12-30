/**
 * 模型编辑器组件
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 2.1, 2.2, 2.3, 3.1, 4.1, 4.2
 * 
 * 功能：
 * - 模型基本信息编辑（ID、名称、描述）
 * - 重定向目标选择
 * - 高级参数配置（thinking_level、thinking_budget、media_resolution、image_config）
 * - 重定向模型能力继承
 * - 显示名称自动同步
 */

import { useState, useEffect, useMemo } from 'react';
import type { ModelConfig, MediaResolution, ModelCapabilities } from '../types/models';
import { DEFAULT_IMAGE_GENERATION_CONFIG } from '../types/models';
import { getEffectiveCapabilities, detectModelCapabilities } from '../services/model';
import { ThinkingLevelSelector, ThinkingBudgetSlider, ImageConfigPanel } from './ModelParams';

// ============ 类型定义 ============

interface ModelEditorProps {
  /** 要编辑的模型（新建时为 undefined） */
  model?: ModelConfig;
  /** 所有可用模型（用于重定向选择） */
  allModels: ModelConfig[];
  /** 是否为新建模式 */
  isNew?: boolean;
  /** 保存回调 */
  onSave: (model: ModelConfig) => void;
  /** 取消回调 */
  onCancel: () => void;
}

// ============ 常量定义 ============

const MEDIA_RESOLUTIONS: { value: MediaResolution; label: string; description: string }[] = [
  { value: 'MEDIA_RESOLUTION_LOW', label: '低', description: '快速处理，较低质量' },
  { value: 'MEDIA_RESOLUTION_MEDIUM', label: '中', description: '平衡速度和质量' },
  { value: 'MEDIA_RESOLUTION_HIGH', label: '高', description: '高质量处理' },
];

// ============ 主组件 ============

export function ModelEditor({
  model,
  allModels,
  isNew = false,
  onSave,
  onCancel,
}: ModelEditorProps) {
  // 表单状态
  const [formData, setFormData] = useState<ModelConfig>({
    id: '',
    name: '',
    description: '',
    isCustom: true,
    provider: 'gemini',
    capabilities: {},
    advancedConfig: {},
  });

  // 验证错误
  const [errors, setErrors] = useState<Record<string, string>>({});

  // 跟踪显示名称是否被手动编辑 - 需求: 2.2
  const [nameManuallyEdited, setNameManuallyEdited] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (model) {
      setFormData({
        ...model,
        advancedConfig: model.advancedConfig || {},
      });
      // 编辑现有模型时，认为名称已被手动设置
      setNameManuallyEdited(true);
    }
  }, [model]);

  // 模型 ID 变化时自动同步显示名称 - 需求: 2.1
  useEffect(() => {
    if (isNew && !nameManuallyEdited && formData.id) {
      setFormData(prev => ({ ...prev, name: prev.id }));
    }
  }, [formData.id, isNew, nameManuallyEdited]);

  // 获取有效能力（考虑重定向）- 需求: 1.1, 1.7, 1.8
  const effectiveCapabilities: ModelCapabilities = useMemo(() => {
    if (formData.redirectTo) {
      // 有重定向时，使用 getEffectiveCapabilities 获取目标模型的能力
      return getEffectiveCapabilities(formData.redirectTo, allModels);
    }
    // 无重定向时，使用自身能力或根据模型 ID 检测
    return formData.capabilities || detectModelCapabilities(formData.id);
  }, [formData.redirectTo, formData.capabilities, formData.id, allModels]);

  // 根据有效能力决定显示哪些配置选项 - 需求: 1.2, 1.3, 1.4, 1.5, 1.6
  const showThinkingLevel = effectiveCapabilities.thinkingConfigType === 'level';
  const showThinkingBudget = effectiveCapabilities.thinkingConfigType === 'budget';
  const showIncludeThoughts = effectiveCapabilities.supportsThoughtSummary === true;
  const showImageConfig = effectiveCapabilities.supportsImageGeneration === true;
  const showMediaResolution = effectiveCapabilities.supportsMediaResolution === true;
  const supportsImageSize = effectiveCapabilities.supportsImageSize !== false;  // 需求: 3.1, 3.4

  // 是否显示高级参数区域
  const showAdvancedParams = showThinkingLevel || showThinkingBudget || showIncludeThoughts || showImageConfig || showMediaResolution;

  // 更新表单字段
  const updateField = <K extends keyof ModelConfig>(
    field: K,
    value: ModelConfig[K]
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // 清除该字段的错误
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // 更新高级配置
  const updateAdvancedConfig = <K extends keyof NonNullable<ModelConfig['advancedConfig']>>(
    field: K,
    value: NonNullable<ModelConfig['advancedConfig']>[K] | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      advancedConfig: {
        ...prev.advancedConfig,
        [field]: value,
      },
    }));
  };

  // 处理显示名称变化 - 需求: 2.2
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    updateField('name', newName);
    // 标记为手动编辑
    setNameManuallyEdited(true);
  };

  // 处理模型 ID 变化 - 需求: 2.3
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newId = e.target.value;
    updateField('id', newId);
    // 如果 ID 被清空且名称未被手动编辑，清空名称
    if (!newId && !nameManuallyEdited) {
      setFormData(prev => ({ ...prev, name: '' }));
    }
  };

  // 验证表单
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.id.trim()) {
      newErrors.id = '模型 ID 不能为空';
    } else if (isNew && allModels.some(m => m.id === formData.id.trim())) {
      newErrors.id = '模型 ID 已存在';
    }

    if (!formData.name.trim()) {
      newErrors.name = '模型名称不能为空';
    }

    // 检查重定向循环
    if (formData.redirectTo) {
      if (formData.redirectTo === formData.id) {
        newErrors.redirectTo = '不能重定向到自身';
      } else {
        // 检查是否会造成循环
        const visited = new Set<string>();
        let currentId: string | undefined = formData.redirectTo;
        while (currentId) {
          if (currentId === formData.id) {
            newErrors.redirectTo = '检测到循环重定向';
            break;
          }
          if (visited.has(currentId)) {
            break;
          }
          visited.add(currentId);
          const current = allModels.find(m => m.id === currentId);
          currentId = current?.redirectTo;
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // 提交表单
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // 清理空值
      const cleanedData: ModelConfig = {
        ...formData,
        id: formData.id.trim(),
        name: formData.name.trim(),
        description: formData.description?.trim() || '',
        isCustom: isNew ? true : formData.isCustom,
      };

      // 如果没有设置重定向，移除该字段
      if (!cleanedData.redirectTo) {
        delete cleanedData.redirectTo;
      }

      // 清理空的高级配置
      if (cleanedData.advancedConfig) {
        if (!cleanedData.advancedConfig.thinkingLevel) {
          delete cleanedData.advancedConfig.thinkingLevel;
        }
        if (cleanedData.advancedConfig.thinkingBudget === undefined) {
          delete cleanedData.advancedConfig.thinkingBudget;
        }
        if (!cleanedData.advancedConfig.mediaResolution) {
          delete cleanedData.advancedConfig.mediaResolution;
        }
        if (cleanedData.advancedConfig.includeThoughts === undefined) {
          delete cleanedData.advancedConfig.includeThoughts;
        }
        if (!cleanedData.advancedConfig.imageConfig) {
          delete cleanedData.advancedConfig.imageConfig;
        }
        if (Object.keys(cleanedData.advancedConfig).length === 0) {
          delete cleanedData.advancedConfig;
        }
      }

      onSave(cleanedData);
    }
  };

  // 可用于重定向的模型（排除自身）
  const redirectTargets = allModels.filter(m => m.id !== formData.id);

  // 获取重定向目标模型的 ID（用于 ThinkingLevelSelector）
  const effectiveModelId = formData.redirectTo || formData.id;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 基本信息 */}
      <div className="space-y-4">
        <h4 className="font-medium text-slate-900 dark:text-slate-100">基本信息</h4>
        
        {/* 模型 ID */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            模型 ID <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.id}
            onChange={handleIdChange}
            disabled={!isNew}
            placeholder="例如: gemini-custom-model"
            className={`w-full px-3 py-2 rounded-lg border 
              ${errors.id ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:cursor-not-allowed
              text-sm`}
          />
          {errors.id && (
            <p className="mt-1 text-xs text-red-500">{errors.id}</p>
          )}
        </div>

        {/* 模型名称 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            显示名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={handleNameChange}
            placeholder="例如: 自定义 Gemini 模型"
            className={`w-full px-3 py-2 rounded-lg border 
              ${errors.name ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              text-sm`}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-500">{errors.name}</p>
          )}
        </div>

        {/* 模型描述 */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            描述
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="模型的简要描述..."
            rows={2}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              text-sm resize-none"
          />
        </div>
      </div>

      {/* 重定向设置 */}
      <div className="space-y-4">
        <h4 className="font-medium text-slate-900 dark:text-slate-100">重定向设置</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          设置重定向后，此模型将继承目标模型的能力配置
        </p>
        
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            重定向到
          </label>
          <select
            value={formData.redirectTo || ''}
            onChange={(e) => updateField('redirectTo', e.target.value || undefined)}
            className={`w-full px-3 py-2 rounded-lg border 
              ${errors.redirectTo ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'}
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              text-sm`}
          >
            <option value="">不重定向（使用自身配置）</option>
            {redirectTargets.map(m => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.id})
              </option>
            ))}
          </select>
          {errors.redirectTo && (
            <p className="mt-1 text-xs text-red-500">{errors.redirectTo}</p>
          )}
        </div>
      </div>

      {/* 高级参数配置 - 根据有效能力显示 */}
      {showAdvancedParams && (
        <div className="space-y-4">
          <h4 className="font-medium text-slate-900 dark:text-slate-100">
            高级参数
            {formData.redirectTo && (
              <span className="ml-2 text-xs font-normal text-slate-500 dark:text-slate-400">
                (继承自 {formData.redirectTo})
              </span>
            )}
          </h4>
          
          {/* Thinking Level - 需求: 1.2 */}
          {showThinkingLevel && (
            <ThinkingLevelSelector
              value={formData.advancedConfig?.thinkingLevel || 'low'}
              onChange={(level) => updateAdvancedConfig('thinkingLevel', level)}
              modelId={effectiveModelId}
              variant="full"
            />
          )}

          {/* Thinking Budget - 需求: 1.3 */}
          {showThinkingBudget && effectiveCapabilities.thinkingBudgetConfig && (
            <ThinkingBudgetSlider
              value={formData.advancedConfig?.thinkingBudget ?? effectiveCapabilities.thinkingBudgetConfig.defaultValue}
              config={effectiveCapabilities.thinkingBudgetConfig}
              onChange={(budget) => updateAdvancedConfig('thinkingBudget', budget)}
              variant="full"
            />
          )}

          {/* Include Thoughts - 需求: 1.4 */}
          {showIncludeThoughts && (
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                  显示思维链
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  在回复中显示模型的思考过程
                </p>
              </div>
              <button
                type="button"
                onClick={() => updateAdvancedConfig('includeThoughts', !formData.advancedConfig?.includeThoughts)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  ${formData.advancedConfig?.includeThoughts 
                    ? 'bg-blue-500' 
                    : 'bg-slate-300 dark:bg-slate-600'
                  }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${formData.advancedConfig?.includeThoughts ? 'translate-x-6' : 'translate-x-1'}`}
                />
              </button>
            </div>
          )}

          {/* Image Config - 需求: 1.5 */}
          {showImageConfig && (
            <ImageConfigPanel
              config={formData.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG}
              onChange={(config) => updateAdvancedConfig('imageConfig', {
                ...(formData.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG),
                ...config,
              })}
              variant="full"
              supportsImageSize={supportsImageSize}
            />
          )}

          {/* Media Resolution - 需求: 1.6 */}
          {showMediaResolution && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                媒体分辨率 (Media Resolution)
              </label>
              <select
                value={formData.advancedConfig?.mediaResolution || ''}
                onChange={(e) => updateAdvancedConfig(
                  'mediaResolution',
                  e.target.value as MediaResolution || undefined
                )}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600
                  bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                  text-sm"
              >
                <option value="">默认</option>
                {MEDIA_RESOLUTIONS.map(res => (
                  <option key={res.value} value={res.value}>
                    {res.label} - {res.description}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* 重定向提示 */}
      {formData.redirectTo && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            已设置重定向到 "{formData.redirectTo}"，高级参数配置将基于目标模型的能力
          </p>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300
            hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
        >
          取消
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-500 
            hover:bg-blue-600 rounded-lg transition-colors"
        >
          {isNew ? '添加模型' : '保存更改'}
        </button>
      </div>
    </form>
  );
}

export default ModelEditor;
