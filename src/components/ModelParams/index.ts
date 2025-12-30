/**
 * 模型参数组件导出
 * Requirements: 3.1, 3.2, 3.3, 1.1, 1.2, 1.7, 1.8
 */

import { useMemo } from 'react';
import { MODEL_CAPABILITIES } from '../../types/models';
import type { ModelCapabilities } from '../../types/models';
import { useModelStore } from '../../stores/model';

// 导出组件
export { ThinkingLevelSelector } from './ThinkingLevelSelector';
export type { ThinkingLevelSelectorProps } from './ThinkingLevelSelector';

export { ThinkingBudgetSlider } from './ThinkingBudgetSlider';
export type { ThinkingBudgetSliderProps } from './ThinkingBudgetSlider';

export { ImageConfigPanel } from './ImageConfigPanel';
export type { ImageConfigPanelProps } from './ImageConfigPanel';

export { MediaResolutionSelector } from './MediaResolutionSelector';
export type { MediaResolutionSelectorProps } from './MediaResolutionSelector';

/**
 * useModelCapabilities Hook
 * 根据模型 ID 获取模型能力配置（处理重定向）
 * 
 * 功能说明：
 * - 如果模型设置了 redirectTo，返回目标模型的能力
 * - 支持重定向链（A -> B -> C），最终返回 C 的能力
 * - 如果没有重定向，返回模型自身的能力
 * 
 * @param modelId 模型 ID
 * @returns 模型能力配置
 * 
 * Requirements: 3.1, 3.2, 3.3, 1.1, 1.2, 1.7, 1.8
 */
export function useModelCapabilities(modelId: string): ModelCapabilities {
  // 使用 store 的 getEffectiveCapabilities 方法来处理重定向
  const getEffectiveCapabilities = useModelStore((state) => state.getEffectiveCapabilities);
  
  return useMemo(() => {
    return getEffectiveCapabilities(modelId);
  }, [modelId, getEffectiveCapabilities]);
}

/**
 * 检查模型是否支持思考程度配置
 * @param modelId 模型 ID
 * @returns 是否支持思考程度
 */
export function supportsThinking(modelId: string): boolean {
  const capabilities = MODEL_CAPABILITIES[modelId];
  return capabilities?.supportsThinking === true;
}

/**
 * 检查模型是否支持图片生成
 * @param modelId 模型 ID
 * @returns 是否支持图片生成
 */
export function supportsImageGeneration(modelId: string): boolean {
  const capabilities = MODEL_CAPABILITIES[modelId];
  return capabilities?.supportsImageGeneration === true;
}

/**
 * 获取模型支持的参数类型列表
 * @param modelId 模型 ID
 * @returns 支持的参数类型数组
 */
export function getSupportedParams(modelId: string): string[] {
  const capabilities = MODEL_CAPABILITIES[modelId];
  const params: string[] = [];
  
  if (capabilities?.supportsThinking) {
    params.push('thinkingLevel');
  }
  if (capabilities?.supportsImageGeneration) {
    params.push('imageConfig');
  }
  if (capabilities?.supportsMediaResolution) {
    params.push('mediaResolution');
  }
  
  return params;
}
