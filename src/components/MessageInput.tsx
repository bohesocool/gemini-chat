/**
 * 消息输入组件
 * 现代化设计，支持自动高度调整和丰富的交互反馈
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Attachment, ImageGenerationConfig, ThinkingLevel, ModelCapabilities } from '../types/models';
import { validateFile, fileToBase64, getFileMimeType, isImageFile, formatFileSize } from '../services/file';
import { useReducedMotion } from './motion';
import { durationValues, easings, touchTargets } from '../design/tokens';
import { useModelStore } from '../stores/model';
import { ImageConfigToolbar } from './MessageInput/ImageConfigToolbar';
import { StatusIndicators } from './MessageInput/StatusIndicators';

interface MessageInputProps {
  /** 发送消息回调 */
  onSend: (content: string, attachments?: Attachment[]) => void;
  /** 取消请求回调 - 需求: 5.1 */
  onCancel?: () => void;
  /** 是否正在发送 */
  isSending?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否显示扩展工具栏 */
  showExtendedToolbar?: boolean;
  /** 编辑模式的初始内容 - 需求: 3.3 */
  editingContent?: string;
  /** 是否处于编辑模式 - 需求: 3.3 */
  isEditing?: boolean;
  /** 取消编辑回调 - 需求: 3.3 */
  onCancelEdit?: () => void;
  /** 是否启用联网搜索 - 需求: 联网搜索 */
  webSearchEnabled?: boolean;
  /** 切换联网搜索回调 - 需求: 联网搜索 */
  onWebSearchToggle?: () => void;
  /** 当前模型 ID - 用于判断是否显示图片配置 - 需求: 1.1, 1.2 */
  currentModel?: string;
  /** 当前图片配置 - 需求: 1.1, 1.2 */
  imageConfig?: ImageGenerationConfig;
  /** 图片配置变更回调 - 需求: 1.1, 1.2 */
  onImageConfigChange?: (config: Partial<ImageGenerationConfig>) => void;
  /** 是否启用流式输出 - 需求: 4.1 */
  streamingEnabled?: boolean;
  /** 切换流式输出回调 - 需求: 4.1 */
  onStreamingToggle?: () => void;
  /** 是否显示思维链 - 需求: 4.2 */
  includeThoughts?: boolean;
  /** 切换思维链回调 - 需求: 4.2 */
  onThoughtsToggle?: () => void;
  /** 思考程度 - 需求: 4.3 */
  thinkingLevel?: ThinkingLevel;
  /** 思考程度变更回调 - 需求: 4.3 */
  onThinkingLevelChange?: (level: ThinkingLevel) => void;
  /** 思考预算 - 需求: 4.3 */
  thinkingBudget?: number;
  /** 思考预算变更回调 - 需求: 4.3 */
  onThinkingBudgetChange?: (budget: number) => void;
  /** 模型能力 - 需求: 4.6 */
  modelCapabilities?: ModelCapabilities;
}

// 输入框高度限制常量（用于属性测试）
export const INPUT_MIN_ROWS = 1;
export const INPUT_MAX_ROWS = 6;
export const LINE_HEIGHT_PX = 24; // 每行高度（像素）

/**
 * 计算输入框应有的高度
 * 用于属性测试验证
 */
export function calculateInputHeight(content: string): number {
  const lineCount = content.split('\n').length;
  const clampedLines = Math.max(INPUT_MIN_ROWS, Math.min(lineCount, INPUT_MAX_ROWS));
  return clampedLines * LINE_HEIGHT_PX;
}

/**
 * 消息输入组件
 * 支持多行文本输入、图片和文件上传、拖拽上传
 * 
 * Requirements:
 * - 9.1: 圆角设计，微妙边框和阴影
 * - 9.2: 焦点高亮边框动画
 * - 9.3: 自动调整高度（1-6行）
 * - 9.4: 发送按钮图标设计，悬停和点击动画
 * - 9.5: 发送时显示加载动画
 * - 9.6: 附件预览网格布局
 */
