/**
 * 文件引用卡片组件（消息列表中显示）
 * 显示通过 Files API 上传的文件信息
 * 
 * Requirements: 5.2, 5.5
 */

import type { FileReference } from '../../types/filesApi';
import { getFileCategory } from '../../types/filesApi';
import { formatFileSize } from '../../services/file';

/**
 * FileReferenceCard 组件属性
 */
export interface FileReferenceCardProps {
  /** 文件引用 */
  fileReference: FileReference;
}

/**
 * 文件引用卡片组件
 * 
 * Requirements:
 * - 5.2: 显示文件名、文件类型图标、文件大小
 * - 5.5: 使用 "Files API" 标签区分内联附件
 */
export function FileReferenceCard({ fileReference }: FileReferenceCardProps) {
  const category = getFileCategory(fileReference.mimeType);

  return (
    <div
      className="
        relative
        flex items-center gap-2
        rounded-xl px-3 py-2
        bg-emerald-50 dark:bg-emerald-900/20
        border border-dashed border-emerald-200 dark:border-emerald-800
        shadow-sm
      "
    >
      {/* 文件类型图标 - Requirements: 5.2 */}
      <div className="flex-shrink-0">
        <FileTypeIcon category={category} className="w-5 h-5" />
      </div>

      {/* 文件信息 - Requirements: 5.2 */}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[150px]">
          {fileReference.displayName}
        </p>
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          {formatFileSize(fileReference.sizeBytes)}
        </p>
      </div>

      {/* Files API 标识徽章 - Requirements: 5.5 */}
      <div className="
        px-1.5 py-0.5 rounded-full
        bg-emerald-500 text-white
        text-[10px] font-medium
        whitespace-nowrap
      ">
        Files API
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

export default FileReferenceCard;
