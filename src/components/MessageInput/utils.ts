/**
 * MessageInput 工具函数与常量
 * 从 MessageInput.tsx 拆分而来，保持原有导出不变（用于属性测试）
 */

// 输入框高度限制常量（用于属性测试）
export const INPUT_MIN_ROWS = 1;
export const INPUT_MAX_ROWS = 6;
export const LINE_HEIGHT_PX = 24; // 每行高度（像素）

/**
 * 根据 MIME 类型获取文件扩展名
 * 用于生成粘贴图片的文件名
 *
 * @param mimeType 图片的 MIME 类型
 * @returns 对应的文件扩展名（不含点号）
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExtension: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  // 使用 Object.prototype.hasOwnProperty.call 避免原型链污染问题
  if (Object.prototype.hasOwnProperty.call(mimeToExtension, mimeType)) {
    return mimeToExtension[mimeType]!;
  }
  return 'png';
}

/**
 * 生成粘贴图片的默认文件名
 * 格式: pasted-image-{timestamp}.{extension}
 *
 * Requirements: 4.4
 *
 * @param mimeType 图片的 MIME 类型
 * @param timestamp 可选的时间戳，默认使用当前时间
 * @returns 生成的文件名
 */
export function generatePastedImageFilename(mimeType: string, timestamp?: number): string {
  const ts = timestamp ?? Date.now();
  const extension = getExtensionFromMimeType(mimeType);
  return `pasted-image-${ts}.${extension}`;
}

/**
 * 计算输入框应有的高度
 * 用于属性测试验证
 */
export function calculateInputHeight(content: string): number {
  const lineCount = content.split('\n').length;
  const clampedLines = Math.max(INPUT_MIN_ROWS, Math.min(lineCount, INPUT_MAX_ROWS));
  return clampedLines * LINE_HEIGHT_PX;
}