export function MessageInput({
  onSend,
  onCancel,
  isSending = false,
  disabled = false,
  placeholder = '输入消息...',
  showExtendedToolbar = true,
  editingContent,
  isEditing = false,
  onCancelEdit,
  webSearchEnabled = false,
  onWebSearchToggle,
  currentModel,
  imageConfig,
  onImageConfigChange,
  streamingEnabled = true,
  onStreamingToggle,
  includeThoughts,
  onThoughtsToggle,
  thinkingLevel,
  onThinkingLevelChange,
  thinkingBudget,
  onThinkingBudgetChange,
  modelCapabilities,
}: MessageInputProps) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();
  
  // 获取模型 store 的 getEffectiveCapabilities 方法
  // 需求: 4.1, 4.2, 4.3, 4.4, 4.5 (model-redirect-enhancement)
  const getEffectiveCapabilities = useModelStore(state => state.getEffectiveCapabilities);

  // 当进入编辑模式时，填充编辑内容并聚焦 - 需求: 3.3
  useEffect(() => {
    if (isEditing && editingContent !== undefined) {
      setContent(editingContent);
      // 聚焦输入框
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 0);
    }
  }, [isEditing, editingContent]);

  // 自动调整文本框高度 - Requirements: 9.3
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const maxHeight = INPUT_MAX_ROWS * LINE_HEIGHT_PX;
      const minHeight = INPUT_MIN_ROWS * LINE_HEIGHT_PX;
      const scrollHeight = textarea.scrollHeight;
      textarea.style.height = `${Math.max(minHeight, Math.min(scrollHeight, maxHeight))}px`;
    }
  }, [content]);

  // 清除错误提示
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 判断是否显示图片配置工具栏 - 需求: 1.1, 1.2, 1.3, 1.4
  // 使用有效能力（考虑重定向）判断是否显示图片配置
  // 需求: 4.1, 4.2, 4.3, 4.4, 4.5 (model-redirect-enhancement)
  const showImageConfig = (() => {
    if (!currentModel || !imageConfig || !onImageConfigChange) {
      return false;
    }
    // 使用 getEffectiveCapabilities 获取有效能力（处理重定向链）
    const capabilities = getEffectiveCapabilities(currentModel);
    return capabilities.supportsImageGeneration === true;
  })();

  // 获取是否支持图片分辨率设置 - 需求: 3.1, 3.4
  const supportsImageSize = (() => {
    if (!currentModel) {
      return true;
    }
    const capabilities = getEffectiveCapabilities(currentModel);
    return capabilities.supportsImageSize !== false;
  })();



  // 处理文件选择
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = [];

    for (const file of fileArray) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setError(validation.error || '文件验证失败');
        continue;
      }

      try {
        const mimeType = getFileMimeType(file);
        const base64Data = await fileToBase64(file);
        
        const attachment: Attachment = {
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          type: isImageFile(mimeType) ? 'image' : 'file',
          name: file.name,
          mimeType,
          data: base64Data,
          size: file.size,
        };
        
        newAttachments.push(attachment);
      } catch (err) {
        console.error('文件处理失败:', err);
        setError(`文件处理失败: ${file.name}`);
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, []);

  const handleImageClick = () => {
    imageInputRef.current?.click();
  };

  const handleFileClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleSend = () => {
    const trimmedContent = content.trim();
    
    if (!trimmedContent && attachments.length === 0) {
      return;
    }

    onSend(trimmedContent, attachments.length > 0 ? attachments : undefined);
    
    // 编辑模式下不清空内容，由父组件控制 - 需求: 3.3
    if (!isEditing) {
      setContent('');
      setAttachments([]);
      
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // 处理取消编辑 - 需求: 3.3
  const handleCancelEdit = () => {
    setContent('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    onCancelEdit?.();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isSending && !disabled) {
        handleSend();
      }
    }
  };

  const isDisabled = disabled || isSending;
  const canSend = (content.trim() || attachments.length > 0) && !isDisabled;

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <div
      ref={containerRef}
      className={`
        relative border-t border-neutral-200 dark:border-neutral-700 
        bg-white dark:bg-neutral-900 px-3 py-2 pb-1
        ${isDragging ? 'ring-2 ring-primary-500 ring-inset' : ''}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 编辑模式指示器 - 需求: 3.3 */}
      {isEditing && (
        <div className="
          mb-2 px-3 py-2 rounded-xl
          bg-primary-50 dark:bg-primary-900/20 
          border border-primary-200 dark:border-primary-800 
          flex items-center justify-between
        ">
          <div className="flex items-center gap-2">
            <EditIndicatorIcon className="w-4 h-4 text-primary-500" />
            <span className="text-sm font-medium text-primary-700 dark:text-primary-300">
              正在编辑消息
            </span>
          </div>
          <button
            onClick={handleCancelEdit}
            className="
              text-sm text-primary-600 dark:text-primary-400 
              hover:text-primary-700 dark:hover:text-primary-300
              font-medium
            "
          >
            取消
          </button>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="
          mb-2 px-3 py-2 rounded-xl
          bg-error-light/10 dark:bg-error-dark/10 
          border border-error-light/20 dark:border-error-dark/20 
          text-sm text-error-light dark:text-error-dark
        ">
          {error}
        </div>
      )}

      {/* 附件预览区域 - Requirements: 9.6 网格布局 */}
      {attachments.length > 0 && (
        <div className="mb-2 grid grid-cols-4 sm:grid-cols-6 gap-2">
          {attachments.map((attachment) => (
            <AttachmentPreview
              key={attachment.id}
              attachment={attachment}
              onRemove={() => handleRemoveAttachment(attachment.id)}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>
      )}

      {/* 拖拽提示 - Requirements: 9.6 */}
      {isDragging && (
        <div className="
          absolute inset-2 flex items-center justify-center 
          bg-primary-500/10 border-2 border-dashed border-primary-500 
          rounded-2xl z-10 backdrop-blur-sm
        ">
          <div className="text-center">
            <UploadIcon className="w-10 h-10 mx-auto mb-2 text-primary-500" />
            <p className="text-primary-600 dark:text-primary-400 font-medium">
              释放以上传文件
            </p>
          </div>
        </div>
      )}

      {/* 输入区域 - Requirements: 7.1, 7.2, 7.3, 7.4 */}
      <div className="flex items-end gap-2">
        {/* 快捷上传按钮（工具栏隐藏时显示） */}
        {!showExtendedToolbar && (
          <div className="flex gap-1 flex-shrink-0">
            <IconButton
              onClick={handleImageClick}
              disabled={isDisabled}
              title="上传图片"
              reducedMotion={reducedMotion}
            >
              <ImageIcon className="w-5 h-5" />
            </IconButton>
            
            <IconButton
              onClick={handleFileClick}
              disabled={isDisabled}
              title="上传文件"
              className="hidden sm:flex"
              reducedMotion={reducedMotion}
            >
              <PaperclipIcon className="w-5 h-5" />
            </IconButton>
          </div>
        )}

        {/* 文本输入框 - Requirements: 9.1, 9.2 */}
        <div className="flex-1 min-w-0 relative">
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            disabled={isDisabled}
            rows={1}
            className={`
              w-full resize-none rounded-2xl px-4 py-3
              bg-neutral-50 dark:bg-neutral-800
              text-neutral-900 dark:text-neutral-100 
              placeholder-neutral-400 dark:placeholder-neutral-500
              disabled:opacity-50 disabled:cursor-not-allowed
              text-base leading-6
              border-2 outline-none
              message-input-textarea
              ${isFocused
                ? 'border-primary-500 shadow-lg shadow-primary-500/10'
                : 'border-neutral-200 dark:border-neutral-700 shadow-sm'
              }
            `}
            style={{
              ...transitionStyle,
              minHeight: `${INPUT_MIN_ROWS * LINE_HEIGHT_PX + 24}px`,
              overflowY: 'auto',
            }}
          />
        </div>

        {/* 发送/取消按钮 - Requirements: 9.4, 5.1 */}
        {isSending && onCancel ? (
          // 取消按钮 - 需求: 5.1 在发送状态时显示取消按钮
          <button
            type="button"
            onClick={onCancel}
            className="
              p-3 rounded-2xl flex-shrink-0 touch-manipulation
              flex items-center justify-center
              bg-error-light hover:bg-red-600 active:scale-95 
              text-white shadow-md shadow-error-light/30 
              hover:shadow-lg hover:shadow-error-light/40
            "
            style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
            title="取消请求"
          >
            <StopIcon className="w-5 h-5" />
          </button>
        ) : (
          // 发送按钮 - Requirements: 9.4 主题色
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className={`
              p-3 rounded-2xl flex-shrink-0 touch-manipulation
              flex items-center justify-center
              ${canSend
                ? 'bg-primary-500 hover:bg-primary-600 active:scale-95 text-white shadow-md shadow-primary-500/30 hover:shadow-lg hover:shadow-primary-500/40'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
              }
            `}
            style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
            title="发送消息"
          >
            {isSending ? (
              <LoadingSpinner className="w-5 h-5" />
            ) : (
              <SendIcon className="w-5 h-5" />
            )}
          </button>
        )}
      </div>

      {/* 工具栏 - 移到输入框下方 - Requirements: 7.2, 7.3 */}
      {showExtendedToolbar && (
        <div className="flex items-center gap-1 mt-2 pt-1">
          {/* 附件按钮 */}
          <ToolbarButton
            onClick={handleImageClick}
            disabled={isDisabled}
            title="上传图片"
            reducedMotion={reducedMotion}
          >
            <ImageIcon className="w-4 h-4" />
          </ToolbarButton>
          
          <ToolbarButton
            onClick={handleFileClick}
            disabled={isDisabled}
            title="上传文件"
            reducedMotion={reducedMotion}
          >
            <PaperclipIcon className="w-4 h-4" />
          </ToolbarButton>

          {/* 分隔线 */}
          <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

          {/* 联网搜索按钮 - 需求: 联网搜索 */}
          <ToolbarButton
            onClick={() => onWebSearchToggle?.()}
            disabled={isDisabled}
            title={webSearchEnabled ? '关闭联网搜索' : '开启联网搜索'}
            active={webSearchEnabled}
            reducedMotion={reducedMotion}
          >
            <GlobeIcon className="w-4 h-4" />
          </ToolbarButton>

          {/* 图片配置工具栏 - 需求: 2.1, 3.1 */}
          {showImageConfig && imageConfig && onImageConfigChange && (
            <>
              {/* 分隔线 */}
              <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
              <ImageConfigToolbar
                config={imageConfig}
                onChange={onImageConfigChange}
                disabled={isDisabled}
                supportsImageSize={supportsImageSize}
              />
            </>
          )}

          {/* 状态指示器 - 需求: 4.1, 4.2, 4.3, 4.6 */}
          {modelCapabilities && (
            <>
              {/* 分隔线 */}
              <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />
              <StatusIndicators
                streamingEnabled={streamingEnabled}
                onStreamingToggle={onStreamingToggle}
                includeThoughts={includeThoughts}
                onThoughtsToggle={onThoughtsToggle}
                thinkingLevel={thinkingLevel}
                onThinkingLevelChange={onThinkingLevelChange}
                thinkingBudget={thinkingBudget}
                onThinkingBudgetChange={onThinkingBudgetChange}
                capabilities={modelCapabilities}
                disabled={isDisabled}
              />
            </>
          )}

          <div className="flex-1" />

          {/* 联网搜索状态指示 */}
          {webSearchEnabled && (
            <span className="text-xs text-primary-500 dark:text-primary-400 hidden sm:inline">
              联网搜索已开启
            </span>
          )}

          {/* 提示文字 */}
          <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
            Enter 发送 · Shift+Enter 换行
          </span>
        </div>
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.txt,.js,.ts,.jsx,.tsx,.py,.java,.css,.html,.json,.xml,.md"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}

/**
 * 工具栏按钮组件 - Requirements: 9.2
 */
interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  active?: boolean;
  reducedMotion: boolean;
}

function ToolbarButton({ onClick, disabled, title, children, active = false, reducedMotion }: ToolbarButtonProps) {
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-lg flex items-center justify-center touch-manipulation
        ${active
          ? 'text-primary-500 bg-primary-50 dark:bg-primary-900/30'
          : 'text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
        }
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
      `}
      style={transitionStyle}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * 图标按钮组件
 */
interface IconButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
  reducedMotion: boolean;
}

