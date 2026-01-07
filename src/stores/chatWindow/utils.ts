/**
 * ChatWindow Store 工具函数
 * 需求: 2.1 - 拆分工具函数到独立文件
 */

import type { Message } from '../../types/models';
import type { GeminiContent, GeminiPart } from '../../types/gemini';

/**
 * 生成唯一 ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * 将消息转换为 Gemini API 格式
 * 需求: 2.1, 2.2, 2.4, 3.2, 4.1 - 支持文件引用转换
 * 需求: 2.6 - 画图模型连续对话支持
 * 
 * 转换顺序：file_data → inlineData → text
 * 
 * @param message - 消息对象
 * @param isImageGenerationModel - 是否为画图模型
 */
export function messageToGeminiContent(message: Message, isImageGenerationModel: boolean = false): GeminiContent {
  const parts: GeminiPart[] = [];

  // 1. 添加文件引用 parts（仅 ready 状态）- 需求: 2.1, 2.2, 2.4, 4.1
  if (message.fileReferences && message.fileReferences.length > 0) {
    for (const ref of message.fileReferences) {
      if (ref.status === 'ready') {
        parts.push({
          file_data: {
            file_uri: ref.uri,
            mime_type: ref.mimeType,
          },
        });
      }
    }
  }

  // 对于画图模型，model 角色的消息需要特殊处理
  // 不包含图片数据，只保留 thoughtSignature，这是画图模型连续对话的关键
  if (isImageGenerationModel && message.role === 'model') {
    if (message.thoughtSignature) {
      parts.push({ thoughtSignature: message.thoughtSignature });
    }
    // 画图模型的 model 回复不添加图片数据
  } else {
    // 2. 非画图模型或 user 角色的消息，添加内联附件 - 需求: 3.2
    if (message.attachments && message.attachments.length > 0) {
      for (const attachment of message.attachments) {
        parts.push({
          inlineData: {
            mimeType: attachment.mimeType,
            data: attachment.data,
          },
        });
      }
    }
  }

  // 3. 添加文本内容 - 需求: 3.2
  if (message.content) {
    parts.push({ text: message.content });
  }

  return {
    role: message.role,
    parts,
  };
}

/**
 * 将消息历史转换为 Gemini API 格式
 * 
 * @param messages - 消息列表
 * @param isImageGenerationModel - 是否为画图模型
 */
export function messagesToGeminiContents(messages: Message[], isImageGenerationModel: boolean = false): GeminiContent[] {
  return messages.map(msg => messageToGeminiContent(msg, isImageGenerationModel));
}
