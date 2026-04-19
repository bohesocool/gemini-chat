/**
 * API 图片存储实现
 */

import { api } from './apiClient';
import type { GeneratedImage } from '../types';

export async function loadImages(): Promise<GeneratedImage[]> {
  const records = await api.get<Array<{ id: string; data: unknown; createdAt: number; updatedAt: number }>>('/images');
  return records.map(r => ({
    ...(r.data as GeneratedImage),
    id: r.id,
    createdAt: r.createdAt,
  }));
}

export async function saveImage(image: GeneratedImage): Promise<void> {
  await api.post('/images', {
    id: image.id,
    data: image,
    createdAt: image.createdAt,
    updatedAt: image.createdAt,
  });
}

export async function getImage(id: string): Promise<GeneratedImage | null> {
  try {
    const record = await api.get<{ id: string; data: unknown; createdAt: number }>(`/images/${id}`);
    return { ...(record.data as GeneratedImage), id: record.id, createdAt: record.createdAt };
  } catch {
    return null;
  }
}

export async function deleteImage(id: string): Promise<void> {
  await api.del(`/images/${id}`);
}

export async function getImagesByWindowId(windowId: string): Promise<GeneratedImage[]> {
  const all = await loadImages();
  return all
    .filter(img => img.windowId === windowId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function deleteImages(ids: string[]): Promise<void> {
  await api.post('/images/batch-delete', { ids });
}

export async function clearAllImages(): Promise<void> {
  await api.del('/images');
}
