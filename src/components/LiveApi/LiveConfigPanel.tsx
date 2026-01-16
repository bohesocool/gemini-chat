/**
 * Live API 配置面板组件
 * 需求: 7.1-7.7
 * 
 * 实现响应模态选择、语音选择、系统指令输入、思考预算滑块、
 * 情感对话开关、主动音频开关、转录开关、VAD 灵敏度设置
 */

import React, { useCallback, useMemo } from 'react';
import type { LiveSessionConfig, ResponseModality, VadSensitivity } from '../../types/liveApi';
import { AVAILABLE_VOICES, LIVE_API_MODELS } from '../../constants/liveApi';

/**
 * 配置面板属性
 */
export interface LiveConfigPanelProps {
  /** 当前配置 */
  config: LiveSessionConfig;
  /** 配置变更回调 */
  onConfigChange: (config: Partial<LiveSessionConfig>) => void;
  /** 是否禁用（会话进行中时禁用） */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * Live API 配置面板组件
 */
export function LiveConfigPanel({
  config,
  onConfigChange,
  disabled = false,
  className = '',
}: LiveConfigPanelProps): JSX.Element {
  // 获取当前选中模型的信息
  const currentModel = useMemo(() => {
    return LIVE_API_MODELS.find((m) => m.id === config.model) || LIVE_API_MODELS[0];
  }, [config.model]);

  // 处理模型变更
  const handleModelChange = useCallback((modelId: string) => {
    const model = LIVE_API_MODELS.find((m) => m.id === modelId);
    onConfigChange({ 
      model: modelId,
      // 如果新模型不支持思考，重置思考预算
      thinkingBudget: model?.supportsThinking ? config.thinkingBudget : 0,
    });
  }, [config.thinkingBudget, onConfigChange]);

  // 处理响应模态变更 - 需求: 7.1
  const handleModalityChange = useCallback((modality: ResponseModality) => {
    onConfigChange({ responseModality: modality });
  }, [onConfigChange]);

  // 处理语音变更 - 需求: 7.2
  const handleVoiceChange = useCallback((voiceName: string) => {
    onConfigChange({ voiceName });
  }, [onConfigChange]);

  // 处理系统指令变更 - 需求: 7.3
  const handleSystemInstructionChange = useCallback((systemInstruction: string) => {
    onConfigChange({ systemInstruction });
  }, [onConfigChange]);

  // 处理思考预算变更 - 需求: 7.4
  const handleThinkingBudgetChange = useCallback((thinkingBudget: number) => {
    onConfigChange({ thinkingBudget });
  }, [onConfigChange]);

  // 处理情感对话开关 - 需求: 7.5
  const handleAffectiveDialogChange = useCallback((enabled: boolean) => {
    onConfigChange({ enableAffectiveDialog: enabled });
  }, [onConfigChange]);

  // 处理主动音频开关 - 需求: 7.6
  const handleProactiveAudioChange = useCallback((enabled: boolean) => {
    onConfigChange({ enableProactiveAudio: enabled });
  }, [onConfigChange]);

  // 处理转录开关 - 需求: 7.7
  const handleInputTranscriptionChange = useCallback((enabled: boolean) => {
    onConfigChange({ enableInputTranscription: enabled });
  }, [onConfigChange]);

  const handleOutputTranscriptionChange = useCallback((enabled: boolean) => {
    onConfigChange({ enableOutputTranscription: enabled });
  }, [onConfigChange]);

  // 处理 VAD 配置变更
  const handleVadEnabledChange = useCallback((enabled: boolean) => {
    onConfigChange({ 
      vadConfig: { ...config.vadConfig, enabled } 
    });
  }, [config.vadConfig, onConfigChange]);

  const handleStartSensitivityChange = useCallback((sensitivity: VadSensitivity) => {
    onConfigChange({ 
      vadConfig: { ...config.vadConfig, startSensitivity: sensitivity } 
    });
  }, [config.vadConfig, onConfigChange]);

  const handleEndSensitivityChange = useCallback((sensitivity: VadSensitivity) => {
    onConfigChange({ 
      vadConfig: { ...config.vadConfig, endSensitivity: sensitivity } 
    });
  }, [config.vadConfig, onConfigChange]);

  const handleSilenceDurationChange = useCallback((duration: number) => {
    onConfigChange({ 
      vadConfig: { ...config.vadConfig, silenceDurationMs: duration } 
    });
  }, [config.vadConfig, onConfigChange]);

  return (
    <div className={`flex flex-col gap-4 p-4 ${className}`}>
      {/* 禁用提示 */}
      {disabled && (
        <div className="px-3 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-xs text-yellow-600 dark:text-yellow-400">
            会话进行中，配置不可修改
          </p>
        </div>
      )}

      {/* 模型选择 */}
      <ConfigSection title="模型">
        <select
          value={config.model}
          onChange={(e) => handleModelChange(e.target.value)}
          disabled={disabled}
          className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {LIVE_API_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name}
            </option>
          ))}
        </select>
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
          {currentModel?.description}
        </p>
      </ConfigSection>

      {/* 响应模态选择 - 需求: 7.1 */}
      <ConfigSection title="响应模态">
        <div className="flex gap-2">
          <ModalityButton
            label="音频"
            icon={<AudioIcon />}
            isActive={config.responseModality === 'AUDIO'}
            onClick={() => handleModalityChange('AUDIO')}
            disabled={disabled}
          />
          <ModalityButton
            label="文本"
            icon={<TextIcon />}
            isActive={config.responseModality === 'TEXT'}
            onClick={() => handleModalityChange('TEXT')}
            disabled={disabled}
          />
        </div>
      </ConfigSection>

      {/* 语音选择 - 需求: 7.2 */}
      {config.responseModality === 'AUDIO' && (
        <ConfigSection title="语音">
          <select
            value={config.voiceName}
            onChange={(e) => handleVoiceChange(e.target.value)}
            disabled={disabled}
            className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {AVAILABLE_VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name} - {voice.description}
              </option>
            ))}
          </select>
        </ConfigSection>
      )}

      {/* 思考预算 - 需求: 7.4 */}
      {currentModel?.supportsThinking && (
        <ConfigSection title="思考预算">
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="24576"
              step="1024"
              value={config.thinkingBudget}
              onChange={(e) => handleThinkingBudgetChange(parseInt(e.target.value))}
              disabled={disabled}
              className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-3
                [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary-500
                [&::-webkit-slider-thumb]:cursor-pointer
              "
            />
            <span className="text-sm text-neutral-600 dark:text-neutral-400 w-16 text-right">
              {config.thinkingBudget === 0 ? '关闭' : `${config.thinkingBudget}`}
            </span>
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            控制模型思考时使用的 token 数量，0 表示关闭思考能力
          </p>
        </ConfigSection>
      )}

      {/* 系统指令 - 需求: 7.3 */}
      <ConfigSection title="系统指令">
        <textarea
          value={config.systemInstruction}
          onChange={(e) => handleSystemInstructionChange(e.target.value)}
          disabled={disabled}
          placeholder="输入系统指令，定义 AI 的行为和角色..."
          rows={3}
          className="w-full px-3 py-2 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </ConfigSection>

      {/* 高级选项 */}
      <ConfigSection title="高级选项">
        <div className="flex flex-col gap-3">
          {/* 情感对话 - 需求: 7.5 */}
          <ToggleSwitch
            label="情感对话"
            description="模型根据输入的表达和语调调整响应风格"
            checked={config.enableAffectiveDialog}
            onChange={handleAffectiveDialogChange}
            disabled={disabled}
          />

          {/* 主动音频 - 需求: 7.6 */}
          <ToggleSwitch
            label="主动音频"
            description="模型智能决定何时响应输入"
            checked={config.enableProactiveAudio}
            onChange={handleProactiveAudioChange}
            disabled={disabled}
          />
        </div>
      </ConfigSection>

      {/* 转录选项 - 需求: 7.7 */}
      <ConfigSection title="转录">
        <div className="flex flex-col gap-3">
          <ToggleSwitch
            label="输入转录"
            description="显示用户语音的文本转录"
            checked={config.enableInputTranscription}
            onChange={handleInputTranscriptionChange}
            disabled={disabled}
          />
          <ToggleSwitch
            label="输出转录"
            description="显示 AI 回复的文本转录"
            checked={config.enableOutputTranscription}
            onChange={handleOutputTranscriptionChange}
            disabled={disabled}
          />
        </div>
      </ConfigSection>

      {/* VAD 配置 */}
      <ConfigSection title="语音检测 (VAD)">
        <div className="flex flex-col gap-3">
          <ToggleSwitch
            label="自动语音检测"
            description="自动检测用户开始和结束说话"
            checked={config.vadConfig.enabled}
            onChange={handleVadEnabledChange}
            disabled={disabled}
          />
          
          {config.vadConfig.enabled && (
            <>
              {/* 开始说话灵敏度 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                  开始说话灵敏度
                </label>
                <div className="flex gap-2">
                  <SensitivityButton
                    label="低"
                    isActive={config.vadConfig.startSensitivity === 'low'}
                    onClick={() => handleStartSensitivityChange('low')}
                    disabled={disabled}
                  />
                  <SensitivityButton
                    label="高"
                    isActive={config.vadConfig.startSensitivity === 'high'}
                    onClick={() => handleStartSensitivityChange('high')}
                    disabled={disabled}
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  高灵敏度更容易检测到说话开始
                </p>
              </div>

              {/* 结束说话灵敏度 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                  结束说话灵敏度
                </label>
                <div className="flex gap-2">
                  <SensitivityButton
                    label="低"
                    isActive={config.vadConfig.endSensitivity === 'low'}
                    onClick={() => handleEndSensitivityChange('low')}
                    disabled={disabled}
                  />
                  <SensitivityButton
                    label="高"
                    isActive={config.vadConfig.endSensitivity === 'high'}
                    onClick={() => handleEndSensitivityChange('high')}
                    disabled={disabled}
                  />
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  高灵敏度更容易检测到说话结束
                </p>
              </div>

              {/* 静音持续时间 */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-neutral-600 dark:text-neutral-400">
                  静音持续时间: {config.vadConfig.silenceDurationMs}ms
                </label>
                <input
                  type="range"
                  min="100"
                  max="2000"
                  step="100"
                  value={config.vadConfig.silenceDurationMs}
                  onChange={(e) => handleSilenceDurationChange(parseInt(e.target.value))}
                  disabled={disabled}
                  className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:w-3
                    [&::-webkit-slider-thumb]:h-3
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-primary-500
                    [&::-webkit-slider-thumb]:cursor-pointer
                  "
                />
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  检测到静音后等待多久判定说话结束
                </p>
              </div>
            </>
          )}
        </div>
      </ConfigSection>
    </div>
  );
}

