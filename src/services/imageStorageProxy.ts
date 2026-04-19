/**
 * 图片存储代理 - 根据模式切换 IndexedDB / API
 */

import { isApiMode } from './storageAdapter';
import type { GeneratedImage } from '../types';

import * as idb from './imageStorage';
import * as apiStore from './apiImageStorage';

export async function loadImages(): Promise<GeneratedImage[]> {
  return isApiMode() ? apiStore.loadImages() : idb.loadImages();
}

export async function saveImage(image: GeneratedImage): Promise<void> {
  return isApiMode() ? apiStore.saveImage(image) : idb.saveImage(image);
}

export async function getImage(id: string): Promise<GeneratedImage | null> {
  return isApiMode() ? apiStore.getImage(id) : idb.getImage(id);
}

export async function deleteImage(id: string): Promise<void> {
  return isApiMode() ? apiStore.deleteImage(id) : idb.deleteImage(id);
}

export async function getImagesByWindowId(windowId: string): Promise<GeneratedImage[]> {
  return isApiMode() ? apiStore.getImagesByWindowId(windowId) : idb.getImagesByWindowId(windowId);
}

export async function deleteImages(ids: string[]): Promise<void> {
  return isApiMode() ? apiStore.deleteImages(ids) : idb.deleteImages(ids);
}

export async function clearAllImages(): Promise<void> {
  return isApiMode() ? apiStore.clearAllImages() : idb.clearAllImages();
}

export { closeImageDB, deleteImageDatabase } from './imageStorage';
