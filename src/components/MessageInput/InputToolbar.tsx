/**
 * 输入框扩展工具栏组件
 * 从 MessageInput.tsx 拆分而来
 * 包含附件上传按钮、Files API 开关、联网搜索、URL 上下文、图片搜索、
 * 图片配置工具栏、状态指示器等快捷参数按钮区
 *
 * Requirements: 7.2, 7.3
 */

import { memo } from 'react';
import type { ImageGenerationConfig, ThinkingLevel, ModelCapabilities } from '../../types/models';
import { ImageConfigToolbar } from './ImageConfigToolbar';
import { StatusIndicators } from './StatusIndicators';
import { FilesApiToggle } from './FilesApiToggle';
import { ToolbarButton } from './ToolbarButton';
import { ImageIcon, PaperclipIcon, GlobeIcon, LinkIcon, ImageSearchIcon } from './icons';
import { useTranslation } from '@/i18n';

/**
 * InputToolbar 组件属性
 */
export interface InputToolbarProps {
  /** 点击上传图片按钮回调 */
  onImageClick: () => void;
  /** 点击上传文件按钮回调 */
  onFileClick: () => void;
  /** 是否禁用 */
  isDisabled: boolean;
  /** 是否启用减弱动画 */
  reducedMotion: boolean;
  /** 是否启用 Files API 模式 - 需求: 1.1, 1.3, 1.4 */
  filesApiEnabled: boolean;
  /** 切换 Files API 模式回调 - 需求: 1.3 */
  onFilesApiToggle: () => void;
  /** 是否启用联网搜索 - 需求: 联网搜索 */
  webSearchEnabled: boolean;
  /** 切换联网搜索回调 - 需求: 联网搜索 */
  onWebSearchToggle?: () => void;
  /** 是否启用 URL 上下文 - 需求: 1.2, 1.3 */
  urlContextEnabled: boolean;
  /** 切换 URL 上下文回调 - 需求: 1.2 */
  onUrlContextToggle?: () => void;
  /** 是否启用图片搜索 */
  imageSearchEnabled: boolean;
  /** 切换图片搜索回调 */
  onImageSearchToggle?: () => void;
  /** 模型能力 - 需求: 4.6 */
  modelCapabilities?: ModelCapabilities;
  /** 是否显示图片配置工具栏 - 需求: 1.1, 1.2, 1.3, 1.4 */
  showImageConfig: boolean;
  /** 当前图片配置 - 需求: 1.1, 1.2 */
  imageConfig?: ImageGenerationConfig;
  /** 图片配置变更回调 - 需求: 1.1, 1.2 */
  onImageConfigChange?: (config: Partial<ImageGenerationConfig>) => void;
  /** 是否支持图片分辨率设置 - 需求: 3.1, 3.4 */
  supportsImageSize: boolean;
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
}

/**
 * 输入框扩展工具栏
 * 使用 React.memo 包裹，隔离输入框打字时的重渲染范围
 */
