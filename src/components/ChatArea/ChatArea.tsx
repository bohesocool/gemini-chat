/**
 * 聊天区域主组件
 * 集成顶部工具栏、子话题标签、消息列表和输入
 * 
 * Requirements: 4.1, 5.1, 5.2, 5.3, 5.4, 6.1, 7.5, 1.1, 1.2, 1.3
 */

import { useState, useCallback } from 'react';
import { useChatWindowStore } from '../../stores/chatWindow';
import { useSettingsStore } from '../../stores/settings';
import { useModelStore } from '../../stores/model';
import { ChatHeader } from './ChatHeader';
import { SubTopicTabs } from './SubTopicTabs';
import { ChatConfigPanel } from './ChatConfigPanel';
import { VirtualMessageList } from './VirtualMessageList';
import { MessageInput } from '../MessageInput';
import { MarkdownRenderer } from '../MarkdownRenderer';
import type { ChatWindowConfig } from '../../types/chatWindow';
import type { Attachment, ImageGenerationConfig, ThinkingLevel } from '../../types/models';
import type { FileReference } from '../../types/filesApi';
import { DEFAULT_IMAGE_GENERATION_CONFIG } from '../../types/models';
import { resolveStreamingEnabled } from '../../services/streaming';

// ============ 类型定义 ============

export interface ChatAreaProps {
  /** 聊天窗口 ID（可选，默认使用当前活动窗口） */
  windowId?: string;
}

// ============ 主组件 ============

/**
 * 聊天区域主组件
 * 
 * Requirements:
 * - 4.1: 聊天窗口独立配置
 * - 5.1: 子话题对话管理
 * - 6.1: 聊天窗口内置配置面板
 * - 7.5: 移除 ModelParamsBar 组件
 */
