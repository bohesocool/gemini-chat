/**
 * 消息附件展示组件
 * 来源：VirtualMessageList.tsx（拆分，逻辑不变）
 */

import { memo } from 'react';
import type { Attachment } from '../../types/models';
import { FileIcon } from '../icons';

/**
 * 附件列表组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
interface AttachmentListProps {
  attachments: Attachment[];
  isUser: boolean;
}

export const AttachmentList = memo(function AttachmentList({ attachments, isUser }: AttachmentListProps) {
  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
      {attachments.map((attachment) => (
        <AttachmentPreview key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
});

/**
 * 附件预览组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
const AttachmentPreview = memo(function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  if (attachment.type === 'image') {
    return (
      <div className="relative group">
        <img
          src={`data:${attachment.mimeType};base64,${attachment.data}`}
          alt={attachment.name}
          className="
            max-w-[200px] max-h-[200px] rounded-xl object-cover
            cursor-pointer hover:opacity-90 transition-opacity
            shadow-md
          "
          onClick={() => {
            // 用 Blob URL 直接以浏览器原生图片查看器打开，避免拼接 HTML 导致 XSS
            try {
              const byteChars = atob(attachment.data);
              const bytes = new Uint8Array(byteChars.length);
              for (let i = 0; i < byteChars.length; i++) {
                bytes[i] = byteChars.charCodeAt(i);
              }
              const blob = new Blob([bytes], { type: attachment.mimeType });
              const url = URL.createObjectURL(blob);
              window.open(url, '_blank', 'noopener,noreferrer');
              // 延迟回收，给新标签页留出加载时间
              setTimeout(() => URL.revokeObjectURL(url), 60000);
            } catch {
              // base64 解析失败时静默忽略
            }
          }}
        />
        <div className="
          absolute bottom-1 left-1 right-1
          bg-black/60 text-white text-xs px-2 py-1 rounded-lg
          truncate opacity-0 group-hover:opacity-100 transition-opacity
          backdrop-blur-sm
        ">
          {attachment.name}
        </div>
      </div>
    );
  }

  return (
    <div className="
      flex items-center gap-2
      bg-neutral-100 dark:bg-neutral-700
      rounded-xl px-3 py-2 shadow-sm
    ">
      <FileIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]">
          {attachment.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
    </div>
  );
});

/**
 * 格式化文件大小
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
