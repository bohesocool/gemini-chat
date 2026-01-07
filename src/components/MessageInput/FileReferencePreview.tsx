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
import { isRetryableError, getErrorDetails } from '../../services/filesApi/errors';

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
      return <ImageIcon className={className} />;
    case 'document':
      return <DocumentIcon className={className} />;
    default:
      return <FileIcon className={className} />;
  }
}

// ============ 图标组件 ============

function AudioIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-purple-500 dark:text-purple-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
      />
    </svg>
  );
}

function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-red-500 dark:text-red-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-blue-500 dark:text-blue-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-amber-500 dark:text-amber-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-neutral-500 dark:text-neutral-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * 重试图标 - 需求: 5.2
 */
function RetryIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

export default FileReferencePreview;
