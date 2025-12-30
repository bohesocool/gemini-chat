/**
 * 聊天配置面板组件
 * 毛玻璃效果的配置面板，包含模型选择、参数调整和思考程度选择器
 * 
 * Requirements: 6.4, 6.5, 9.1, 9.2, 9.3, 9.4
 */

import { useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { ChatWindowConfig } from '../../types/chatWindow';
import type { ModelConfig, ThinkingLevel, ImageGenerationConfig } from '../../types/models';
import { DEFAULT_IMAGE_GENERATION_CONFIG } from '../../types/models';
import { useModelStore } from '../../stores/model';
import { useSettingsStore } from '../../stores/settings';
import { getEnabledModels } from '../../services/model';
import { useModelCapabilities, ThinkingLevelSelector, ThinkingBudgetSlider, ImageConfigPanel, MediaResolutionSelector } from '../ModelParams';
import type { MediaResolution } from '../../types/models';
import { useReducedMotion } from '../motion';
import { durationValues, easings } from '../../design/tokens';
import type { ModelAdvancedConfig } from '../../types/models';

// ============ 类型定义 ============

export interface ChatConfigPanelProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 当前配置 */
  config: ChatWindowConfig;
  /** 配置变更回调 */
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
      <select
        value={currentModel}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full px-3 py-2 rounded-lg
          border border-neutral-300 dark:border-neutral-600
          bg-white/80 dark:bg-neutral-800/80
          text-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          text-sm backdrop-blur-sm
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

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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
          bg-white/80 dark:bg-neutral-800/80
          text-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          text-sm resize-none backdrop-blur-sm
        "
      />
    </div>
  );
}

// ============ 主组件 ============

/**
 * 聊天配置面板
 * 毛玻璃效果的模态配置面板
 * 
 * Requirements:
 * - 6.4: 设置按钮点击打开毛玻璃配置面板
 * - 6.5: 配置面板包含模型选择、参数调整等所有配置选项
 * - 9.1: 当前模型为 Gemini 3 Pro 系列时显示思考程度选择器
 * - 9.2: 当前模型不支持思考功能时隐藏思考程度选择器
 * - 9.3: 模型能力检测基于 supportsThinking 属性
 * - 9.4: 切换到不支持思考的模型时思考程度选择器立即隐藏
 */
