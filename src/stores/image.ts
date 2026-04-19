/**
 * 图片历史记录状态管理
 * 需求: 2.2, 2.7
 */

import { create } from 'zustand';
import type { GeneratedImage, ImageState, ImageActions } from '../types';
import {
  loadImages as loadImagesFromStorage,
  saveImage as saveImageToStorage,
  deleteImage as deleteImageFromStorage,
} from '../services/imageStorageProxy';
import { storeLogger } from '../services/logger';

// ============ Store 类型 ============

export type ImageStore = ImageState & ImageActions;

// ============ Store 创建 ============

/**
 * 创建图片 Store
 */
export const useImageStore = create<ImageStore>((set, get) => ({
  // 初始状态
  images: [],
  isLoading: false,

  // 从存储加载所有图片
  // 需求: 2.2, 2.7
  loadImages: async () => {
    storeLogger.info('开始加载图片历史');
    set({ isLoading: true });
    try {
      const images = await loadImagesFromStorage();
      storeLogger.info('图片历史加载完成', { count: images.length });
      set({
        images,
        isLoading: false,
      });
    } catch (error) {
      storeLogger.error('加载图片历史失败', { 
        error: error instanceof Error ? error.message : '未知错误' 
      });
      set({ isLoading: false });
    }
  },

  // 添加新图片
  // 需求: 2.7
  addImage: async (image: GeneratedImage) => {
    storeLogger.info('添加新图片', { id: image.id });
    try {
      // 先保存到存储
      await saveImageToStorage(image);
      // 更新状态（新图片添加到列表开头）
      set((state) => ({
        images: [image, ...state.images],
      }));
    } catch (error) {
      storeLogger.error('添加图片失败', { 
        error: error instanceof Error ? error.message : '未知错误',
        imageId: image.id,
      });
      throw error;
    }
  },

  // 删除图片
  // 需求: 2.7
  deleteImage: async (id: string) => {
    storeLogger.info('删除图片', { id });
    try {
      // 先从存储删除
      await deleteImageFromStorage(id);
      // 更新状态
      set((state) => ({
        images: state.images.filter((img) => img.id !== id),
      }));
    } catch (error) {
      storeLogger.error('删除图片失败', { 
        error: error instanceof Error ? error.message : '未知错误',
        imageId: id,
      });
      throw error;
    }
  },

  // 根据窗口 ID 获取图片列表
  // 需求: 2.2
  getImagesByWindow: (windowId: string) => {
    const state = get();
    return state.images.filter((img) => img.windowId === windowId);
  },
}));