export function ChatArea({ windowId: propWindowId }: ChatAreaProps) {
  const [isConfigPanelOpen, setIsConfigPanelOpen] = useState(false);
  const [regeneratingMessageId, setRegeneratingMessageId] = useState<string | null>(null);

  // 从 store 获取状态
  const {
    windows,
    activeWindowId,
    isSending,
    streamingText,
    streamingThought,
    error,
    sendMessage,
    cancelRequest,
    createSubTopic,
    deleteSubTopic,
    selectSubTopic,
    updateSubTopic,
    updateWindowConfig,
    updateAdvancedConfig,
    regenerateMessage,
    editMessage,
    updateMessageError,
    retryUserMessage,
    deleteMessage,
    updateMessageContent,
  } = useChatWindowStore();

  const { apiEndpoint, apiKey } = useSettingsStore();

  // 获取模型能力 - 需求: 4.6
  const getEffectiveCapabilities = useModelStore(state => state.getEffectiveCapabilities);
  
  // 获取模型列表 - 需求: 1.2
  const models = useModelStore(state => state.models);

  // 获取全局设置用于解析流式设置
  const getFullSettings = useSettingsStore(state => state.getFullSettings);

  // 确定当前窗口 ID
  const currentWindowId = propWindowId || activeWindowId;
  
  // 获取当前窗口
  const currentWindow = currentWindowId
    ? windows.find((w) => w.id === currentWindowId)
    : null;

  // 获取当前子话题
  const currentSubTopic = currentWindow
    ? currentWindow.subTopics.find((st) => st.id === currentWindow.activeSubTopicId)
    : null;

  // 处理发送消息
  // 需求: 3.3, 4.1, 4.2, 4.3 - 支持文件引用
  const handleSendMessage = useCallback(
    async (content: string, attachments?: Attachment[], fileReferences?: FileReference[]) => {
      if (!currentWindowId || !currentWindow) return;

      const subTopicId = currentWindow.activeSubTopicId;
      
      // 发送消息，包含文件引用
      await sendMessage(
        currentWindowId,
        subTopicId,
        content,
        attachments,
        {
          endpoint: apiEndpoint,
          apiKey: apiKey,
          model: currentWindow.config.model,
        },
        undefined, // advancedConfig
        fileReferences // 传递文件引用
      );
    },
    [currentWindowId, currentWindow, sendMessage, apiEndpoint, apiKey]
  );

  // 处理创建子话题
  const handleCreateSubTopic = useCallback(() => {
    if (!currentWindowId) return;
    createSubTopic(currentWindowId);
  }, [currentWindowId, createSubTopic]);

  // 处理删除子话题
  const handleDeleteSubTopic = useCallback(
    (subTopicId: string) => {
      if (!currentWindowId) return;
      deleteSubTopic(currentWindowId, subTopicId);
    },
    [currentWindowId, deleteSubTopic]
  );

  // 处理选择子话题
  const handleSelectSubTopic = useCallback(
    (subTopicId: string) => {
      if (!currentWindowId) return;
      selectSubTopic(currentWindowId, subTopicId);
    },
    [currentWindowId, selectSubTopic]
  );

  // 处理重命名子话题
  const handleRenameSubTopic = useCallback(
    (subTopicId: string, newTitle: string) => {
      if (!currentWindowId) return;
      updateSubTopic(currentWindowId, subTopicId, { title: newTitle });
    },
    [currentWindowId, updateSubTopic]
  );

  // 处理配置更新
  const handleConfigChange = useCallback(
    (config: Partial<ChatWindowConfig>) => {
      if (!currentWindowId) return;
      updateWindowConfig(currentWindowId, config);
    },
    [currentWindowId, updateWindowConfig]
  );

  // 处理模型变更 - 需求: 1.3
  const handleModelChange = useCallback(
    (modelId: string) => {
      if (!currentWindowId) return;
      updateWindowConfig(currentWindowId, { model: modelId });
    },
    [currentWindowId, updateWindowConfig]
  );

  // 处理联网搜索切换 - 需求: 联网搜索
  const handleWebSearchToggle = useCallback(() => {
    if (!currentWindowId || !currentWindow) return;
    updateWindowConfig(currentWindowId, {
      webSearchEnabled: !currentWindow.config.webSearchEnabled,
    });
  }, [currentWindowId, currentWindow, updateWindowConfig]);

  // 处理 URL 上下文切换 - 需求: 1.2, 5.2
  const handleUrlContextToggle = useCallback(() => {
    if (!currentWindowId || !currentWindow) return;
    updateWindowConfig(currentWindowId, {
      urlContextEnabled: !currentWindow.config.urlContextEnabled,
    });
  }, [currentWindowId, currentWindow, updateWindowConfig]);

  // 获取当前图片配置 - 需求: 5.2
  const currentImageConfig: ImageGenerationConfig = currentWindow?.config.advancedConfig?.imageConfig || DEFAULT_IMAGE_GENERATION_CONFIG;

  // 获取当前模型能力 - 需求: 4.6
  const currentModelCapabilities = currentWindow
    ? getEffectiveCapabilities(currentWindow.config.model)
    : undefined;

  // 获取流式设置 - 需求: 4.1
  const streamingEnabled = currentWindow
    ? resolveStreamingEnabled(currentWindow.config, getFullSettings())
    : true;

  // 获取思维链设置 - 需求: 4.2
  const includeThoughts = currentWindow?.config.advancedConfig?.includeThoughts;

  // 获取思考程度 - 需求: 4.3
  const thinkingLevel = currentWindow?.config.advancedConfig?.thinkingLevel;

  // 获取思考预算 - 需求: 4.3
  const thinkingBudget = currentWindow?.config.advancedConfig?.thinkingBudget;

  // 处理图片配置变更 - 需求: 5.1
  const handleImageConfigChange = useCallback(
    (config: Partial<ImageGenerationConfig>) => {
      if (!currentWindowId) return;
      updateAdvancedConfig(currentWindowId, {
        imageConfig: config as ImageGenerationConfig,
      });
    },
    [currentWindowId, updateAdvancedConfig]
  );

  // 处理流式输出切换 - 需求: 4.1
  const handleStreamingToggle = useCallback(() => {
    if (!currentWindowId || !currentWindow) return;
    // 切换窗口级别的流式设置
    updateWindowConfig(currentWindowId, {
      streamingEnabled: !streamingEnabled,
    });
  }, [currentWindowId, currentWindow, streamingEnabled, updateWindowConfig]);

  // 处理思维链切换 - 需求: 4.2
  const handleThoughtsToggle = useCallback(() => {
    if (!currentWindowId) return;
    updateAdvancedConfig(currentWindowId, {
      includeThoughts: !includeThoughts,
    });
  }, [currentWindowId, includeThoughts, updateAdvancedConfig]);

  // 处理思考程度变更 - 需求: 4.3
  const handleThinkingLevelChange = useCallback((level: ThinkingLevel) => {
    if (!currentWindowId) return;
    updateAdvancedConfig(currentWindowId, {
      thinkingLevel: level,
    });
  }, [currentWindowId, updateAdvancedConfig]);

  // 处理思考预算变更 - 需求: 4.3
  const handleThinkingBudgetChange = useCallback((budget: number) => {
    if (!currentWindowId) return;
    updateAdvancedConfig(currentWindowId, {
      thinkingBudget: budget,
    });
  }, [currentWindowId, updateAdvancedConfig]);

  // 打开配置面板
  const handleOpenConfig = useCallback(() => {
    setIsConfigPanelOpen(true);
  }, []);

  // 关闭配置面板
  const handleCloseConfig = useCallback(() => {
    setIsConfigPanelOpen(false);
  }, []);

  // 处理重新生成消息
  const handleRegenerateMessage = useCallback(
    async (messageId: string) => {
      if (!currentWindowId || !currentWindow) return;

      setRegeneratingMessageId(messageId);
      try {
        await regenerateMessage(currentWindowId, currentWindow.activeSubTopicId, messageId);
      } finally {
        setRegeneratingMessageId(null);
      }
    },
    [currentWindowId, currentWindow, regenerateMessage]
  );

  // 处理编辑消息 - 需求: 1.4, 1.5
  const handleEditMessage = useCallback(
    async (messageId: string, newContent: string, resend: boolean) => {
      if (!currentWindowId || !currentWindow) return;

      const subTopicId = currentWindow.activeSubTopicId;
      
      if (resend) {
        // 保存并重新发送：editMessage 内部会截断消息并调用 sendMessage
        // 不需要再调用 regenerateMessage，因为 editMessage 已经处理了重新发送
        await editMessage(currentWindowId, subTopicId, messageId, newContent);
      } else {
        // 仅保存：只更新消息内容，不重新发送
        await updateMessageContent(currentWindowId, subTopicId, messageId, newContent);
      }
    },
    [currentWindowId, currentWindow, editMessage, updateMessageContent]
  );

  // 处理重试（消息级别错误后重新发送）
  const handleRetry = useCallback(async (messageId: string) => {
    if (!currentWindowId || !currentWindow || !currentSubTopic) return;
    
    // 找到对应的消息
    const message = currentSubTopic.messages.find(m => m.id === messageId);
    if (!message) return;
    
    // 先清除消息的错误状态
    await updateMessageError(currentWindowId, currentWindow.activeSubTopicId, messageId, null);
    
    if (message.role === 'model') {
      // 如果是 AI 消息，重新生成它
      setRegeneratingMessageId(messageId);
      try {
        await regenerateMessage(currentWindowId, currentWindow.activeSubTopicId, messageId);
      } finally {
        setRegeneratingMessageId(null);
      }
    } else {
      // 如果是用户消息（说明 AI 还没回复就出错了）
      // 使用 retryUserMessage 重试，不创建新的用户消息
      await retryUserMessage(currentWindowId, currentWindow.activeSubTopicId, messageId);
    }
  }, [currentWindowId, currentWindow, currentSubTopic, updateMessageError, regenerateMessage, retryUserMessage]);

  // 处理关闭错误提示（消息级别）
  const handleDismissError = useCallback(async (messageId: string) => {
    if (!currentWindowId || !currentWindow) return;
    await updateMessageError(currentWindowId, currentWindow.activeSubTopicId, messageId, null);
  }, [currentWindowId, currentWindow, updateMessageError]);

  // 处理删除消息
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    if (!currentWindowId || !currentWindow) return;
    await deleteMessage(currentWindowId, currentWindow.activeSubTopicId, messageId);
  }, [currentWindowId, currentWindow, deleteMessage]);



  // 渲染 Markdown 内容
  const renderContent = useCallback((content: string) => {
    return <MarkdownRenderer content={content} />;
  }, []);

  // 如果没有选中窗口，显示空状态（居中显示）
  if (!currentWindow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-neutral-900">
        <EmptyWindowState />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-neutral-900 overflow-hidden">
      {/* 顶部工具栏（简化版） - Requirements: 6.1, 6.2, 6.3, 1.1, 1.2, 1.3 */}
      <ChatHeader
        windowId={currentWindow.id}
        title={currentWindow.title}
        onOpenConfig={handleOpenConfig}
        currentModel={currentWindow.config.model}
        models={models}
        onModelChange={handleModelChange}
        messages={currentSubTopic?.messages || []}
      />

      {/* 子话题标签栏 - Requirements: 5.1 */}
      <SubTopicTabs
        windowId={currentWindow.id}
        subTopics={currentWindow.subTopics}
        activeSubTopicId={currentWindow.activeSubTopicId}
        onSelect={handleSelectSubTopic}
        onCreate={handleCreateSubTopic}
        onDelete={handleDeleteSubTopic}
        onRename={handleRenameSubTopic}
      />

      {/* 虚拟滚动消息列表 - Requirements: 1.1, 5.2, 5.3, 3.3, 3.4 */}
      <VirtualMessageList
        messages={currentSubTopic?.messages || []}
        isSending={isSending}
        streamingText={streamingText}
        streamingThought={streamingThought}
        error={error}
        onRetry={handleRetry}
        onDismissError={handleDismissError}
        renderContent={renderContent}
        onRegenerateMessage={handleRegenerateMessage}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        regeneratingMessageId={regeneratingMessageId}
        windowId={currentWindow.id}
        subTopicId={currentSubTopic?.id}
        windowTitle={currentWindow.title}
      />

      {/* 消息输入 - Requirements: 5.1, 5.4, 联网搜索, 图片配置, 状态指示器, URL 上下文 */}
      {/* 注意：已移除 ModelParamsBar 组件 - Requirements: 7.5 */}
      <MessageInput
        onSend={handleSendMessage}
        onCancel={cancelRequest}
        isSending={isSending}
        disabled={!apiKey}
        placeholder={
          !apiKey
            ? '请先在设置中配置 API 密钥'
            : '输入消息... (Enter 发送, Shift+Enter 换行)'
        }
        webSearchEnabled={currentWindow.config.webSearchEnabled}
        onWebSearchToggle={handleWebSearchToggle}
        urlContextEnabled={currentWindow.config.urlContextEnabled}
        onUrlContextToggle={handleUrlContextToggle}
        currentModel={currentWindow.config.model}
        imageConfig={currentImageConfig}
        onImageConfigChange={handleImageConfigChange}
        streamingEnabled={streamingEnabled}
        onStreamingToggle={handleStreamingToggle}
        includeThoughts={includeThoughts}
        onThoughtsToggle={handleThoughtsToggle}
        thinkingLevel={thinkingLevel}
        onThinkingLevelChange={handleThinkingLevelChange}
        thinkingBudget={thinkingBudget}
        onThinkingBudgetChange={handleThinkingBudgetChange}
        modelCapabilities={currentModelCapabilities}
      />

      {/* 毛玻璃配置面板 - Requirements: 6.4, 6.5 */}
      <ChatConfigPanel
        isOpen={isConfigPanelOpen}
        onClose={handleCloseConfig}
        config={currentWindow.config}
        onConfigChange={handleConfigChange}
      />
    </div>
  );
}

