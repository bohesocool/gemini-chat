/**
 * 文件引用预览卡片组件
 * 显示通过 Files API 上传的文件的预览信息
 * 
 * Requirements: 3.1, 3.2, 3.5, 5.2
 */

import type { FileReference } from '../../types/filesApi';
import { getFileCategory } from '../../types/filesApi';
import { formatFileSize } from '../../services/file';
import { durationValues, easings } from '../../design/tokens';
import { useReducedMotion } from '../motion';
import { isRetryableError } from '../../services/filesApi/errors';
import {
  AudioIcon,
  VideoIcon,
  ImageOutlineIcon,
  DocumentIcon,
  FileRefFileIcon,
  XIcon,
  RetryIcon,
} from '../icons';

/**
 * FileReferencePreview 组件属性
 */
export interface FileReferencePreviewProps {
  /** 文件引用 */
  reference: FileReference;
  /** 删除回调 */
  onRemove: () => void;
  /** 重试回调 - 需求: 5.2 */
  onRetry?: () => void;
}

/**
 * 文件引用预览卡片
 * 
 * Requirements:
 * - 3.1: 显示文件名、类型和上传状态
 * - 3.2: 提供删除按钮移除文件引用
 * - 3.5: 使用独特视觉样式区分于 base64 附件
 * - 5.2: 提供重试按钮
 */
export function FileReferencePreview({
  reference,
  onRemove,
  onRetry,
}: FileReferencePreviewProps) {
  const reducedMotion = useReducedMotion();
  const category = getFileCategory(reference.mimeType);

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  // 检查错误是否可重试 - 需求: 5.2
  const canRetry = reference.status === 'error' && 
    onRetry && 
    (reference.errorCode ? isRetryableError({ code: reference.errorCode } as any) : true);

  // 根据状态获取状态指示器样式
  const getStatusStyles = () => {
    switch (reference.status) {
      case 'uploading':
        return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800';
      case 'ready':
        return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800';
      case 'error':
        return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      default:
        return 'bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700';
    }
  };

  // 根据状态获取状态文本
  const getStatusText = () => {
    switch (reference.status) {
      case 'uploading':
        return reference.progress !== undefined 
          ? `上传中 ${reference.progress}%` 
          : '上传中...';
      case 'ready':
        return 'Files API';
      case 'error':
        return reference.error || '上传失败';
      default:
        return '';
    }
  };

  // 根据状态获取状态文本颜色
  const getStatusTextColor = () => {
    switch (reference.status) {
      case 'uploading':
        return 'text-amber-600 dark:text-amber-400';
      case 'ready':
        return 'text-emerald-600 dark:text-emerald-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-neutral-500 dark:text-neutral-400';
    }
  };

  return (
    <div
      className={`
        relative group col-span-2
        flex items-center gap-3
        rounded-xl px-3 py-2.5
        border-2 border-dashed
        ${getStatusStyles()}
      `}
      style={transitionStyle}
    >
      {/* 文件类型图标 */}
      <div className="flex-shrink-0">
        <FileTypeIcon category={category} className="w-6 h-6" />
      </div>

      {/* 文件信息 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate">
          {reference.displayName}
        </p>
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500 dark:text-neutral-400">
            {formatFileSize(reference.sizeBytes)}
          </span>
          <span className="text-neutral-300 dark:text-neutral-600">•</span>
          <span className={getStatusTextColor()}>
            {getStatusText()}
          </span>
        </div>
      </div>

      {/* 上传进度条 */}
      {reference.status === 'uploading' && reference.progress !== undefined && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-neutral-200 dark:bg-neutral-700 rounded-b-xl overflow-hidden">
          <div
            className="h-full bg-amber-500 dark:bg-amber-400"
            style={{
              width: `${reference.progress}%`,
              ...transitionStyle,
            }}
          />
        </div>
      )}

      {/* 重试按钮 - 需求: 5.2 */}
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="
            p-1.5 rounded-lg
            text-amber-500 hover:text-amber-600
            dark:text-amber-400 dark:hover:text-amber-300
            hover:bg-amber-50 dark:hover:bg-amber-900/30
            touch-manipulation
          "
          style={transitionStyle}
          title="重试上传"
          aria-label={`重试上传 ${reference.displayName}`}
        >
          <RetryIcon className="w-4 h-4" />
        </button>
      )}

      {/* 删除按钮 - Requirements: 3.2 */}
      <button
        type="button"
        onClick={onRemove}
        className="
          p-1.5 rounded-lg
          text-neutral-400 hover:text-red-500
          dark:text-neutral-500 dark:hover:text-red-400
          hover:bg-neutral-100 dark:hover:bg-neutral-700
          opacity-0 group-hover:opacity-100
          focus:opacity-100
          touch-manipulation
        "
        style={transitionStyle}
        title="移除文件"
        aria-label={`移除 ${reference.displayName}`}
      >
        <XIcon className="w-4 h-4" />
      </button>

      {/* Files API 标识徽章 - Requirements: 3.5 */}
      <div className="
        absolute -top-2 -right-2
        px-1.5 py-0.5 rounded-full
        bg-primary-500 text-white
        text-[10px] font-medium
        shadow-sm
      ">
        API
      </div>
    </div>
  );
}

/**
 * 文件类型图标组件
 */
interface FileTypeIconProps {
  category: 'audio' | 'video' | 'image' | 'document' | undefined;
  className?: string;
}

function FileTypeIcon({ category, className }: FileTypeIconProps) {
  switch (category) {
    case 'audio':
      return <AudioIcon className={className} />;
    case 'video':
      return <VideoIcon className={className} />;
    case 'image':
      return <ImageOutlineIcon className={className} />;
    case 'document':
      return <DocumentIcon className={className} />;
    default:
      return <FileRefFileIcon className={className} />;
  }
}

export default FileReferencePreview;
