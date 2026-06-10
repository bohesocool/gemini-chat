/**
 * 消息输入组件
 * 现代化设计，支持自动高度调整和丰富的交互反馈
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { Attachment, ImageGenerationConfig, ThinkingLevel, ModelCapabilities } from '../types/models';
import { useReducedMotion } from './motion';
import { durationValues, easings } from '../design/tokens';
import { useModelStore } from '../stores/model';
import { useSettingsStore } from '../stores/settings';
import { FileReferencePreview } from './MessageInput/FileReferencePreview';
import { AttachmentPreview } from './MessageInput/AttachmentPreview';
import { IconButton } from './MessageInput/IconButton';
import { InputToolbar } from './MessageInput/InputToolbar';
import { useFileUpload } from './MessageInput/useFileUpload';
import { INPUT_MIN_ROWS, INPUT_MAX_ROWS, LINE_HEIGHT_PX } from './MessageInput/utils';
import {
  ImageIcon,
  PaperclipIcon,
  SendIcon,
  LoadingSpinner,
  UploadIcon,
  StopIcon,
  EditIndicatorIcon,
} from './MessageInput/icons';
import type { FileReference } from '../types/filesApi';
import { createLogger } from '../services/logger';
import { useTranslation } from '@/i18n';

// 模块日志记录器
const logger = createLogger('MessageInput');

// 重新导出工具函数与常量，保持原有导入路径兼容（用于属性测试）
export {
  INPUT_MIN_ROWS,
  INPUT_MAX_ROWS,
  LINE_HEIGHT_PX,
  getExtensionFromMimeType,
  generatePastedImageFilename,
  calculateInputHeight,
} from './MessageInput/utils';

interface MessageInputProps {
  /** 发送消息回调 */
  onSend: (content: string, attachments?: Attachment[], fileReferences?: FileReference[]) => void;
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
  /** 是否启用 URL 上下文 - 需求: 1.2, 1.3 */
  urlContextEnabled?: boolean;
  /** 切换 URL 上下文回调 - 需求: 1.2 */
  onUrlContextToggle?: () => void;
  /** 是否启用图片搜索 */
  imageSearchEnabled?: boolean;
  /** 切换图片搜索回调 */
  onImageSearchToggle?: () => void;
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
  placeholder,
  showExtendedToolbar = true,
  editingContent,
  isEditing = false,
  onCancelEdit,
  webSearchEnabled = false,
  onWebSearchToggle,
  urlContextEnabled = false,
  onUrlContextToggle,
  imageSearchEnabled = false,
  onImageSearchToggle,
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
  const { t } = useTranslation();
  const [content, setContent] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // 文件/图片上传与 Files API 上传状态管理（从本组件拆分出的 Hook）
  const {
    attachments,
    setAttachments,
    fileReferences,
    setFileReferences,
    error,
    handleFiles,
    handlePaste,
    handleRemoveAttachment,
    handleRemoveFileReference,
    handleRetryFileUpload,
  } = useFileUpload();

  // 使用翻译后的占位符，根据状态选择合适的提示
  const inputPlaceholder = placeholder ?? (disabled ? t('chat.inputPlaceholderNoApiKey') : t('chat.inputPlaceholderWithHint'));

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // 获取 Files API 开关状态 - 需求: 1.1, 1.2
  const filesApiEnabled = useSettingsStore(state => state.filesApiEnabled);
  const setFilesApiEnabled = useSettingsStore(state => state.setFilesApiEnabled);

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

  // 使用 useCallback 稳定回调引用，配合 InputToolbar 的 React.memo 隔离打字重渲染
  const handleImageClick = useCallback(() => {
    imageInputRef.current?.click();
  }, []);

  const handleFileClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  // 切换 Files API 模式 - 需求: 1.3
  const handleFilesApiToggle = useCallback(() => {
    logger.debug('Toggling Files API mode:', !filesApiEnabled);
    setFilesApiEnabled(!filesApiEnabled);
  }, [filesApiEnabled, setFilesApiEnabled]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // 修复闪烁问题：检查离开的目标是否还在容器内部
    // 如果鼠标只是移动到了子元素上，不应该取消拖拽状态
    if (containerRef.current && containerRef.current.contains(e.relatedTarget as Node)) {
      return;
    }

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

    // 获取已就绪的文件引用 - 需求: 3.3
    const readyFileReferences = fileReferences.filter(ref => ref.status === 'ready');

    if (!trimmedContent && attachments.length === 0 && readyFileReferences.length === 0) {
      return;
    }

    // 发送消息，包含文件引用 - 需求: 3.3, 3.4
    onSend(
      trimmedContent,
      attachments.length > 0 ? attachments : undefined,
      readyFileReferences.length > 0 ? readyFileReferences : undefined
    );

    // 编辑模式下不清空内容，由父组件控制 - 需求: 3.3
    if (!isEditing) {
      setContent('');
      setAttachments([]);
      setFileReferences([]);

      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  // 处理取消编辑 - 需求: 3.3
  const handleCancelEdit = () => {
    setContent('');
    setAttachments([]);
    setFileReferences([]);
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
  // 获取已就绪的文件引用数量
  const readyFileReferencesCount = fileReferences.filter(ref => ref.status === 'ready').length;
  const canSend = (content.trim() || attachments.length > 0 || readyFileReferencesCount > 0) && !isDisabled;

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  return (
    <div
      ref={containerRef}
      className={`
        relative
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
            <span className="text-sm font-medium text-primary-700 dark:text-white">
              {t('chat.editingMessage')}
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
            {t('common.cancel')}
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

      {/* Files API 文件引用预览区域 - 需求: 3.1, 3.5, 5.2 */}
      {fileReferences.length > 0 && (
        <div className="mb-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {fileReferences.map((reference) => (
            <FileReferencePreview
              key={reference.id}
              reference={reference}
              onRemove={() => handleRemoveFileReference(reference.id)}
              onRetry={() => handleRetryFileUpload(reference.id)}
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
              {t('chat.releaseToUpload')}
            </p>
          </div>
        </div>
      )}

      {/* 输入区域 - Requirements: 7.1, 7.2, 7.3, 7.4 */}
      <div className="flex items-center gap-2">
        {/* 快捷上传按钮（工具栏隐藏时显示） */}
        {!showExtendedToolbar && (
          <div className="flex gap-1 flex-shrink-0">
            <IconButton
              onClick={handleImageClick}
              disabled={isDisabled}
              title={t('chat.uploadImage')}
              reducedMotion={reducedMotion}
            >
              <ImageIcon className="w-5 h-5" />
            </IconButton>

            <IconButton
              onClick={handleFileClick}
              disabled={isDisabled}
              title={t('chat.uploadFile')}
              className="hidden sm:flex"
              reducedMotion={reducedMotion}
            >
              <PaperclipIcon className="w-5 h-5" />
            </IconButton>
          </div>
        )}

        {/* 文本输入框 - Requirements: 9.1, 9.2, 4.1, 4.2, 4.3, 4.4 */}
        <div
          className={`
            flex-1 min-w-0 flex items-center gap-2
            rounded-full px-4 py-2
            bg-neutral-50 dark:bg-neutral-800
            border
            ${isFocused
              ? 'border-primary-500 shadow-md shadow-primary-500/10'
              : 'border-neutral-200 dark:border-neutral-700'
            }
          `}
          style={transitionStyle}
        >
          <textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={inputPlaceholder}
            disabled={isDisabled}
            rows={1}
            className="
              flex-1 resize-none py-1
              bg-transparent
              text-neutral-900 dark:text-neutral-100 
              placeholder-neutral-400 dark:placeholder-neutral-500
              disabled:opacity-50 disabled:cursor-not-allowed
              text-base leading-6
              border-none outline-none focus:outline-none focus:ring-0
              message-input-textarea
              scrollbar-hide
            "
            style={{
              minHeight: `${INPUT_MIN_ROWS * LINE_HEIGHT_PX}px`,
              overflowY: 'hidden',
            }}
          />
          {/* 发送/取消按钮 */}
          {isSending && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="
                p-2 rounded-full flex-shrink-0 touch-manipulation
                flex items-center justify-center
                bg-error-light hover:bg-red-600 active:scale-95 
                text-white
              "
              style={transitionStyle}
              title={t('chat.cancelRequest')}
            >
              <StopIcon className="w-5 h-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`
                p-2 rounded-full flex-shrink-0 touch-manipulation
                flex items-center justify-center
                ${canSend
                  ? 'bg-primary-500 hover:bg-primary-600 dark:bg-primary-500 dark:hover:bg-primary-600 active:scale-95 text-white'
                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-400 dark:text-neutral-500 cursor-not-allowed'
                }
              `}
              style={transitionStyle}
              title={t('chat.sendMessage')}
            >
              {isSending ? (
                <LoadingSpinner className="w-5 h-5" />
              ) : (
                <SendIcon className="w-5 h-5" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* 工具栏 - 移到输入框下方 - Requirements: 7.2, 7.3 */}
      {showExtendedToolbar && (
        <InputToolbar
          onImageClick={handleImageClick}
          onFileClick={handleFileClick}
          isDisabled={isDisabled}
          reducedMotion={reducedMotion}
          filesApiEnabled={filesApiEnabled}
          onFilesApiToggle={handleFilesApiToggle}
          webSearchEnabled={webSearchEnabled}
          onWebSearchToggle={onWebSearchToggle}
          urlContextEnabled={urlContextEnabled}
          onUrlContextToggle={onUrlContextToggle}
          imageSearchEnabled={imageSearchEnabled}
          onImageSearchToggle={onImageSearchToggle}
          modelCapabilities={modelCapabilities}
          showImageConfig={showImageConfig}
          imageConfig={imageConfig}
          onImageConfigChange={onImageConfigChange}
          supportsImageSize={supportsImageSize}
          streamingEnabled={streamingEnabled}
          onStreamingToggle={onStreamingToggle}
          includeThoughts={includeThoughts}
          onThoughtsToggle={onThoughtsToggle}
          thinkingLevel={thinkingLevel}
          onThinkingLevelChange={onThinkingLevelChange}
          thinkingBudget={thinkingBudget}
          onThinkingBudgetChange={onThinkingBudgetChange}
        />
      )}

      {/* 隐藏的文件输入 */}
      <input
        ref={imageInputRef}
        type="file"
        accept={filesApiEnabled
          ? "image/jpeg,image/png,image/webp,image/heic,image/heif"
          : "image/jpeg,image/png,image/webp,image/gif"
        }
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={filesApiEnabled
          ? ".pdf,.txt,.js,.ts,.jsx,.tsx,.py,.java,.css,.html,.json,.xml,.md,.mp3,.wav,.aiff,.aac,.ogg,.flac,.mp4,.mpeg,.mov,.avi,.flv,.webm,.wmv,.3gp,.png,.jpg,.jpeg,.webp,.heic,.heif,.csv"
          : ".pdf,.txt,.js,.ts,.jsx,.tsx,.py,.java,.css,.html,.json,.xml,.md"
        }
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />
    </div>
  );
}

export default MessageInput;
