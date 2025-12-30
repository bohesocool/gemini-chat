/**
 * HTML 预览模态框组件
 * 需求: 4.6, 4.7, 4.8, 4.9, 4.10
 */

import { useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { wrapHtmlContent } from '../utils/htmlWrapper';

interface HtmlPreviewModalProps {
  /** HTML 代码内容 */
  html: string;
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * HTML 预览模态框
 * 使用 sandbox iframe 安全渲染 HTML 内容
 */
export function HtmlPreviewModal({ html, isOpen, onClose }: HtmlPreviewModalProps) {
  // 包装 HTML 内容为完整文档 - 需求: 1.1, 1.2, 1.3, 1.4
  const wrappedHtml = useMemo(() => wrapHtmlContent(html), [html]);

  // ESC 键关闭 - 需求: 4.1
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // 防止背景滚动
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  // 使用 Portal 将模态框渲染到 body，避免父元素 transform 影响 fixed 定位
  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* 毛玻璃背景 - 需求: 2.1 */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-[12px]"
        style={{ WebkitBackdropFilter: 'blur(12px)' }}
      />
      
      {/* 模态框内容 - 需求: 2.2, 2.3, 3.1, 3.2 */}
      <div 
        className="relative w-[80vw] h-[80vh] max-w-[1200px] max-h-[800px] bg-white dark:bg-slate-900 rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <PreviewIcon className="w-5 h-5 text-blue-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              HTML 预览
            </span>
          </div>
          
          {/* 关闭按钮 - 需求: 4.8 */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
            title="关闭 (ESC)"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>
        
        {/* iframe 预览区域 - 需求: 1.2, 1.3, 5.1, 5.2, 5.3, 5.4 */}
        <div className="w-full h-[calc(100%-52px)] bg-white">
          <iframe
            srcDoc={wrappedHtml}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0"
            title="HTML 预览"
          />
        </div>
      </div>
    </div>,
    document.body
  );
}

// ============ 图标组件 ============

function PreviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default HtmlPreviewModal;
