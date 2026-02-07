/**
 * 对话导出对话框组件
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.6, 4.4, 5.1, 5.2
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { exportChat, type ExportFormat, type ExportOptions } from '../../services/export';
import { exportChatToImage } from '../../services/imageExport';
import { LongImageRenderer } from './LongImageRenderer';
import type { Message } from '../../types';
import { useTranslation } from '@/i18n';
import { CloseIcon, MarkdownIcon, ImageFillIcon, ExportIcon, ErrorIcon, SuccessIcon } from '../icons';

// ============ 类型定义 ============

export interface ExportDialogProps {
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
  /** 窗口 ID */
  windowId: string;
  /** 窗口标题 */
  windowTitle: string;
  /** 消息列表 */
  messages: Message[];
  /** 模型名称 */
  modelName: string;
}

// ============ 主组件 ============

/**
 * 导出对话框组件
 * 
 * Requirements:
 * - 1.1, 1.2, 1.3: 显示格式选择（Markdown/PDF/长图）
 * - 1.6: 显示导出选项（包含时间戳、包含思维链）
 * - 4.4, 5.1, 5.2: 显示加载状态和结果反馈
 */
export function ExportDialog({
  isOpen,
  onClose,
  windowId: _windowId,
  windowTitle,
  messages,
  modelName,
}: ExportDialogProps) {
  const { t } = useTranslation();
  
  // 导出选项状态
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [includeThoughts, setIncludeThoughts] = useState(false);
  
  // 导出状态
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // 长图渲染状态 - Requirements: 4.4
  const [isRenderingImage, setIsRenderingImage] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const longImageRef = useRef<HTMLDivElement>(null);
  
  // 检测当前主题
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  // 监听主题变化
  useEffect(() => {
    const checkTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };
    
    checkTheme();
    
    // 监听 class 变化
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });
    
    return () => observer.disconnect();
  }, []);

  // 处理长图导出 - Requirements: 4.4, 5.1, 5.2
  const handleImageExport = useCallback(async () => {
    setIsRenderingImage(true);
    
    // 等待 DOM 渲染完成（需要足够的时间让 React 渲染和样式计算完成）
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (!longImageRef.current) {
      throw new Error('长图渲染失败，请重试');
    }
    
    const metadata = {
      title: windowTitle,
      modelName,
      exportedAt: Date.now(),
    };
    
    const options = {
      includeTimestamps,
      includeThoughts,
      theme,
    };
    
    await exportChatToImage(longImageRef.current, metadata, options);
    
    setIsRenderingImage(false);
  }, [windowTitle, modelName, includeTimestamps, includeThoughts, theme]);

  // 处理导出 - Requirements: 4.4, 5.1, 5.2
  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setError(null);
    setSuccess(false);
    
    try {
      if (format === 'image') {
        // 长图导出流程
        await handleImageExport();
      } else {
        // Markdown/PDF 导出流程
        const options: ExportOptions = {
          format,
          includeTimestamps,
          includeThoughts,
        };
        
        const metadata = {
          title: windowTitle,
          modelName,
          exportedAt: Date.now(),
        };
        
        await exportChat(messages, metadata, options);
      }
      
      setSuccess(true);
      // 2 秒后关闭对话框
      setTimeout(() => {
        onClose();
        setSuccess(false);
      }, 2000);
    } catch (err) {
      console.error('导出失败:', err);
      setError(err instanceof Error ? err.message : '导出失败，请重试');
      setIsRenderingImage(false);
    } finally {
      setIsExporting(false);
    }
  }, [format, includeTimestamps, includeThoughts, windowTitle, modelName, messages, onClose, handleImageExport]);

  // 关闭对话框
  const handleClose = useCallback(() => {
    if (!isExporting) {
      setError(null);
      setSuccess(false);
      onClose();
    }
  }, [isExporting, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* 隐藏的长图渲染容器 - Requirements: 4.4 */}
      {/* 注意：不能使用 visibility: hidden，否则 html-to-image 无法捕获内容 */}
      {isRenderingImage && createPortal(
        <div
          ref={imageContainerRef}
          style={{
            position: 'fixed',
            left: '-9999px',
            top: 0,
            zIndex: 9999,
            opacity: 1,
            pointerEvents: 'none',
          }}
        >
          <LongImageRenderer
            ref={longImageRef}
            messages={messages}
            metadata={{
              title: windowTitle,
              modelName,
              exportedAt: Date.now(),
            }}
            options={{
              includeTimestamps,
              includeThoughts,
            }}
            theme={theme}
          />
        </div>,
        document.body
      )}
      
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* 遮罩层 */}
        <div 
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />
      
        {/* 对话框 */}
        <div className="relative bg-white dark:bg-neutral-800 rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
          {/* 标题栏 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-200 dark:border-neutral-700">
            <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
              {t('export.title')}
            </h2>
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-500 dark:text-neutral-400 transition-colors disabled:opacity-50"
              aria-label={t('common.close')}
            >
              <CloseIcon className="w-5 h-5" />
            </button>
          </div>
        
          {/* 内容区 */}
          <div className="px-6 py-4 space-y-6">
            {/* 对话信息 */}
            <div className="text-sm text-neutral-600 dark:text-neutral-400">
              <p>{t('export.chatTitle')}: <span className="text-neutral-900 dark:text-neutral-100">{windowTitle || t('export.untitledChat')}</span></p>
              <p>{t('export.messageCount')}: <span className="text-neutral-900 dark:text-neutral-100">{messages.length}</span></p>
            </div>
            
            {/* 格式选择 - Requirements: 1.1, 1.3 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t('export.format')}
              </label>
              <div className="flex gap-3">
                <FormatButton
                  format="markdown"
                  currentFormat={format}
                  onClick={() => setFormat('markdown')}
                  icon={<MarkdownIcon className="w-5 h-5" />}
                  label="Markdown"
                  description={t('export.markdownDesc')}
                />
                <FormatButton
                  format="image"
                  currentFormat={format}
                  onClick={() => setFormat('image')}
                  icon={<ImageFillIcon className="w-5 h-5" />}
                  label={t('export.longImage')}
                  description={t('export.imageDesc')}
                />
              </div>
            </div>
            
            {/* 导出选项 - Requirements: 1.6 */}
            <div>
              <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                {t('export.options')}
              </label>
              <div className="space-y-3">
                <OptionCheckbox
                  checked={includeTimestamps}
                  onChange={setIncludeTimestamps}
                  label={t('export.includeTimestamps')}
                  description={t('export.includeTimestampsDesc')}
                />
                <OptionCheckbox
                  checked={includeThoughts}
                  onChange={setIncludeThoughts}
                  label={t('export.includeThoughts')}
                  description={t('export.includeThoughtsDesc')}
                />
              </div>
            </div>
            
            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                <ErrorIcon className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            {/* 成功提示 */}
            {success && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                <SuccessIcon className="w-5 h-5 flex-shrink-0" />
                <span>{t('export.success')}</span>
              </div>
            )}
          </div>
          
          {/* 底部按钮 */}
          <div className="flex justify-end gap-3 px-6 py-4 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900/50">
            <button
              onClick={handleClose}
              disabled={isExporting}
              className="px-4 py-2 rounded-lg text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors disabled:opacity-50"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting || messages.length === 0}
              className="px-4 py-2 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isExporting ? (
                <>
                  <LoadingSpinner className="w-4 h-4" />
                  <span>{t('export.exporting')}</span>
                </>
              ) : (
                <>
                  <ExportIcon className="w-4 h-4" />
                  <span>{t('export.export')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============ 子组件 ============

interface FormatButtonProps {
  format: ExportFormat;
  currentFormat: ExportFormat;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}

function FormatButton({ format, currentFormat, onClick, icon, label, description }: FormatButtonProps) {
  const isSelected = format === currentFormat;
  
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
        ${isSelected 
          ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' 
          : 'border-neutral-200 dark:border-neutral-700 hover:border-neutral-300 dark:hover:border-neutral-600'
        }
      `}
    >
      <div className={isSelected ? 'text-primary-600 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'}>
        {icon}
      </div>
      <div>
        <div className={`font-medium ${isSelected ? 'text-primary-700 dark:text-white' : 'text-neutral-700 dark:text-neutral-300'}`}>
          {label}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </div>
      </div>
    </button>
  );
}

interface OptionCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
}

function OptionCheckbox({ checked, onChange, label, description }: OptionCheckboxProps) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="pt-0.5">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="w-4 h-4 rounded border-neutral-300 dark:border-neutral-600 text-primary-600 focus:ring-primary-500 dark:bg-neutral-700"
        />
      </div>
      <div>
        <div className="text-sm font-medium text-neutral-700 dark:text-neutral-300 group-hover:text-neutral-900 dark:group-hover:text-neutral-100">
          {label}
        </div>
        <div className="text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </div>
      </div>
    </label>
  );
}

// ============ 辅助组件 ============

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default ExportDialog;
