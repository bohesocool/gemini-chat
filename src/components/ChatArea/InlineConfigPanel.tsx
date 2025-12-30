/**
 * 内联配置面板组件
 * 在聊天窗口内直接访问和修改该窗口的配置
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 10.5, 2.1, 2.2, 3.1, 3.2, 3.3, 1.1, 1.2, 1.7, 1.8
 */

import { useState, useEffect, useRef } from 'react';
import type { ChatWindowConfig } from '../../types/chatWindow';
import type { ModelConfig, ThinkingLevel, ModelAdvancedConfig } from '../../types/models';
import { useModelStore } from '../../stores/model';
import { getEnabledModels } from '../../services/model';
import { useReducedMotion } from '../motion';
import { durationValues, easings, touchTargets } from '../../design/tokens';
import { ThinkingLevelSelector } from '../ModelParams/ThinkingLevelSelector';
import { ThinkingBudgetSlider } from '../ModelParams/ThinkingBudgetSlider';
import { ImageConfigPanel } from '../ModelParams/ImageConfigPanel';
import { MediaResolutionSelector } from '../ModelParams/MediaResolutionSelector';
import { useModelCapabilities } from '../ModelParams';
import type { ImageGenerationConfig, MediaResolution } from '../../types/models';
import { DEFAULT_IMAGE_GENERATION_CONFIG } from '../../types/models';

// ============ 类型定义 ============

export interface InlineConfigPanelProps {
  /** 聊天窗口 ID */
  windowId: string;
  /** 当前窗口配置 */
  config: ChatWindowConfig;
  /** 是否展开 */
  isExpanded: boolean;
  /** 切换展开状态回调 */
  onToggle: () => void;
  /** 配置更新回调 */
  onConfigChange: (config: Partial<ChatWindowConfig>) => void;
}

// ============ 子组件：模型选择器 ============

interface ModelSelectorProps {
  currentModel: string;
  models: ModelConfig[];
  onChange: (modelId: string) => void;
}

function ModelSelector({ currentModel, models, onChange }: ModelSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        模型
      </label>
      {/* 需求 2.1: 使用模型的原始 ID 作为主要显示名称 */}
      <select
        value={currentModel}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full px-3 py-2 rounded-lg
          border border-neutral-300 dark:border-neutral-600
          bg-white dark:bg-neutral-800
          text-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          text-sm font-mono
        "
      >
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id}
          </option>
        ))}
      </select>
    </div>
  );
}

// ============ 子组件：参数滑块 ============

interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  description?: string;
  formatValue?: (value: number) => string;
}

function ParameterSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  description,
  formatValue = (v) => v.toString(),
}: ParameterSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
        <span className="text-sm text-neutral-500 dark:text-neutral-400">
          {formatValue(value)}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="
          w-full h-2 rounded-lg appearance-none cursor-pointer
          bg-neutral-200 dark:bg-neutral-700
          accent-primary-500
        "
      />
      {description && (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </p>
      )}
    </div>
  );
}

// ============ 子组件：系统指令编辑器 ============

interface SystemInstructionEditorProps {
  value: string;
  onChange: (value: string) => void;
}

function SystemInstructionEditor({ value, onChange }: SystemInstructionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [value]);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        系统指令
      </label>
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="设置 AI 的角色和行为方式..."
        rows={2}
        className="
          w-full px-3 py-2 rounded-lg
          border border-neutral-300 dark:border-neutral-600
          bg-white dark:bg-neutral-800
          text-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          text-sm resize-none
        "
      />
      <p className="text-xs text-neutral-500 dark:text-neutral-400">
        系统指令会在每次对话时发送给 AI
      </p>
    </div>
  );
}

// ============ 主组件 ============

/**
 * 内联配置面板
 * 
 * Requirements:
 * - 6.1: 显示当前模型名称
 * - 6.2: 展开/收起动画
 * - 6.3: 模型选择下拉框
 * - 6.4: 常用参数快捷调整
 * - 6.5: 系统指令编辑区域
 * - 6.6: 配置修改实时保存
 */
