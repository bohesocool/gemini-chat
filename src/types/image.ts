/**
 * 图片历史记录相关类型定义
 */

import type { ImageAspectRatio, ImageSize } from './models';

/**
 * 生成的图片接口
 * 用于存储 AI 生成的图片历史记录
 */
export interface GeneratedImage {
  /** 图片唯一标识符 */
  id: string;
  /** Base64 编码的图片数据 */
  data: string;
  /** MIME 类型，如 image/png, image/jpeg */
  mimeType: string;
  /** 生成时间戳（毫秒） */
  createdAt: number;
  /** 关联的聊天窗口 ID */
  windowId?: string;
  /** 关联的消息 ID */
  messageId?: string;
  /** 图片描述/生成提示词 */
  prompt?: string;
  /** 图片宽高比 - 需求: 5.4 */
  aspectRatio?: ImageAspectRatio;
  /** 图片分辨率 - 需求: 5.4 */
  imageSize?: ImageSize;
}

/**
 * 图片存储状态接口
 */
export interface ImageState {
  /** 图片列表 */
  images: GeneratedImage[];
  /** 是否正在加载 */
  isLoading: boolean;
}

/**
 * 图片存储操作接口
 */
export interface ImageActions {
  /** 从存储加载所有图片 */
  loadImages: () => Promise<void>;
  /** 添加新图片 */
  addImage: (image: GeneratedImage) => Promise<void>;
  /** 删除图片 */
  deleteImage: (id: string) => Promise<void>;
  /** 根据窗口 ID 获取图片列表 */
  getImagesByWindow: (windowId: string) => GeneratedImage[];
}

/**
 * 生成图片 ID
 */
export function generateImageId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 创建新的 GeneratedImage 对象
 */
export function createGeneratedImage(
  data: string,
  mimeType: string,
  options?: {
    windowId?: string;
    messageId?: string;
    prompt?: string;
    aspectRatio?: ImageAspectRatio;
    imageSize?: ImageSize;
  }
): GeneratedImage {
  return {
    id: generateImageId(),
    data,
    mimeType,
    createdAt: Date.now(),
    windowId: options?.windowId,
    messageId: options?.messageId,
    prompt: options?.prompt,
    aspectRatio: options?.aspectRatio,
    imageSize: options?.imageSize,
  };
}
