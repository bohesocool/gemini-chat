/**
 * VirtualMessageList 辅助函数
 * 用于属性测试验证消息图片渲染逻辑
 * 
 * **Feature: image-generation-display, Property 3: 消息图片渲染正确性**
 * **Validates: Requirements 2.2, 2.3, 3.1, 3.2**
 */

import type { GeneratedImage } from '../../types/models';

/**
 * 判断是否应该渲染图片网格
 * 需求 2.2: 消息包含生成图片时应显示图片
 * 需求 2.3: 多张图片时显示网格布局
 * 
 * @param images 图片数组
 * @returns 是否应该渲染图片网格
 */
export function shouldRenderImageGrid(images: GeneratedImage[] | undefined): boolean {
  return !!images && images.length > 0;
}

/**
 * 判断是否应该渲染文本内容
 * 需求 3.1: 只有图片没有文本时不显示空文本气泡
 * 
 * @param content 文本内容
 * @returns 是否应该渲染文本内容
 */
export function shouldRenderTextContent(content: string): boolean {
  return content.trim().length > 0;
}

/**
 * 判断是否应该渲染消息气泡
 * 需求 2.2, 3.1, 3.2: 有内容（文本或图片）时显示气泡
 * 
 * @param content 文本内容
 * @param images 图片数组
 * @param isRegenerating 是否正在重新生成
 * @returns 是否应该渲染消息气泡
 */
export function shouldRenderMessageBubble(
  content: string,
  images: GeneratedImage[] | undefined,
  isRegenerating: boolean
): boolean {
  const hasContent = shouldRenderTextContent(content) || shouldRenderImageGrid(images);
  // 重新生成时即使没有内容也显示气泡（显示加载指示器）
  return hasContent || isRegenerating;
}

/**
 * 获取要显示的图片
 * 需求 5.1: 流式响应时显示流式图片
 * 
 * @param isRegenerating 是否正在重新生成
 * @param regeneratingImages 重新生成中的流式图片
 * @param originalImages 原始消息图片
 * @returns 要显示的图片数组
 */
export function getDisplayImages(
  isRegenerating: boolean,
  regeneratingImages: GeneratedImage[],
  originalImages: GeneratedImage[] | undefined
): GeneratedImage[] {
  return isRegenerating ? regeneratingImages : (originalImages || []);
}

/**
 * 计算图片网格的列数
 * 需求 2.3: 根据图片数量自适应网格布局
 * 
 * @param imageCount 图片数量
 * @returns 网格列数
 */
export function calculateGridColumns(imageCount: number): number {
  if (imageCount === 0) return 0;
  if (imageCount === 1) return 1;
  return 2; // 2张及以上使用2列
}

/**
 * 验证消息渲染的完整性
 * 用于属性测试验证
 * 
 * @param content 文本内容
 * @param images 图片数组
 * @param isRegenerating 是否正在重新生成
 * @returns 渲染验证结果
 */
export interface RenderValidationResult {
  shouldShowBubble: boolean;
  shouldShowImages: boolean;
  shouldShowText: boolean;
  imageCount: number;
}

export function validateMessageRendering(
  content: string,
  images: GeneratedImage[] | undefined,
  isRegenerating: boolean
): RenderValidationResult {
  const shouldShowBubble = shouldRenderMessageBubble(content, images, isRegenerating);
  const shouldShowImages = shouldRenderImageGrid(images);
  const shouldShowText = shouldRenderTextContent(content);
  const imageCount = images?.length || 0;

  return {
    shouldShowBubble,
    shouldShowImages,
    shouldShowText,
    imageCount,
  };
}