export function InlineConfigPanel({
  windowId,
  config,
  isExpanded,
  onToggle,
  onConfigChange,
}: InlineConfigPanelProps) {
  const reducedMotion = useReducedMotion();
  const { models } = useModelStore();
  const panelRef = useRef<HTMLDivElement>(null);
  const [panelHeight, setPanelHeight] = useState(0);

  // 获取当前模型名称
  // 需求 2.1: 使用模型的原始 ID 作为主要显示名称
  const modelName = config.model;

  // 计算面板高度用于动画
  useEffect(() => {
    if (panelRef.current && isExpanded) {
      setPanelHeight(panelRef.current.scrollHeight);
    }
  }, [isExpanded, config]);

  // 处理模型变更
  const handleModelChange = (modelId: string) => {
    onConfigChange({ model: modelId });
  };

  // 处理参数变更
  const handleGenerationConfigChange = (key: string, value: number) => {
    onConfigChange({
      generationConfig: {
        ...config.generationConfig,
        [key]: value,
      },
    });
  };

  // 处理系统指令变更
  const handleSystemInstructionChange = (value: string) => {
    onConfigChange({ systemInstruction: value });
  };

  // 处理高级配置变更
  const handleAdvancedConfigChange = (updates: Partial<ModelAdvancedConfig>) => {
    onConfigChange({
      advancedConfig: {
        ...config.advancedConfig,
        ...updates,
      },
    });
  };

  // 处理思考等级变更 - Requirements: 2.1, 2.4
  const handleThinkingLevelChange = (level: ThinkingLevel) => {
    handleAdvancedConfigChange({ thinkingLevel: level });
  };

  // 处理思考预算变更 - Requirements: 3.1, 3.2, 3.3
  const handleThinkingBudgetChange = (budget: number) => {
    handleAdvancedConfigChange({ thinkingBudget: budget });
  };

  // 处理思维链开关变更 - Requirements: 4.1, 5.2, 5.3
  const handleIncludeThoughtsChange = (enabled: boolean) => {
    handleAdvancedConfigChange({ includeThoughts: enabled });
  };

  // 处理图片配置变更 - Requirements: 1.5
  const handleImageConfigChange = (imageConfig: Partial<ImageGenerationConfig>) => {
    handleAdvancedConfigChange({
      imageConfig: {
        ...config.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG,
        ...imageConfig,
      },
    });
  };

  // 处理媒体分辨率变更 - Requirements: 4.2, 4.4, 4.5, 4.6, 4.7
  const handleMediaResolutionChange = (resolution: MediaResolution | undefined) => {
    handleAdvancedConfigChange({ mediaResolution: resolution });
  };

  // 获取当前模型的能力配置（处理重定向） - Requirements: 2.1, 2.2, 3.1, 1.1, 1.2, 1.7, 1.8
  const modelCapabilities = useModelCapabilities(config.model);
  const thinkingConfigType = modelCapabilities.thinkingConfigType || 'none';
  const thinkingBudgetConfig = modelCapabilities.thinkingBudgetConfig;

  // 获取当前思考等级（默认为 'high'） - Requirements: 2.3
  const currentThinkingLevel: ThinkingLevel = config.advancedConfig?.thinkingLevel || 'high';

  // 获取当前思考预算（使用模型默认值）
  const currentThinkingBudget = config.advancedConfig?.thinkingBudget ?? 
    (thinkingBudgetConfig?.defaultValue ?? -1);

  // 获取思维链支持状态 - Requirements: 4.1, 5.2, 5.3
  const supportsThoughtSummary = modelCapabilities.supportsThoughtSummary === true;
  const includeThoughts = config.advancedConfig?.includeThoughts ?? false;

  // 获取媒体分辨率支持状态 - Requirements: 4.2, 4.8
  const supportsMediaResolution = modelCapabilities.supportsMediaResolution === true;
  const currentMediaResolution = config.advancedConfig?.mediaResolution;

  // 获取图片分辨率支持状态 - Requirements: 3.1, 3.4
  const supportsImageSize = modelCapabilities.supportsImageSize !== false;

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.normal}ms ${easings.easeOut}` };

  return (
    <div className="border-b border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      {/* 头部：模型名称和展开按钮 */}
      <button
        onClick={onToggle}
        className="
          w-full flex items-center justify-between px-4 py-3 touch-manipulation
          hover:bg-neutral-50 dark:hover:bg-neutral-800/50
        "
        style={{ ...transitionStyle, minHeight: touchTargets.minimum }}
        aria-expanded={isExpanded}
        aria-controls={`config-panel-${windowId}`}
      >
        <div className="flex items-center gap-2">
          {/* 模型图标 */}
          <div className="
            w-8 h-8 rounded-lg flex items-center justify-center
            bg-primary-100 dark:bg-primary-900/30
            text-primary-600 dark:text-primary-400
          ">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
              />
            </svg>
          </div>
          
          {/* 模型名称 */}
          <div className="text-left">
            <div className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {modelName}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              点击配置模型和参数
            </div>
          </div>
        </div>

        {/* 展开/收起图标 */}
        <div
          className="text-neutral-400 dark:text-neutral-500"
          style={{
            ...transitionStyle,
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* 配置面板内容 */}
      <div
        id={`config-panel-${windowId}`}
        style={{
          ...transitionStyle,
          height: isExpanded ? panelHeight : 0,
          opacity: isExpanded ? 1 : 0,
          overflow: 'hidden',
        }}
      >
        <div ref={panelRef} className="px-4 pb-4 space-y-4">
          {/* 模型选择 - 需求: 4.2 只显示启用的模型 */}
          <ModelSelector
            currentModel={config.model}
            models={getEnabledModels(models)}
            onChange={handleModelChange}
          />

          {/* 参数调整区域 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Temperature */}
            <ParameterSlider
              label="Temperature"
              value={config.generationConfig.temperature ?? 1}
              min={0}
              max={2}
              step={0.1}
              onChange={(v) => handleGenerationConfigChange('temperature', v)}
              description="控制输出的随机性"
            />

            {/* Top P */}
            <ParameterSlider
              label="Top P"
              value={config.generationConfig.topP ?? 0.95}
              min={0}
              max={1}
              step={0.05}
              onChange={(v) => handleGenerationConfigChange('topP', v)}
              description="核采样概率阈值"
            />

            {/* Top K */}
            <ParameterSlider
              label="Top K"
              value={config.generationConfig.topK ?? 40}
              min={1}
              max={100}
              step={1}
              onChange={(v) => handleGenerationConfigChange('topK', v)}
              description="候选词数量"
            />

            {/* Max Output Tokens - Requirements: 2.10 */}
            <ParameterSlider
              label="最大输出长度"
              value={config.generationConfig.maxOutputTokens ?? modelCapabilities.maxOutputTokens ?? 8192}
              min={256}
              max={modelCapabilities.maxOutputTokens ?? 8192}
              step={256}
              onChange={(v) => handleGenerationConfigChange('maxOutputTokens', v)}
              formatValue={(v) => `${v} tokens`}
              description="限制回复长度"
            />
          </div>

          {/* 思考配置 - Requirements: 2.1, 2.2, 3.1, 3.2, 3.3 */}
          {thinkingConfigType === 'level' && (
            <ThinkingLevelSelector
              value={currentThinkingLevel}
              onChange={handleThinkingLevelChange}
              variant="full"
              modelId={config.model}
            />
          )}
          {thinkingConfigType === 'budget' && thinkingBudgetConfig && (
            <ThinkingBudgetSlider
              value={currentThinkingBudget}
              config={thinkingBudgetConfig}
              onChange={handleThinkingBudgetChange}
              variant="full"
            />
          )}

          {/* 思维链显示开关 - Requirements: 4.1, 5.2, 5.3 */}
          {supportsThoughtSummary && (
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  显示思维链
                </label>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  显示模型的推理过程
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={includeThoughts}
                onClick={() => handleIncludeThoughtsChange(!includeThoughts)}
                className={`
                  relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
                  ${includeThoughts 
                    ? 'bg-primary-500' 
                    : 'bg-neutral-300 dark:bg-neutral-600'
                  }
                `}
              >
                <span
                  className={`
                    inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    ${includeThoughts ? 'translate-x-6' : 'translate-x-1'}
                  `}
                />
              </button>
            </div>
          )}

          {/* 图片生成配置 - Requirements: 1.5, 1.6, 3.4 */}
          {modelCapabilities.supportsImageGeneration && (
            <ImageConfigPanel
              config={config.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG}
              onChange={handleImageConfigChange}
              variant="full"
              supportsImageSize={supportsImageSize}
            />
          )}

          {/* 媒体分辨率配置 - Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7 */}
          {supportsMediaResolution && (
            <MediaResolutionSelector
              value={currentMediaResolution}
              onChange={handleMediaResolutionChange}
              variant="full"
            />
          )}

          {/* 系统指令 */}
          <SystemInstructionEditor
            value={config.systemInstruction || ''}
            onChange={handleSystemInstructionChange}
          />
        </div>
      </div>
    </div>
  );
}

export default InlineConfigPanel;
