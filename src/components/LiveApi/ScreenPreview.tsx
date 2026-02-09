/**
 * 屏幕预览组件
 * 需求: 6.1, 6.2, 6.3
 *
 * 在对话区域（TranscriptDisplay 上方）显示可折叠的屏幕预览缩略图。
 * 仅在屏幕共享处于 sharing 状态时渲染。
 * 按照帧截取的频率更新预览图片内容。
 */

import { useState } from 'react';

/**
 * 屏幕预览组件属性
 */
export interface ScreenPreviewProps {
  /** 最新屏幕帧 Base64 数据 */
  frameData: string | null;
  /** 是否正在共享 */
  isSharing: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 屏幕预览组件
 * 需求: 6.1 - 在对话区域显示可折叠的屏幕预览缩略图
 * 需求: 6.2 - 支持折叠/展开切换
 * 需求: 6.3 - 按照帧截取频率更新预览图片
 */
export function ScreenPreview({
  frameData,
  isSharing,
  className = '',
}: ScreenPreviewProps): JSX.Element | null {
  // 折叠/展开状态
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 仅在共享中状态时渲染 - 需求: 6.1
  if (!isSharing) {
    return null;
  }

  return (
    <div
      className={`mx-4 mb-2 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50 overflow-hidden ${className}`}
      data-testid="screen-preview"
    >
      {/* 头部：标题和折叠按钮 */}
      <div className="flex items-center justify-between px-3 py-2">
        <div className="flex items-center gap-2">
          <ScreenShareIcon className="w-4 h-4 text-primary-500" />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
            屏幕共享预览
          </span>
          {/* 共享中指示器 */}
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
        </div>

        {/* 折叠/展开按钮 - 需求: 6.2 */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded-lg hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 dark:text-neutral-500 transition-colors"
          title={isCollapsed ? '展开预览' : '折叠预览'}
          data-testid="screen-preview-toggle"
        >
          {isCollapsed ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronUpIcon className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* 预览图片区域 - 需求: 6.3 */}
      {!isCollapsed && (
        <div className="px-3 pb-3">
          {frameData ? (
            <img
              src={`data:image/jpeg;base64,${frameData}`}
              alt="屏幕共享预览"
              className="w-full rounded-lg border border-neutral-200 dark:border-neutral-600 object-contain max-h-48"
              data-testid="screen-preview-image"
            />
          ) : (
            <div className="flex items-center justify-center h-32 rounded-lg border border-dashed border-neutral-300 dark:border-neutral-600 bg-neutral-100 dark:bg-neutral-800">
              <span className="text-xs text-neutral-400 dark:text-neutral-500">
                等待屏幕帧...
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============ 图标组件 ============

/** 屏幕共享图标 */
function ScreenShareIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

/** 向上箭头图标（折叠） */
function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

/** 向下箭头图标（展开） */
function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

export default ScreenPreview;
