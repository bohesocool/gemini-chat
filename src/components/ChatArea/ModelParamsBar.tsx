/**
 * 模型参数栏组件
 * 在输入框上方显示模型特定参数的紧凑配置
 * 
 * Requirements: 5.5, 9.3
 */

import { useCallback } from 'react';
import type { ModelAdvancedConfig, ThinkingLevel, ImageGenerationConfig } from '../../types/models';
import { DEFAULT_IMAGE_GENERATION_CONFIG } from '../../types/models';
import { useModelCapabilities, ThinkingLevelSelector, ImageConfigPanel } from '../ModelParams';

// ============ 类型定义 ============

export interface ModelParamsBarProps {
  /** 当前模型 ID */
  modelId: string;
  /** 高级配置 */
  advancedConfig?: ModelAdvancedConfig;
  /** 配置变更回调 */
  onConfigChange: (config: Partial<ModelAdvancedConfig>) => void;
}

// ============ 主组件 ============

/**
 * 模型参数栏
 * 根据模型能力动态显示思考程度或图片参数
 * 使用紧凑模式显示
 * 
 * Requirements:
 * - 5.5: 图片生成模型显示图片参数快捷设置
 * - 9.3: 在输入框上方显示模型特定参数
 */
export function ModelParamsBar({ modelId, advancedConfig, onConfigChange }: ModelParamsBarProps) {
  const capabilities = useModelCapabilities(modelId);

  // 处理思考程度变更
  const handleThinkingLevelChange = useCallback((level: ThinkingLevel) => {
    onConfigChange({ thinkingLevel: level });
  }, [onConfigChange]);

  // 处理图片配置变更
  const handleImageConfigChange = useCallback((imageConfig: Partial<ImageGenerationConfig>) => {
    onConfigChange({
      imageConfig: {
        ...advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG,
        ...imageConfig,
      },
    });
  }, [advancedConfig?.imageConfig, onConfigChange]);

  // 如果模型不支持任何特殊参数，不显示参数栏
  if (!capabilities.supportsThinking && !capabilities.supportsImageGeneration) {
    return null;
  }

  // 获取图片分辨率支持状态 - Requirements: 3.1, 3.4
  const supportsImageSize = capabilities.supportsImageSize !== false;

  return (
    <div className="
      flex items-center justify-between px-4 py-2
      border-t border-neutral-200 dark:border-neutral-700
      bg-neutral-50 dark:bg-neutral-800/50
    ">
      {/* 左侧：参数配置 */}
      <div className="flex items-center gap-4">
        {/* 思考程度选择器 - 紧凑模式 */}
        {capabilities.supportsThinking && (
          <ThinkingLevelSelector
            value={advancedConfig?.thinkingLevel || 'high'}
            onChange={handleThinkingLevelChange}
            variant="compact"
            modelId={modelId}
          />
        )}

        {/* 图片参数配置 - 紧凑模式 */}
        {capabilities.supportsImageGeneration && (
          <ImageConfigPanel
            config={advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG}
            onChange={handleImageConfigChange}
            variant="compact"
            supportsImageSize={supportsImageSize}
          />
        )}
      </div>

      {/* 右侧：提示信息 */}
      <div className="text-xs text-neutral-400 dark:text-neutral-500">
        {capabilities.supportsThinking && '调整思考程度以平衡速度和质量'}
        {capabilities.supportsImageGeneration && '设置图片生成参数'}
      </div>
    </div>
  );
}

export default ModelParamsBar;