/**
 * 空窗口状态组件 - 居中显示
 */
function EmptyWindowState() {
  const { createWindow } = useChatWindowStore();

  const handleCreateWindow = () => {
    createWindow();
  };

  return (
    <div className="text-center px-4">
      {/* Gemini 图标 - 使用主题色 */}
      <div className="
        w-20 h-20 mx-auto mb-6 rounded-2xl
        bg-gradient-to-br from-primary-400 to-primary-600
        flex items-center justify-center
        shadow-lg shadow-primary-500/30
      ">
        <GeminiIcon className="w-10 h-10 text-white" />
      </div>
      
      <h2 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100 mb-2">
        开始新程序
      </h2>
      
      <p className="text-neutral-500 dark:text-neutral-400 mb-6 max-w-sm mx-auto">
        选择一个现有的程序，或创建一个新的程序开始与 AI 交流
      </p>
      
      <button
        onClick={handleCreateWindow}
        className="
          inline-flex items-center gap-2 px-6 py-3
          bg-primary-500 hover:bg-primary-600 
          text-white font-medium rounded-xl
          shadow-md shadow-primary-500/30
          transition-all duration-200 hover:shadow-lg hover:shadow-primary-500/40
          active:scale-95
        "
      >
        <PlusIcon className="w-5 h-5" />
        新建程序
      </button>
    </div>
  );
}

// ============ 图标组件 ============

/**
 * Gemini 官方星形图标
 * 使用 SVG 格式的四角星形图标，与主题色协调
 * Requirements: 8.1, 8.2, 8.3
 */
function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 28 28" fill="none">
      {/* Gemini 官方四角星形图标 */}
      <path
        d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default ChatArea;
