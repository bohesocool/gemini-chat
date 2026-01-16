/**
 * Live API 主视图组件
 * 需求: 2.1, 9.5
 * 
 * 集成控制面板、配置面板、转录显示，实现响应式布局，连接 LiveStore
 */

import { useCallback, useState } from 'react';
import { useLiveStore } from '../../stores/live';
import { LiveControlPanel } from './LiveControlPanel';
import { LiveConfigPanel } from './LiveConfigPanel';
import { TranscriptDisplay } from './TranscriptDisplay';

/**
 * Live API 主视图属性
 */
export interface LiveApiViewProps {
  /** 返回聊天视图回调 */
  onBackToChat?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * Live API 主视图组件
 */
export function LiveApiView({
  onBackToChat,
  className = '',
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
    startSession,
    endSession,
    toggleMute,
    setOutputVolume,
    updateConfig,
    clearTranscripts,
  } = useLiveStore();

  // 配置面板展开状态
  const [isConfigExpanded, setIsConfigExpanded] = useState(true);

  // 是否已连接
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';

  // 处理开始会话
  const handleStartSession = useCallback(async () => {
    await startSession();
  }, [startSession]);

  // 处理结束会话
  const handleEndSession = useCallback(() => {
    endSession();
  }, [endSession]);

  // 处理清除转录
  const handleClearTranscripts = useCallback(() => {
    clearTranscripts();
  }, [clearTranscripts]);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-neutral-900 ${className}`}>
      {/* 顶部标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 dark:border-neutral-700">
        <div className="flex items-center gap-3">
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
            <h1 className="text-lg font-semibold text-neutral-800 dark:text-neutral-200">
              实时对话
            </h1>
          </div>
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

      {/* 主内容区域 - 响应式布局 */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        {/* 左侧：转录显示区域 */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* 转录显示 */}
          <TranscriptDisplay
            messages={transcripts}
            pendingInputTranscript={pendingInputTranscript}
            pendingOutputTranscript={pendingOutputTranscript}
            isUserSpeaking={currentSpeaker === 'user'}
            isAiSpeaking={currentSpeaker === 'model'}
            className="flex-1"
          />

          {/* 控制面板 */}
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
        </div>

        {/* 右侧：配置面板（可折叠） */}
        {isConfigExpanded && (
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-neutral-200 dark:border-neutral-700 overflow-y-auto custom-scrollbar bg-neutral-50 dark:bg-neutral-800/50">
            <LiveConfigPanel
              config={config}
              onConfigChange={updateConfig}
              disabled={isConnected || isConnecting}
            />
          </div>
        )}
      </div>
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

export default LiveApiView;