function IconButton({ onClick, disabled, title, children, className = '', reducedMotion }: IconButtonProps) {
  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        p-2 rounded-xl flex items-center justify-center touch-manipulation
        text-neutral-500 dark:text-neutral-400
        hover:text-neutral-700 dark:hover:text-neutral-200
        hover:bg-neutral-100 dark:hover:bg-neutral-800
        active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed
        ${className}
      `}
      style={{ ...transitionStyle, minWidth: touchTargets.minimum, minHeight: touchTargets.minimum }}
      title={title}
    >
      {children}
    </button>
  );
}

/**
 * 附件预览组件
 */
interface AttachmentPreviewProps {
  attachment: Attachment;
  onRemove: () => void;
  reducedMotion: boolean;
}

function AttachmentPreview({ attachment, onRemove, reducedMotion }: AttachmentPreviewProps) {
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
          title="删除"
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
        title="删除"
      >
        <XIcon className="w-4 h-4" />
      </button>
    </div>
  );
}

// ============ 图标组件 ============

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  );
}

function PaperclipIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  );
}

function FileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
    </svg>
  );
}

/**
 * 停止图标 - 需求: 5.1
 */
function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}

/**
 * 编辑指示器图标 - 需求: 3.3
 */
function EditIndicatorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  );
}

/**
 * 地球图标 - 需求: 联网搜索
 */
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
      />
    </svg>
  );
}

export default MessageInput;