/**
 * 配置区块属性
 */
interface ConfigSectionProps {
  title: string;
  children: React.ReactNode;
}

/**
 * 配置区块组件
 */
function ConfigSection({ title, children }: ConfigSectionProps): JSX.Element {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
        {title}
      </h3>
      {children}
    </div>
  );
}

/**
 * 模态按钮属性
 */
interface ModalityButtonProps {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 模态选择按钮组件
 */
function ModalityButton({ label, icon, isActive, onClick, disabled }: ModalityButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border transition-colors
        ${isActive 
          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-600 dark:text-primary-400' 
          : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      <span className="w-4 h-4">{icon}</span>
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

/**
 * 灵敏度按钮属性
 */
interface SensitivityButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  disabled?: boolean;
}

/**
 * 灵敏度选择按钮组件
 */
function SensitivityButton({ label, isActive, onClick, disabled }: SensitivityButtonProps): JSX.Element {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex-1 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors
        ${isActive 
          ? 'bg-primary-50 dark:bg-primary-900/30 border-primary-500 text-primary-600 dark:text-primary-400' 
          : 'bg-white dark:bg-neutral-800 border-neutral-300 dark:border-neutral-600 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-700'
        }
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
    >
      {label}
    </button>
  );
}

/**
 * 开关属性
 */
interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

/**
 * 开关组件
 */
function ToggleSwitch({ label, description, checked, onChange, disabled }: ToggleSwitchProps): JSX.Element {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <div className="relative flex-shrink-0 mt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only peer"
        />
        <div className={`
          w-9 h-5 rounded-full transition-colors
          ${checked 
            ? 'bg-primary-500' 
            : 'bg-neutral-300 dark:bg-neutral-600'
          }
        `} />
        <div className={`
          absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform
          ${checked ? 'translate-x-4' : 'translate-x-0'}
        `} />
      </div>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </span>
        {description && (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
            {description}
          </span>
        )}
      </div>
    </label>
  );
}

// ============ 图标组件 ============

function AudioIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function TextIcon() {
  return (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

export default LiveConfigPanel;
