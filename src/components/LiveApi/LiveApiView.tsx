/**
 * Live API 主视图组件 - 三栏布局
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 2.1, 6.1, 9.5
 * 
 * 三栏布局：
 * - 左侧：历史会话列表面板（可折叠）
 * - 中间：实时对话区域 / 历史查看区域
 * - 右侧：设置面板（可折叠）
 * 
 * "开始会话"按钮保持在底部控制面板中
 */

import { useCallback, useState, useEffect } from 'react';
import { useLiveStore } from '../../stores/live';
import { useLiveHistoryStore } from '../../stores/liveHistory';
import { LiveControlPanel } from './LiveControlPanel';
import { LiveConfigPanel } from './LiveConfigPanel';
import { TranscriptDisplay } from './TranscriptDisplay';
import { LiveSessionList } from './LiveSessionList';
import { LiveHistoryView } from './LiveHistoryView';

/**
 * 视图模式类型
 * - live: 实时对话视图
 * - history: 历史查看视图
 */
export type LiveViewMode = 'live' | 'history';

/**
 * Live API 主视图属性
 */
export interface LiveApiViewProps {
  /** 返回聊天视图回调 */
  onBackToChat?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 初始视图模式 */
  initialViewMode?: LiveViewMode;
}

/**
 * Live API 主视图组件 - 三栏布局
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6 - 三栏布局，左侧历史列表，中间对话，右侧设置
 */
