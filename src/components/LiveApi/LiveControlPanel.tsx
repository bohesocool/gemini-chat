/**
 * Live API 控制面板组件
 * 需求: 2.2, 2.4, 3.6, 4.2, 9.2
 * 
 * 实现开始/结束会话按钮、静音按钮、音量滑块、当前说话方指示
 */


import type { ConnectionStatus, Speaker } from '../../types/liveApi';
import { ConnectionStatusBadge } from './ConnectionStatus';
import { AudioLevelIndicator, CircularAudioLevel } from './AudioLevelIndicator';

/**
 * 控制面板属性
 */
export interface LiveControlPanelProps {
  /** 连接状态 */
  connectionStatus: ConnectionStatus;
  /** 是否静音 */
  isMuted: boolean;
  /** 当前说话方 */
  currentSpeaker: Speaker;
  /** 输入音频电平 (0-1) */
  inputLevel: number;
  /** 输出音频电平 (0-1) */
  outputLevel: number;
  /** 输出音量 (0-1) */
  outputVolume: number;
  /** 错误消息 */
  errorMessage?: string | null;
  /** 开始会话回调 */
  onStartSession: () => void;
  /** 结束会话回调 */
  onEndSession: () => void;
  /** 切换静音回调 */
  onToggleMute: () => void;
  /** 设置音量回调 */
  onVolumeChange: (volume: number) => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * Live API 控制面板组件
 */
export function LiveControlPanel({
  connectionStatus,
  isMuted,
  currentSpeaker,
  inputLevel,
  outputLevel,
  outputVolume,
  errorMessage,
  onStartSession,
  onEndSession,
  onToggleMute,
  onVolumeChange,
  className = '',
}: LiveControlPanelProps): JSX.Element {
  const isConnected = connectionStatus === 'connected';
  const isConnecting = connectionStatus === 'connecting';
  const isDisconnected = connectionStatus === 'disconnected';
  const hasError = connectionStatus === 'error';

  return (
    <div className={`flex flex-col gap-4 p-4 ${className}`}>
      {/* 连接状态和说话方指示 */}
      <div className="flex items-center justify-between">
        <ConnectionStatusBadge status={connectionStatus} />

        {/* 当前说话方指示 - 需求: 9.2 */}
        {isConnected && (
          <SpeakerIndicator
            speaker={currentSpeaker}
            inputLevel={inputLevel}
            outputLevel={outputLevel}
          />
        )}
      </div>

      {/* 错误消息 */}
      {hasError && errorMessage && (
        <div className="px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{errorMessage}</p>
        </div>
      )}

      {/* 主控制按钮 - 需求: 2.2, 2.4 */}
      <div className="flex items-center gap-3">
        {/* 开始/结束会话按钮 */}
        {isDisconnected || hasError ? (
          <button
            onClick={onStartSession}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-xl font-medium transition-colors"
          >
            <PlayIcon className="w-5 h-5" />
            开始会话
          </button>
        ) : isConnecting ? (
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-yellow-500 text-white rounded-xl font-medium cursor-not-allowed"
          >
            <LoadingIcon className="w-5 h-5 animate-spin" />
            连接中...
          </button>
        ) : (
          <button
            onClick={onEndSession}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
          >
            <StopIcon className="w-5 h-5" />
            结束会话
          </button>
        )}

        {/* 静音按钮 - 需求: 3.6 */}
        {isConnected && (
          <button
            onClick={onToggleMute}
            className={`
              flex items-center justify-center w-12 h-12 rounded-xl transition-colors
              ${isMuted
                ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50'
                : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700'
              }
            `}
            title={isMuted ? '取消静音' : '静音'}
          >
            {isMuted ? <MicOffIcon className="w-5 h-5" /> : <MicIcon className="w-5 h-5" />}
          </button>
        )}
      </div>

      {/* 音频控制区域 */}
      {isConnected && (
        <div className="flex flex-col gap-3 pt-2 border-t border-neutral-200 dark:border-neutral-700">
          {/* 输入音频电平 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-12">输入</span>
            <div className="flex-1 flex items-center gap-2">
              <CircularAudioLevel
                level={inputLevel}
                isActive={!isMuted && currentSpeaker === 'user'}
                type="input"
                size="sm"
              />
              <AudioLevelIndicator
                level={inputLevel}
                isActive={!isMuted}
                type="input"
                barCount={8}
                className="flex-1"
              />
            </div>
          </div>

          {/* 输出音量控制 - 需求: 4.2 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-12">音量</span>
            <div className="flex-1 flex items-center gap-2">
              <button
                onClick={() => onVolumeChange(outputVolume > 0 ? 0 : 1)}
                className="text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                title={outputVolume > 0 ? '静音' : '取消静音'}
              >
                {outputVolume === 0 ? (
                  <VolumeOffIcon className="w-4 h-4" />
                ) : outputVolume < 0.5 ? (
                  <VolumeLowIcon className="w-4 h-4" />
                ) : (
                  <VolumeHighIcon className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={outputVolume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none
                  [&::-webkit-slider-thumb]:w-3
                  [&::-webkit-slider-thumb]:h-3
                  [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-primary-500
                  [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:transition-transform
                  [&::-webkit-slider-thumb]:hover:scale-125
                "
              />
              <span className="text-xs text-neutral-500 dark:text-neutral-400 w-8 text-right">
                {Math.round(outputVolume * 100)}%
              </span>
            </div>
          </div>

          {/* 输出音频电平 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 w-12">输出</span>
            <div className="flex-1 flex items-center gap-2">
              <CircularAudioLevel
                level={outputLevel}
                isActive={currentSpeaker === 'model'}
                type="output"
                size="sm"
              />
              <AudioLevelIndicator
                level={outputLevel}
                isActive={currentSpeaker === 'model'}
                type="output"
                barCount={8}
                className="flex-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * 说话方指示器属性
 */
interface SpeakerIndicatorProps {
  speaker: Speaker;
  inputLevel: number;
  outputLevel: number;
}

/**
 * 说话方指示器组件
 * 需求: 9.2
 */
function SpeakerIndicator({ speaker, inputLevel, outputLevel }: SpeakerIndicatorProps): JSX.Element {
  const getSpeakerInfo = () => {
    switch (speaker) {
      case 'user':
        return { text: '你正在说话', color: 'text-primary-600 dark:text-primary-400', level: inputLevel };
      case 'model':
        return { text: 'AI 正在说话', color: 'text-blue-600 dark:text-blue-400', level: outputLevel };
      default:
        return { text: '等待中', color: 'text-neutral-400 dark:text-neutral-500', level: 0 };
    }
  };

  const info = getSpeakerInfo();

  return (
    <div className="flex items-center gap-2">
      {speaker !== 'none' && (
        <span className={`w-2 h-2 rounded-full ${speaker === 'user' ? 'bg-primary-500' : 'bg-blue-500'} animate-pulse`} />
      )}
      <span className={`text-xs font-medium ${info.color}`}>
        {info.text}
      </span>
    </div>
  );
}

// ============ 图标组件 ============

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 6h12v12H6z" />
    </svg>
  );
}

function LoadingIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function MicIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
    </svg>
  );
}

function MicOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function VolumeOffIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
    </svg>
  );
}

function VolumeLowIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

function VolumeHighIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  );
}

export default LiveControlPanel;
