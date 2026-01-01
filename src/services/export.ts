/**
 * 对话导出服务
 * 支持 Markdown、PDF 和长图格式导出
 * 
 * Requirements: 1.3, 1.4, 1.5, 2.1
 */

import type { Message } from '../types';

// 重新导出图片导出服务的相关函数和类型
export {
  exportChatToImage,
  exportElementToPng,
  generateImageFilename,
  isImageExportSupported,
  estimateImageSize,
  ImageExportError,
  type ImageExportOptions,
  type ChatImageExportOptions,
} from './imageExport';

// ============ 类型定义 ============

/** 导出格式 */
export type ExportFormat = 'markdown' | 'image';

/** 图片导出配置常量 */
export const IMAGE_EXPORT_CONFIG = {
  /** 图片宽度（像素） */
  WIDTH: 800,
  /** 内边距（像素） */
  PADDING: 24,
  /** 消息间距（像素） */
  MESSAGE_GAP: 16,
  /** 像素比例（用于高清屏） */
  PIXEL_RATIO: 2,
  /** 浅色主题配色 */
  LIGHT_THEME: {
    background: '#ffffff',
    headerBackground: '#f5f5f5',
    userMessageBackground: '#e3f2fd',
    aiMessageBackground: '#f5f5f5',
    textColor: '#1a1a1a',
    secondaryTextColor: '#666666',
    borderColor: '#e0e0e0',
  },
  /** 深色主题配色 */
  DARK_THEME: {
    background: '#1a1a1a',
    headerBackground: '#262626',
    userMessageBackground: '#1e3a5f',
    aiMessageBackground: '#262626',
    textColor: '#ffffff',
    secondaryTextColor: '#a0a0a0',
    borderColor: '#404040',
  },
} as const;

/** 导出选项 */
export interface ExportOptions {
  /** 导出格式 */
  format: ExportFormat;
  /** 是否包含时间戳 */
  includeTimestamps: boolean;
  /** 是否包含思维链（thinking） */
  includeThoughts: boolean;
}

/** 导出元数据 */
export interface ExportMetadata {
  /** 窗口标题 */
  title: string;
  /** 模型名称 */
  modelName: string;
  /** 导出时间戳 */
  exportedAt: number;
}

// ============ 辅助函数 ============

/**
 * 格式化时间戳为可读字符串
 * @param timestamp - Unix 时间戳（毫秒）
 * @returns 格式化的时间字符串
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 获取角色显示名称
 * @param role - 消息角色
 * @returns 中文角色名称
 */
export function getRoleLabel(role: 'user' | 'model'): string {
  return role === 'user' ? '用户' : 'AI';
}

/**
 * 提取消息文本内容
 * @param message - 消息对象
 * @param includeThoughts - 是否包含思维链
 * @returns 消息文本
 */
export function extractMessageText(message: Message, includeThoughts: boolean): string {
  const parts: string[] = [];
  
  // 添加思维链内容
  if (includeThoughts && message.thoughtSummary) {
    parts.push(`> 💭 思考过程:\n> ${message.thoughtSummary.split('\n').join('\n> ')}`);
  }
  
  // 添加主要内容
  if (message.content) {
    parts.push(message.content);
  }
  
  // 添加用户附件图片
  if (message.attachments && message.attachments.length > 0) {
    const imageAttachments = message.attachments.filter(att => att.type === 'image');
    if (imageAttachments.length > 0) {
      parts.push('\n**附件图片:**');
      imageAttachments.forEach((att, index) => {
        parts.push(`![${att.name || `附件图片 ${index + 1}`}](data:${att.mimeType};base64,${att.data})`);
      });
    }
  }
  
  // 添加 AI 生成的图片
  if (message.generatedImages && message.generatedImages.length > 0) {
    parts.push('\n**生成的图片:**');
    message.generatedImages.forEach((img, index) => {
      parts.push(`![生成的图片 ${index + 1}](data:${img.mimeType};base64,${img.data})`);
    });
  }
  
  return parts.join('\n\n');
}

// ============ Markdown 导出 ============

