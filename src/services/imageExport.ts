/**
 * 图片导出服务
 * 使用 html-to-image 库将 DOM 元素转换为 PNG 图片
 * 
 * Requirements: 2.1, 4.1, 4.2, 4.3
 */

import { toPng } from 'html-to-image';
import { IMAGE_EXPORT_CONFIG, formatTimestamp, downloadFile } from './export';
import type { ExportMetadata } from './export';

// ============ 类型定义 ============

/** 图片导出选项 */
export interface ImageExportOptions {
  /** 图片宽度（像素） */
  width: number;
  /** 背景色 */
  backgroundColor: string;
  /** 像素比例（用于高清屏） */
  pixelRatio: number;
}

/** 对话导出选项 */
export interface ChatImageExportOptions {
  /** 是否包含时间戳 */
  includeTimestamps: boolean;
  /** 是否包含思维链 */
  includeThoughts: boolean;
  /** 主题 */
  theme: 'light' | 'dark';
}

// ============ 文件名生成 ============

/**
 * 生成导出文件名
 * 文件名格式: {标题}_{导出时间}.png
 * 
 * Requirements: 4.2, 4.3
 * 
 * @param metadata - 导出元数据
 * @returns 生成的文件名（包含 .png 扩展名）
 */
export function generateImageFilename(metadata: ExportMetadata): string {
  // 获取标题，如果为空则使用默认值
  const title = metadata.title?.trim() || '对话记录';
  
  // 格式化时间戳，替换特殊字符
  const timestamp = formatTimestamp(metadata.exportedAt).replace(/[/:]/g, '-');
  
  // 清理标题中的非法文件名字符
  const sanitizedTitle = title.replace(/[<>:"/\\|?*]/g, '_');
  
  return `${sanitizedTitle}_${timestamp}.png`;
}

// ============ DOM 元素导出 ============

/**
 * 将 DOM 元素导出为 PNG 图片
 * 
 * Requirements: 2.1
 * 
 * @param element - 要导出的 DOM 元素
 * @param options - 导出选项
 * @returns PNG 图片的 Blob 对象
 */
export async function exportElementToPng(
  element: HTMLElement,
  options: ImageExportOptions
): Promise<Blob> {
  try {
    // 使用 html-to-image 将 DOM 转换为 PNG data URL
    const dataUrl = await toPng(element, {
      width: options.width,
      height: element.scrollHeight, // 使用实际内容高度
      backgroundColor: options.backgroundColor,
      pixelRatio: options.pixelRatio,
      // 跳过跨域图片，避免导出失败
      skipFonts: false,
      // 确保样式被正确应用
      style: {
        transform: 'none',
        transformOrigin: 'top left',
      },
      // 过滤掉可能导致问题的元素
      filter: (node) => {
        // 跳过 script 和 style 标签
        if (node instanceof HTMLElement) {
          const tagName = node.tagName?.toLowerCase();
          if (tagName === 'script' || tagName === 'noscript') {
            return false;
          }
        }
        return true;
      },
    });
    
    // 将 data URL 转换为 Blob
    const blob = dataUrlToBlob(dataUrl);
    return blob;
  } catch (error) {
    console.error('导出图片失败:', error);
    throw new ImageExportError('图片生成失败，请重试', error);
  }
}

/**
 * 将 data URL 转换为 Blob
 * 
 * @param dataUrl - base64 编码的 data URL
 * @returns Blob 对象
 */
function dataUrlToBlob(dataUrl: string): Blob {
  // 解析 data URL
  const parts = dataUrl.split(',');
  const mimeMatch = parts[0]?.match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const base64Data = parts[1] ?? '';
  
  // 解码 base64
  const byteString = atob(base64Data);
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const uint8Array = new Uint8Array(arrayBuffer);
  
  for (let i = 0; i < byteString.length; i++) {
    uint8Array[i] = byteString.charCodeAt(i);
  }
  
  return new Blob([uint8Array], { type: mime });
}

// ============ 对话导出 ============

/**
 * 导出对话为长图
 * 
 * 该函数需要配合 LongImageRenderer 组件使用：
 * 1. 在 React 中渲染 LongImageRenderer 组件
 * 2. 获取渲染后的 DOM 元素
 * 3. 调用此函数进行导出
 * 
 * Requirements: 2.1, 4.1, 4.2, 4.3
 * 
 * @param element - LongImageRenderer 渲染的 DOM 元素
 * @param metadata - 导出元数据
 * @param options - 导出选项
 */
export async function exportChatToImage(
  element: HTMLElement,
  metadata: ExportMetadata,
  options: ChatImageExportOptions
): Promise<void> {
  // 获取主题配色
  const themeColors = options.theme === 'dark' 
    ? IMAGE_EXPORT_CONFIG.DARK_THEME 
    : IMAGE_EXPORT_CONFIG.LIGHT_THEME;
  
  // 配置导出选项
  const imageOptions: ImageExportOptions = {
    width: IMAGE_EXPORT_CONFIG.WIDTH,
    backgroundColor: themeColors.background,
    pixelRatio: IMAGE_EXPORT_CONFIG.PIXEL_RATIO,
  };
  
  // 导出为 PNG
  const blob = await exportElementToPng(element, imageOptions);
  
  // 生成文件名
  const filename = generateImageFilename(metadata);
  
  // 触发下载 - Requirements: 4.1
  downloadFile(blob, filename, 'image/png');
}

// ============ 错误类型 ============

/**
 * 图片导出错误
 */
export class ImageExportError extends Error {
  /** 原始错误 */
  cause: unknown;
  
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'ImageExportError';
    this.cause = cause;
  }
}

// ============ 辅助函数 ============

/**
 * 检查浏览器是否支持图片导出
 * 
 * @returns 是否支持
 */
export function isImageExportSupported(): boolean {
  // 检查 Canvas 支持
  const canvas = document.createElement('canvas');
  return !!(canvas.getContext && canvas.getContext('2d'));
}

/**
 * 估算导出图片的大小（字节）
 * 用于在导出前给用户提示
 * 
 * @param messageCount - 消息数量
 * @returns 估算的文件大小（字节）
 */
export function estimateImageSize(messageCount: number): number {
  // 粗略估算：每条消息约 50KB（包含 Markdown 渲染后的内容）
  // 基础大小约 100KB（头部、页脚、样式等）
  const baseSize = 100 * 1024;
  const perMessageSize = 50 * 1024;
  return baseSize + messageCount * perMessageSize;
}
