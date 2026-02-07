/**
 * 图片库工具函数
 * 需求: 4.2, 4.3, 4.4
 */

import type { GeneratedImage } from '../types';
import { getTranslation } from '../i18n';

// ============ 日期格式化函数 ============

/**
 * 获取日期键（用于分组排序）
 * 返回格式: YYYY-MM-DD
 * 需求: 4.2
 * @param timestamp 时间戳（毫秒）
 * @returns 日期键字符串
 */
export function getDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * 格式化图片日期为易读格式
 * 支持"今天"、"昨天"、具体日期格式
 * 需求: 4.2
 * @param timestamp 时间戳（毫秒）
 * @returns 格式化后的日期字符串
 */
export function formatImageDate(timestamp: number): string {
  const now = new Date();
  const date = new Date(timestamp);

  // 获取今天和昨天的日期键
  const todayKey = getDateKey(now.getTime());
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayKey = getDateKey(yesterdayDate.getTime());

  const dateKey = getDateKey(timestamp);

  if (dateKey === todayKey) {
    return getTranslation('dateFormat.today');
  }

  if (dateKey === yesterdayKey) {
    return getTranslation('dateFormat.yesterday');
  }

  // 返回具体日期格式: X月X日
  const month = date.getMonth() + 1;
  const day = date.getDate();

  // 如果不是今年，显示年份
  if (date.getFullYear() !== now.getFullYear()) {
    return getTranslation('dateFormat.fullDate', {
      year: date.getFullYear(),
      month,
      day
    });
  }

  return getTranslation('dateFormat.shortDate', { month, day });
}

// ============ 图片排序函数 ============

/**
 * 按创建时间降序排列图片（最新在前）
 * 需求: 4.3
 * @param images 图片列表
 * @returns 排序后的图片列表（新数组）
 */
export function sortImagesByDate(images: GeneratedImage[]): GeneratedImage[] {
  return [...images].sort((a, b) => b.createdAt - a.createdAt);
}

// ============ 图片分组函数 ============

/**
 * 图片分组接口
 */
export interface ImageGroup {
  /** 显示用的日期文本（如"今天"、"昨天"、"12月15日"） */
  date: string;
  /** 排序用的日期键（如"2024-12-17"） */
  dateKey: string;
  /** 该日期下的图片列表 */
  images: GeneratedImage[];
}

/**
 * 按日期分组图片
 * 需求: 4.4
 * @param images 图片列表
 * @returns 按日期分组的图片列表，组内按时间降序排列
 */
export function groupImagesByDate(images: GeneratedImage[]): ImageGroup[] {
  // 先按日期排序
  const sortedImages = sortImagesByDate(images);

  // 使用 Map 保持插入顺序
  const groupMap = new Map<string, GeneratedImage[]>();

  for (const image of sortedImages) {
    const dateKey = getDateKey(image.createdAt);
    const existing = groupMap.get(dateKey);
    if (existing) {
      existing.push(image);
    } else {
      groupMap.set(dateKey, [image]);
    }
  }

  // 转换为 ImageGroup 数组
  const groups: ImageGroup[] = [];
  for (const [dateKey, groupImages] of groupMap) {
    // 使用组内第一张图片的时间戳来格式化日期
    const firstImage = groupImages[0];
    if (firstImage) {
      const date = formatImageDate(firstImage.createdAt);
      groups.push({
        date,
        dateKey,
        images: groupImages,
      });
    }
  }

  return groups;
}