/**
 * 将消息列表导出为 Markdown 格式
 * 
 * Requirements:
 * - 1.3: 生成格式化的 Markdown 内容
 * - 1.5: 包含标题、模型、时间戳、消息列表
 * 
 * @param messages - 消息列表
 * @param metadata - 导出元数据
 * @param options - 导出选项
 * @returns Markdown 字符串
 */
export function exportToMarkdown(
  messages: Message[],
  metadata: ExportMetadata,
  options: Omit<ExportOptions, 'format'>
): string {
  const lines: string[] = [];
  
  // 添加标题
  lines.push(`# ${metadata.title || '对话记录'}`);
  lines.push('');
  
  // 添加元数据
  lines.push('## 对话信息');
  lines.push('');
  lines.push(`- **模型**: ${metadata.modelName || '未知'}`);
  lines.push(`- **导出时间**: ${formatTimestamp(metadata.exportedAt)}`);
  lines.push(`- **消息数量**: ${messages.length}`);
  lines.push('');
  
  // 添加分隔线
  lines.push('---');
  lines.push('');
  
  // 添加消息内容
  lines.push('## 对话内容');
  lines.push('');
  
  for (const message of messages) {
    // 角色标签
    const roleLabel = getRoleLabel(message.role);
    const roleEmoji = message.role === 'user' ? '👤' : '🤖';
    
    // 时间戳（可选）
    const timestampStr = options.includeTimestamps && message.timestamp
      ? ` (${formatTimestamp(message.timestamp)})`
      : '';
    
    lines.push(`### ${roleEmoji} ${roleLabel}${timestampStr}`);
    lines.push('');
    
    // 消息内容
    const content = extractMessageText(message, options.includeThoughts);
    lines.push(content);
    lines.push('');
  }
  
  // 添加页脚
  lines.push('---');
  lines.push('');
  lines.push(`*由 Gemini Chat 导出*`);
  
  return lines.join('\n');
}

// ============ 文件下载 ============

/**
 * 触发文件下载
 * @param content - 文件内容（字符串或 Blob）
 * @param filename - 文件名
 * @param mimeType - MIME 类型
 */
export function downloadFile(
  content: string | Blob,
  filename: string,
  mimeType: string = 'text/plain'
): void {
  const blob = content instanceof Blob 
    ? content 
    : new Blob([content], { type: mimeType });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * 导出对话
 * 统一的导出入口函数
 * 
 * 注意：
 * - markdown 和 pdf 格式可以直接使用此函数
 * - image 格式需要在 UI 层处理，因为需要先渲染 LongImageRenderer 组件
 *   请使用 exportChatToImage 函数（已从此模块重新导出）
 * 
 * Requirements: 2.1
 * 
 * @param messages - 消息列表
 * @param metadata - 导出元数据
 * @param options - 导出选项
 */
export async function exportChat(
  messages: Message[],
  metadata: ExportMetadata,
  options: ExportOptions
): Promise<void> {
  const { format, ...restOptions } = options;
  const filename = `${metadata.title || '对话记录'}_${formatTimestamp(metadata.exportedAt).replace(/[/:]/g, '-')}`;
  
  switch (format) {
    case 'markdown': {
      const markdown = exportToMarkdown(messages, metadata, restOptions);
      downloadFile(markdown, `${filename}.md`, 'text/markdown');
      break;
    }
    
    case 'image': {
      // 图片格式导出需要在 UI 层处理
      // 因为需要先渲染 LongImageRenderer 组件获取 DOM 元素
      // 请使用从此模块导出的 exportChatToImage 函数
      // 
      // 使用示例：
      // import { exportChatToImage } from './export';
      // await exportChatToImage(domElement, metadata, { includeTimestamps, includeThoughts, theme });
      throw new Error(
        '图片格式导出需要 DOM 元素，请使用 exportChatToImage 函数。' +
        '该函数已从此模块重新导出，可直接导入使用。'
      );
    }
    
    default: {
      // 类型安全检查
      const _exhaustiveCheck: never = format;
      throw new Error(`不支持的导出格式: ${_exhaustiveCheck}`);
    }
  }
}
