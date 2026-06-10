/**
 * 附件预览组件
 * 从 MessageInput.tsx 拆分而来
 *
 * Requirements: 9.6 附件预览网格布局
 */

import { memo } from 'react';
import type { Attachment } from '../../types/models';
import { formatFileSize } from '../../services/file';
import { durationValues, easings, touchTargets } from '../../design/tokens';
import { FileIcon, XIcon } from './icons';
import { useTranslation } from '@/i18n';

/**
 * AttachmentPreview 组件属性
 */
export interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove: () => void;
  reducedMotion: boolean;
}

/**
 * 附件预览
 * 使用 React.memo 包裹，隔离输入框打字时的重渲染范围
 */
export const AttachmentPreview = memo(function AttachmentPreview({ attachment, onRemove, reducedMotion }: AttachmentPreviewProps) {
  const { t } = useTranslation();
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  if (attachment.type === 'image') {
    return (
      <div className="relative group aspect-square">
        <img
          src={`data:${attachment.mimeType};base64,${attachment.data}`}
          alt={attachment.name}
          className="w-full h-full object-cover rounded-xl"
        />
        <button
          onClick={onRemove}
          className="
            absolute -top-2 -right-2 
            bg-error-light hover:bg-red-600 
            text-white rounded-full 
            flex items-center justify-center 
            opacity-0 group-hover:opacity-100
            shadow-md touch-manipulation
          "
          style={{ ...transitionStyle, minWidth: '28px', minHeight: '28px' }}
          title={t('chat.remove')}
        >
          <XIcon className="w-3 h-3" />
        </button>
        <div className="
          absolute bottom-0 left-0 right-0 
          bg-black/60 text-white text-xs px-1.5 py-0.5 
          rounded-b-xl truncate
          backdrop-blur-sm
        ">
          {attachment.name}
        </div>
      </div>
    );
  }

  return (
    <div className="
      relative group col-span-2
      flex items-center gap-2 
      bg-neutral-100 dark:bg-neutral-700 
      rounded-xl px-3 py-2
    ">
      <FileIcon className="w-5 h-5 text-neutral-500 dark:text-neutral-400 flex-shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatFileSize(attachment.size)}
        </p>
      </div>
      <button
        onClick={onRemove}
        className="
          p-2 text-neutral-400 hover:text-error-light touch-manipulation
          dark:hover:text-error-dark
        "
        style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
        title={t('chat.remove')}
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
});

export default AttachmentPreview;