export const InputToolbar = memo(function InputToolbar({
  onImageClick,
  onFileClick,
  isDisabled,
  reducedMotion,
  filesApiEnabled,
  onFilesApiToggle,
  webSearchEnabled,
  onWebSearchToggle,
  urlContextEnabled,
  onUrlContextToggle,
  imageSearchEnabled,
  onImageSearchToggle,
  modelCapabilities,
  showImageConfig,
  imageConfig,
  onImageConfigChange,
  supportsImageSize,
  streamingEnabled = true,
  onStreamingToggle,
  includeThoughts,
  onThoughtsToggle,
  thinkingLevel,
  onThinkingLevelChange,
  thinkingBudget,
  onThinkingBudgetChange,
}: InputToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center gap-1 mt-2 pt-1">
      {/* 附件按钮 */}
      <ToolbarButton
        onClick={onImageClick}
        disabled={isDisabled}
        title={t('chat.uploadImage')}
        reducedMotion={reducedMotion}
      >
        <ImageIcon className="w-4 h-4" />
      </ToolbarButton>

      <ToolbarButton
        onClick={onFileClick}
        disabled={isDisabled}
        title={t('chat.uploadFile')}
        reducedMotion={reducedMotion}
      >
        <PaperclipIcon className="w-4 h-4" />
      </ToolbarButton>

      {/* Files API 开关 - 需求: 1.1, 1.3, 1.4 */}
      <FilesApiToggle
        enabled={filesApiEnabled}
        onToggle={onFilesApiToggle}
        disabled={isDisabled}
      />

      {/* 分隔线 */}
      <div className="w-px h-4 bg-neutral-200 dark:bg-neutral-700 mx-1" />

      {/* 联网搜索按钮 - 需求: 联网搜索 */}
      <ToolbarButton
        onClick={() => onWebSearchToggle?.()}
        disabled={isDisabled}
        title={webSearchEnabled ? t('chat.disableWebSearch') : t('chat.enableWebSearch')}
        active={webSearchEnabled}
        reducedMotion={reducedMotion}
      >
        <GlobeIcon className="w-4 h-4" />
      </ToolbarButton>

      {/* URL 上下文按钮 - 需求: 1.2, 1.3, 1.4 */}
      <ToolbarButton
        onClick={() => onUrlContextToggle?.()}
        disabled={isDisabled}
        title={urlContextEnabled ? t('chat.disableUrlContext') : t('chat.enableUrlContext')}
        active={urlContextEnabled}
        reducedMotion={reducedMotion}
      >
        <LinkIcon className="w-4 h-4" />
      </ToolbarButton>

      {/* 图片搜索按钮 */}
      {modelCapabilities?.supportsImageSearch && (
        <ToolbarButton
          onClick={() => onImageSearchToggle?.()}
          disabled={isDisabled}
          title={imageSearchEnabled ? t('chat.disableImageSearch') : t('chat.enableImageSearch')}
          active={imageSearchEnabled}
          reducedMotion={reducedMotion}
        >
          <ImageSearchIcon className="w-4 h-4" />
        </ToolbarButton>
      )}

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
            supportsExtendedAspectRatios={modelCapabilities?.supportsExtendedAspectRatios === true}
            supports512Resolution={modelCapabilities?.supports512Resolution === true}
          />
        </>
      )}

      {/* 状态指示器 - 需求: 4.1, 4.2, 4.3, 4.6, 2.1, 3.3 */}
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
            supportedThinkingLevels={modelCapabilities.supportedThinkingLevels}
          />
        </>
      )}

      <div className="flex-1" />

      {/* Files API 状态指示 - 需求: 1.6 */}
      {filesApiEnabled && (
        <span className="text-xs text-primary-500 dark:text-primary-400 hidden sm:inline">
          {t('chat.filesApiEnabled')}
        </span>
      )}

      {/* 联网搜索状态指示 */}
      {webSearchEnabled && (
        <span className="text-xs text-primary-500 dark:text-primary-400 hidden sm:inline">
          {t('chat.webSearchEnabled')}
        </span>
      )}

      {/* URL 上下文状态指示 - 需求: 1.3 */}
      {urlContextEnabled && (
        <span className="text-xs text-primary-500 dark:text-primary-400 hidden sm:inline">
          {t('chat.urlContextEnabled')}
        </span>
      )}

      {/* 图片搜索状态指示 */}
      {imageSearchEnabled && (
        <span className="text-xs text-primary-500 dark:text-primary-400 hidden sm:inline">
          {t('chat.imageSearchEnabled')}
        </span>
      )}

      {/* 提示文字 */}
      <span className="text-xs text-neutral-400 dark:text-neutral-500 hidden sm:inline">
        {t('chat.enterToSend')} · {t('chat.shiftEnterNewLine')}
      </span>
    </div>
  );
});

export default InputToolbar;
