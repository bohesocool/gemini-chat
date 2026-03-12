/**
 * 提示词解析器模块
 * 用于从用户输入的图片生成提示词中提取宽高比和分辨率参数
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5
 */

import type { ImageAspectRatio, ImageSize, ImageGenerationConfig } from '../types/models';

/**
 * 支持的宽高比列表
 * Requirements: 1.1, 7.2
 */
export const SUPPORTED_ASPECT_RATIOS = [
  '1:1', '9:16', '16:9', '3:4', '4:3',
  '3:2', '2:3', '5:4', '4:5', '21:9',
  '1:4', '4:1', '1:8', '8:1'
] as const;

/**
 * 支持的分辨率列表
 * Requirements: 2.1
 */
export const SUPPORTED_IMAGE_SIZES = ['512', '1K', '2K', '4K'] as const;

/**
 * 提示词解析结果
 */
export interface PromptParseResult {
  /** 解析出的宽高比，null 表示未找到有效值 */
  aspectRatio: ImageAspectRatio | null;
  /** 解析出的分辨率，null 表示未找到有效值 */
  imageSize: ImageSize | null;
}

/**
 * 分隔符正则表达式
 * 支持中文逗号（，）和英文逗号（,）
 * Requirements: 3.1, 3.2
 */
const DELIMITER_REGEX = /[,，]/;

/**
 * 检查是否为支持的宽高比
 * @param value - 待检查的值
 * @returns 是否为支持的宽高比
 */
function isSupportedAspectRatio(value: string): value is ImageAspectRatio {
  return SUPPORTED_ASPECT_RATIOS.includes(value as ImageAspectRatio);
}

/**
 * 检查是否为支持的分辨率（大小写不敏感）
 * @param value - 待检查的值
 * @returns 标准化后的分辨率或 null
 */
function normalizeImageSize(value: string): ImageSize | null {
  const upperValue = value.toUpperCase();
  if (SUPPORTED_IMAGE_SIZES.includes(upperValue as ImageSize)) {
    return upperValue as ImageSize;
  }
  return null;
}

/**
 * 解析提示词中的图片配置参数
 * 
 * @param prompt - 用户输入的提示词
 * @returns 解析结果，包含宽高比和分辨率
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3
 */
export function parseImagePrompt(prompt: string): PromptParseResult {
  const result: PromptParseResult = {
    aspectRatio: null,
    imageSize: null,
  };

  // 空提示词直接返回
  if (!prompt || prompt.trim() === '') {
    return result;
  }

  // 按分隔符分割提示词
  // Requirements: 3.1, 3.2
  const segments = prompt.split(DELIMITER_REGEX);

  // 遍历每个片段，查找有效参数
  for (const segment of segments) {
    // 去除首尾空白
    // Requirements: 1.4, 3.3
    const trimmed = segment.trim();

    // 如果还没找到宽高比，尝试匹配
    // Requirements: 1.1, 1.2, 1.3
    if (result.aspectRatio === null && isSupportedAspectRatio(trimmed)) {
      result.aspectRatio = trimmed;
    }

    // 如果还没找到分辨率，尝试匹配（大小写不敏感）
    // Requirements: 2.1, 2.2, 2.3, 2.4
    if (result.imageSize === null) {
      const normalizedSize = normalizeImageSize(trimmed);
      if (normalizedSize !== null) {
        result.imageSize = normalizedSize;
      }
    }

    // 如果两个参数都找到了，提前退出
    if (result.aspectRatio !== null && result.imageSize !== null) {
      break;
    }
  }

  return result;
}

/**
 * 合并提示词解析结果和设置配置
 * 
 * @param parseResult - 提示词解析结果
 * @param settingsConfig - 设置面板中的配置
 * @returns 最终生效的图片配置
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5
 */
export function mergeImageConfig(
  parseResult: PromptParseResult,
  settingsConfig: ImageGenerationConfig
): ImageGenerationConfig {
  return {
    // 提示词参数优先，否则使用设置参数
    // Requirements: 4.1, 4.3
    aspectRatio: parseResult.aspectRatio ?? settingsConfig.aspectRatio,
    // Requirements: 4.2, 4.4
    imageSize: parseResult.imageSize ?? settingsConfig.imageSize,
  };
}