export function ChatConfigPanel({
  isOpen,
  onClose,
  config,
  onConfigChange,
}: ChatConfigPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  const { models } = useModelStore();
  const capabilities = useModelCapabilities(config.model);

  // 点击外部关闭面板
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
      document.body.style.overflow = 'hidden';
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscKey);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, onClose]);

  // 处理模型变更
  const handleModelChange = useCallback((modelId: string) => {
    onConfigChange({ model: modelId });
  }, [onConfigChange]);

  // 处理参数变更
  const handleGenerationConfigChange = useCallback((key: string, value: number) => {
    onConfigChange({
      generationConfig: {
        ...config.generationConfig,
        [key]: value,
      },
    });
  }, [config.generationConfig, onConfigChange]);

  // 处理系统指令变更
  const handleSystemInstructionChange = useCallback((value: string) => {
    onConfigChange({ systemInstruction: value });
  }, [onConfigChange]);

  // 处理思考程度变更 - Requirements: 9.1, 9.4
  const handleThinkingLevelChange = useCallback((level: ThinkingLevel) => {
    onConfigChange({
      advancedConfig: {
        ...config.advancedConfig,
        thinkingLevel: level,
      },
    });
  }, [config.advancedConfig, onConfigChange]);

  // 处理思考预算变更 - Requirements: 3.1, 3.2, 3.3
  const handleThinkingBudgetChange = useCallback((budget: number) => {
    onConfigChange({
      advancedConfig: {
        ...config.advancedConfig,
        thinkingBudget: budget,
      },
    });
  }, [config.advancedConfig, onConfigChange]);

  // 处理高级配置变更
  const handleAdvancedConfigChange = useCallback((updates: Partial<ModelAdvancedConfig>) => {
    onConfigChange({
      advancedConfig: {
        ...config.advancedConfig,
        ...updates,
      },
    });
  }, [config.advancedConfig, onConfigChange]);

  // 获取思考配置类型 - Requirements: 2.1, 2.2, 3.1
  const thinkingConfigType = capabilities.thinkingConfigType || 'none';
  const thinkingBudgetConfig = capabilities.thinkingBudgetConfig;

  // 获取当前思考预算（使用模型默认值）
  const currentThinkingBudget = config.advancedConfig?.thinkingBudget ?? 
    (thinkingBudgetConfig?.defaultValue ?? -1);

  // 获取思维链支持状态 - Requirements: 4.1, 5.2, 5.3
  const supportsThoughtSummary = capabilities.supportsThoughtSummary === true;
  const includeThoughts = config.advancedConfig?.includeThoughts ?? false;

  // 获取媒体分辨率支持状态 - Requirements: 4.1, 4.8
  const supportsMediaResolution = capabilities.supportsMediaResolution === true;
  const currentMediaResolution = config.advancedConfig?.mediaResolution;

  // 获取图片分辨率支持状态 - Requirements: 3.1, 3.4
  const supportsImageSize = capabilities.supportsImageSize !== false;

  // 处理图片配置变更
  const handleImageConfigChange = useCallback((imageConfig: Partial<ImageGenerationConfig>) => {
    onConfigChange({
      advancedConfig: {
        ...config.advancedConfig,
        imageConfig: {
          ...config.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG,
          ...imageConfig,
        },
      },
    });
  }, [config.advancedConfig, onConfigChange]);

  // 处理媒体分辨率变更 - Requirements: 4.1, 4.4, 4.5, 4.6, 4.7
  const handleMediaResolutionChange = useCallback((resolution: MediaResolution | undefined) => {
    onConfigChange({
      advancedConfig: {
        ...config.advancedConfig,
        mediaResolution: resolution,
      },
    });
  }, [config.advancedConfig, onConfigChange]);

  if (!isOpen) return null;

  const duration = reducedMotion ? 0 : durationValues.normal;

  const panelContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(4px)',
        transition: `opacity ${duration}ms ${easings.easeOut}`,
      }}
    >
      <div
        ref={panelRef}
        className="
          w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto
          rounded-2xl shadow-2xl
          bg-white/90 dark:bg-neutral-900/90
          border border-neutral-200/50 dark:border-neutral-700/50
        "
        style={{
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          transition: `transform ${duration}ms ${easings.easeOut}, opacity ${duration}ms ${easings.easeOut}`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="配置面板"
      >
        {/* 头部 */}
        <div className="
          flex items-center justify-between px-6 py-4
          border-b border-neutral-200/50 dark:border-neutral-700/50
        ">
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            配置
          </h2>
          <button
            onClick={onClose}
            className="
              p-2 rounded-lg
              hover:bg-neutral-100/80 dark:hover:bg-neutral-800/80
              text-neutral-500 dark:text-neutral-400
              transition-colors
            "
            aria-label="关闭"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* 内容 */}
        <div className="px-6 py-4 space-y-6">
          {/* 模型选择 - 需求: 4.2 只显示启用的模型 */}
          <ModelSelector
            currentModel={config.model}
            models={getEnabledModels(models)}
            onChange={handleModelChange}
          />

          {/* 思考配置 - Requirements: 2.1, 2.2, 3.1, 3.2, 3.3 */}
          {thinkingConfigType === 'level' && (
            <ThinkingLevelSelector
              value={config.advancedConfig?.thinkingLevel || 'high'}
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
                onClick={() => handleAdvancedConfigChange({ includeThoughts: !includeThoughts })}
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

          {/* 流式响应开关 - Requirements: 1.2, 1.5 */}
          <StreamingToggle
            value={config.streamingEnabled}
            onChange={(enabled) => onConfigChange({ streamingEnabled: enabled })}
          />

          {/* 图片参数配置 - Requirements: 3.4 */}
          {capabilities.supportsImageGeneration && (
            <ImageConfigPanel
              config={config.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG}
              onChange={handleImageConfigChange}
              variant="full"
              supportsImageSize={supportsImageSize}
            />
          )}

          {/* 媒体分辨率配置 - Requirements: 4.1, 4.3, 4.4, 4.5, 4.6, 4.7 */}
          {supportsMediaResolution && (
            <MediaResolutionSelector
              value={currentMediaResolution}
              onChange={handleMediaResolutionChange}
              variant="full"
            />
          )}

          {/* 参数调整区域 */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
              生成参数
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <ParameterSlider
                label="Temperature"
                value={config.generationConfig.temperature ?? 1}
                min={0}
                max={2}
                step={0.1}
                onChange={(v) => handleGenerationConfigChange('temperature', v)}
                description="控制输出的随机性"
              />
              <ParameterSlider
                label="Top P"
                value={config.generationConfig.topP ?? 0.95}
                min={0}
                max={1}
                step={0.05}
                onChange={(v) => handleGenerationConfigChange('topP', v)}
                description="核采样概率阈值"
              />
              <ParameterSlider
                label="Top K"
                value={config.generationConfig.topK ?? 40}
                min={1}
                max={100}
                step={1}
                onChange={(v) => handleGenerationConfigChange('topK', v)}
                description="候选词数量"
              />
              <ParameterSlider
                label="最大输出长度"
                value={config.generationConfig.maxOutputTokens ?? capabilities.maxOutputTokens ?? 8192}
                min={256}
                max={capabilities.maxOutputTokens ?? 8192}
                step={256}
                onChange={(v) => handleGenerationConfigChange('maxOutputTokens', v)}
                formatValue={(v) => `${v} tokens`}
                description="限制回复长度"
              />
            </div>
          </div>

          {/* 系统指令 */}
          <SystemInstructionEditor
            value={config.systemInstruction || ''}
            onChange={handleSystemInstructionChange}
          />
        </div>
      </div>
    </div>
  );

  return createPortal(panelContent, document.body);
}

// ============ 子组件：流式响应开关 ============

interface StreamingToggleProps {
  /** 当前值（undefined 表示使用全局设置） */
  value: boolean | undefined;
  /** 变更回调 */
  onChange: (enabled: boolean | undefined) => void;
}

/**
 * 流式响应开关组件
 * 支持三态：启用、禁用、使用全局设置
 * Requirements: 1.2, 1.5
 */
function StreamingToggle({ value, onChange }: StreamingToggleProps) {
  // 获取全局流式设置
  const globalStreamingEnabled = useSettingsStore((state) => state.streamingEnabled);
  
  // 获取当前状态的显示文本
  const getStatusText = () => {
    if (value === undefined) {
      return `使用全局设置 (${globalStreamingEnabled ? '开' : '关'})`;
    }
    return value ? '启用' : '禁用';
  };

  // 循环切换状态：undefined -> true -> false -> undefined
  const handleToggle = () => {
    if (value === undefined) {
      onChange(true);
    } else if (value === true) {
      onChange(false);
    } else {
      onChange(undefined);
    }
  };

  // 获取开关的背景颜色
  const getToggleColor = () => {
    if (value === undefined) return 'bg-neutral-400 dark:bg-neutral-500';
    return value ? 'bg-primary-500' : 'bg-neutral-300 dark:bg-neutral-600';
  };

  // 获取开关的位置
  const getTogglePosition = () => {
    if (value === undefined) return 'translate-x-3.5';
    return value ? 'translate-x-6' : 'translate-x-1';
  };

  return (
    <div className="flex items-center justify-between">
      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          流式响应
        </label>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {getStatusText()}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value === true}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          ${getToggleColor()}
        `}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white transition-transform
            ${getTogglePosition()}
          `}
        />
      </button>
    </div>
  );
}

// ============ 图标组件 ============

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default ChatConfigPanel;
