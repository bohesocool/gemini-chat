/**
 * 设置分类共享工具函数
 */

import type { ModelConfig } from '../../../types/models';

/**
 * 过滤启用的模型
 * 需求: 1.3 - 只显示已启用的模型
 * @param models - 模型配置列表
 * @returns 只包含启用模型的列表
 */
export function filterEnabledModels(models: ModelConfig[]): ModelConfig[] {
  return models.filter(m => m.enabled !== false);
}