export function LiveApiView({
  onBackToChat,
  className = '',
  initialViewMode = 'live',
}: LiveApiViewProps): JSX.Element {
  // 从 LiveStore 获取状态和操作
  const {
    connectionStatus,
    errorMessage,
    isMuted,
    currentSpeaker,
    inputLevel,
    outputLevel,
    outputVolume,
    transcripts,
    pendingInputTranscript,
    pendingOutputTranscript,
    config,
    pendingMessages,
    startSession,
    endSession,
    toggleMute,
    setOutputVolume,
    updateConfig,
    clearTranscripts,
    consumePendingMessages,
  } = useLiveStore();

  // 从 LiveHistoryStore 获取状态和操作
  const {
    sessions,
    isLoadingSessions,
    currentSession,
    currentSessionMessages,
    isLoadingSession,
    playingMessageId,
    playProgress,
    activeSessionId,
    loadSessions,
    selectSession,
    deleteSession,
    createSession,
    addVoiceMessage,
    updateTranscript,
    endActiveSession,
    playMessage,
    stopPlayback,
    clearCurrentSession,
  } = useLiveHistoryStore();

  // 视图模式状态（live 或 history）
  const [viewMode, setViewMode] = useState<LiveViewMode>(initialViewMode);

  // 左侧面板折叠状态
  // 需求: 1.3 - 左侧面板支持折叠/展开
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);

  // 右侧配置面板展开状态
  // 需求: 1.6 - 右侧面板支持折叠/展开
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);

  // 当前选中的会话 ID（用于左侧列表高亮）
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // 是否已连接
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // 加载会话列表
  // 需求: 1.2 - 进入 Live 视图时显示所有历史会话
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // 保存待处理的音频消息到历史记录
  // 需求: 2.1, 2.2 - 保存用户和 AI 的音频数据
  useEffect(() => {
    if (pendingMessages.length === 0 || !activeSessionId) {
      return;
    }

    // 获取并清除待保存的消息
    const messages = consumePendingMessages();

    // 异步保存每条消息
    const saveMessages = async () => {
      for (const msg of messages) {
        try {
          // 保存音频消息
          const messageId = await addVoiceMessage(
            msg.role,
            msg.audioData,
            msg.durationMs,
            msg.role === 'user' ? 'audio/pcm;rate=16000' : 'audio/pcm;rate=24000'
          );

          // 更新转录文字
          if (msg.transcript) {
            await updateTranscript(messageId, msg.transcript);
          }
        } catch (error) {
          console.error('保存音频消息失败:', error);
        }
      }
    };

    saveMessages();
  }, [pendingMessages, activeSessionId, consumePendingMessages, addVoiceMessage, updateTranscript]);

  // 处理开始会话
  // 需求: 1.7 - "开始会话"按钮在底部控制面板中
  const handleStartSession = useCallback(async () => {
    // 创建新会话记录
    await createSession(config);
    // 开始实时对话
    await startSession();
    // 切换到实时对话视图
    setViewMode('live');
    // 清除选中状态
    setSelectedSessionId(null);
  }, [createSession, config, startSession]);

  // 处理结束会话
  const handleEndSession = useCallback(() => {
    endSession();
    endActiveSession();
    // 重新加载会话列表
    loadSessions();
    // 保持在实时对话视图，但清除选中状态
    setSelectedSessionId(null);
  }, [endSession, endActiveSession, loadSessions]);

  // 处理清除转录
  const handleClearTranscripts = useCallback(() => {
    clearTranscripts();
  }, [clearTranscripts]);

  // 处理选择历史会话
  // 需求: 1.5 - 点击左侧历史会话，中间显示历史查看
  const handleSelectSession = useCallback(async (sessionId: string) => {
    await selectSession(sessionId);
    setSelectedSessionId(sessionId);
    setViewMode('history');
  }, [selectSession]);

  // 处理删除会话
  // 需求: 7.1 - 支持删除单个会话
  const handleDeleteSession = useCallback(async (sessionId: string) => {
    await deleteSession(sessionId);
  }, [deleteSession]);

  // 处理从历史视图返回实时对话
  // 需求: 6.5 - 点击"返回实时对话"返回实时对话界面
  const handleBackToLive = useCallback(() => {
    clearCurrentSession();
    setSelectedSessionId(null);
    setViewMode('live');
  }, [clearCurrentSession]);

  // 处理返回列表（兼容旧逻辑）
  const handleBackToList = useCallback(() => {
    clearCurrentSession();
    setSelectedSessionId(null);
    setViewMode('live');
  }, [clearCurrentSession]);

  // 三栏布局渲染
  // 需求: 1.1 - 三栏布局：左侧历史列表、中间对话区域、右侧设置面板
  return (
    <div className={`flex h-full bg-white dark:bg-neutral-900 ${className}`}>
      {/* 左侧面板 - 历史会话列表（可折叠） */}
      {/* 需求: 1.2, 1.3 - 显示历史会话，支持折叠 */}
      {!isLeftPanelCollapsed && (
        <aside className="w-64 flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 flex flex-col">
          {/* 左侧面板头部 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center gap-2">
              {onBackToChat && (
                <button
                  onClick={onBackToChat}
                  className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                  title="返回聊天"
                >
                  <BackIcon className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <LiveIcon className="w-5 h-5 text-primary-500" />
                <h1 className="text-base font-semibold text-neutral-800 dark:text-neutral-200">
                  实时对话
                </h1>
              </div>
            </div>
            {/* 折叠按钮 */}
            <button
              onClick={() => setIsLeftPanelCollapsed(true)}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 transition-colors"
              title="收起面板"
            >
              <CollapseLeftIcon className="w-4 h-4" />
            </button>
          </div>

          {/* 会话列表 */}
          <LiveSessionList
            sessions={sessions}
            selectedSessionId={selectedSessionId}
            isLoading={isLoadingSessions}
            onSelectSession={handleSelectSession}
            onDeleteSession={handleDeleteSession}
            className="flex-1"
          />
        </aside>
      )}

      {/* 左侧面板折叠时的展开按钮 */}
      {isLeftPanelCollapsed && (
        <div className="flex-shrink-0 border-r border-neutral-200 dark:border-neutral-700 flex flex-col items-center py-3 px-1">
          {onBackToChat && (
            <button
              onClick={onBackToChat}
              className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors mb-2"
              title="返回聊天"
            >
              <BackIcon className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => setIsLeftPanelCollapsed(false)}
            className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 dark:text-neutral-500 transition-colors"
            title="展开面板"
          >
            <CollapseRightIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 中间区域 - 对话/历史 */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {viewMode === 'history' ? (
          // 历史查看模式
          // 需求: 6.1, 6.2, 6.3, 6.4, 6.5 - 只读模式显示历史对话
          <LiveHistoryView
            session={currentSession}
            messages={currentSessionMessages}
            isLoading={isLoadingSession}
            playingMessageId={playingMessageId}
            playProgress={playProgress}
            onPlayMessage={playMessage}
            onStopPlayback={stopPlayback}
            onBackToLive={handleBackToLive}
            onBack={handleBackToList}
          />
        ) : (
          // 实时对话模式
          <>
            {/* 顶部标题栏 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                  {isConnected ? '对话中' : isConnecting ? '连接中...' : '准备就绪'}
                </span>
                {isConnected && (
                  <span className="w-2 h-2 rounded-full bg-primary-500 animate-pulse" />
                )}
              </div>

              {/* 右侧操作按钮 */}
              <div className="flex items-center gap-2">
                {/* 清除转录按钮 */}
                {transcripts.length > 0 && (
                  <button
                    onClick={handleClearTranscripts}
                    className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors"
                    title="清除转录"
                  >
                    <ClearIcon className="w-5 h-5" />
                  </button>
                )}

                {/* 配置面板切换按钮 */}
                <button
                  onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                  className={`
                    p-1.5 rounded-lg transition-colors
                    ${isConfigExpanded
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                      : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                    }
                  `}
                  title={isConfigExpanded ? '收起配置' : '展开配置'}
                >
                  <SettingsIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 转录显示 */}
            <TranscriptDisplay
              messages={transcripts}
              pendingInputTranscript={pendingInputTranscript}
              pendingOutputTranscript={pendingOutputTranscript}
              isUserSpeaking={currentSpeaker === 'user'}
              isAiSpeaking={currentSpeaker === 'model'}
              className="flex-1"
            />

            {/* 控制面板 - 包含"开始会话"按钮 */}
            {/* 需求: 1.7 - "开始会话"按钮在底部控制面板中 */}
            <div className="border-t border-neutral-200 dark:border-neutral-700">
              <LiveControlPanel
                connectionStatus={connectionStatus}
                isMuted={isMuted}
                currentSpeaker={currentSpeaker}
                inputLevel={inputLevel}
                outputLevel={outputLevel}
                outputVolume={outputVolume}
                errorMessage={errorMessage}
                onStartSession={handleStartSession}
                onEndSession={handleEndSession}
                onToggleMute={toggleMute}
                onVolumeChange={setOutputVolume}
              />
            </div>
          </>
        )}
      </main>

      {/* 右侧面板 - 设置（可折叠） */}
      {/* 需求: 1.6 - 右侧面板支持折叠/展开 */}
      {isConfigExpanded && viewMode === 'live' && (
        <aside className="w-80 flex-shrink-0 border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto custom-scrollbar bg-neutral-50 dark:bg-neutral-800/50">
          <LiveConfigPanel
            config={config}
            onConfigChange={updateConfig}
            disabled={isConnected || isConnecting}
          />
        </aside>
      )}
    </div>
  );
}

// ============ 图标组件 ============

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  );
}

function LiveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function ClearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// 折叠到左侧图标
function CollapseLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14V5" />
    </svg>
  );
}

// 展开到右侧图标
function CollapseRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M6 5v14" />
    </svg>
  );
}

export default LiveApiView;
