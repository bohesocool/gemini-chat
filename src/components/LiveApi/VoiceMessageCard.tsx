/**
 * 语音消息卡片组件
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1
 * 
 * 类似微信语音条的设计，支持播放/停止、进度显示
 */

import { useCallback, useMemo } from 'react';
import type { LiveVoiceMessage } from '../../types/liveApi';
import { TranscriptText } from './TranscriptText';

/**
 * 语音消息卡片属性
 */
export interface VoiceMessageCardProps {
  /** 语音消息数据 */
  message: LiveVoiceMessage;
  /** 是否正在播放 */
  isPlaying: boolean;
  /** 播放进度 (0-1) */
  playProgress: number;
  /** 播放回调 */
  onPlay: () => void;
  /** 停止回调 */
  onStop: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 格式化时长显示
 * @param durationMs 时长（毫秒）
 * @returns 格式化的时长字符串，如 "5''" 或 "1'30''"
 */
function formatDuration(durationMs: number): string {
  const totalSeconds = Math.round(durationMs / 1000);
  if (totalSeconds < 60) {
    return `${totalSeconds}''`;
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}'${seconds.toString().padStart(2, '0')}''`;
}

/**
 * 获取语音条角色样式
 * 需求: 3.3 - 区分用户语音和 AI 语音的样式
 * 用于属性测试验证
 */
export function getVoiceMessageRoleStyles(role: 'user' | 'model'): {
  containerClass: string;
  bubbleClass: string;
  waveClass: string;
  durationClass: string;
} {
  if (role === 'user') {
    return {
      containerClass: 'voice-message-user items-end',
      bubbleClass: 'bg-primary-500 hover:bg-primary-600',
      waveClass: 'text-white/80',
      durationClass: 'text-primary-200',
    };
  }
  return {
    containerClass: 'voice-message-model items-start',
    bubbleClass: 'bg-neutral-200 dark:bg-neutral-700 hover:bg-neutral-300 dark:hover:bg-neutral-600',
    waveClass: 'text-neutral-500 dark:text-neutral-400',
    durationClass: 'text-neutral-500 dark:text-neutral-400',
  };
}

/**
 * 语音消息卡片组件
 * 需求: 3.1 - 显示为可点击的语音条样式
 */
export function VoiceMessageCard({
  message,
  isPlaying,
  playProgress,
  onPlay,
  onStop,
  className = '',
}: VoiceMessageCardProps): JSX.Element {
  const { id, role, durationMs, transcript, audioBlob } = message;
  const isUser = role === 'user';

  // 获取角色样式
  const styles = useMemo(() => getVoiceMessageRoleStyles(role), [role]);

  // 处理点击事件
  // 需求: 3.4, 3.6 - 点击播放/停止
  const handleClick = useCallback(() => {
    if (!audioBlob) return;
    if (isPlaying) {
      onStop();
    } else {
      onPlay();
    }
  }, [audioBlob, isPlaying, onPlay, onStop]);

  // 计算语音条宽度（根据时长，最小 60px，最大 200px）
  const bubbleWidth = useMemo(() => {
    const seconds = durationMs / 1000;
    // 每秒增加 15px，基础宽度 60px
    const width = Math.min(200, Math.max(60, 60 + seconds * 15));
    return `${width}px`;
  }, [durationMs]);

  // 格式化时长
  // 需求: 3.2 - 显示语音时长
  const formattedDuration = useMemo(() => formatDuration(durationMs), [durationMs]);

  return (
    <div
      className={`flex flex-col gap-1 ${styles.containerClass} ${className}`}
      data-testid={`voice-message-${id}`}
      data-role={role}
    >
      {/* 角色标签和时间 */}
      <div className={`flex items-center gap-2 text-xs ${isUser ? 'flex-row-reverse' : ''}`}>
        <span
          className={`font-medium ${
            isUser
              ? 'text-primary-600 dark:text-primary-400'
              : 'text-purple-600 dark:text-purple-400'
          }`}
        >
          {isUser ? '你' : 'AI'}
        </span>
        <span className="text-neutral-400 dark:text-neutral-500">
          {new Date(message.timestamp).toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      {/* 语音条 */}
      {/* 需求: 3.1 - 可点击的语音条样式 */}
      <button
        onClick={handleClick}
        disabled={!audioBlob}
        className={`
          relative flex items-center gap-2 px-3 py-2 rounded-2xl
          transition-colors cursor-pointer
          ${isUser ? 'rounded-br-md' : 'rounded-bl-md'}
          ${styles.bubbleClass}
          ${!audioBlob ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        style={{ width: bubbleWidth }}
        data-testid={`voice-bubble-${id}`}
      >
        {/* 播放进度背景 */}
        {/* 需求: 3.5 - 播放进度动画 */}
        {isPlaying && (
          <div
            className="absolute inset-0 bg-black/10 dark:bg-white/10 rounded-2xl transition-all"
            style={{
              width: `${playProgress * 100}%`,
              borderRadius: 'inherit',
            }}
            data-testid={`voice-progress-${id}`}
          />
        )}

        {/* 播放/停止图标 */}
        <div className={`relative z-10 ${styles.waveClass}`}>
          {isPlaying ? (
            <StopIcon className="w-4 h-4" />
          ) : (
            <PlayIcon className="w-4 h-4" />
          )}
        </div>

        {/* 声波动画 */}
        <div className={`relative z-10 flex items-center gap-0.5 flex-1 ${styles.waveClass}`}>
          {isPlaying ? (
            // 播放中的动画声波
            <PlayingWaveAnimation />
          ) : (
            // 静态声波
            <StaticWave />
          )}
        </div>

        {/* 时长显示 */}
        {/* 需求: 3.2 */}
        <span
          className={`relative z-10 text-xs font-medium ${
            isUser ? 'text-white/90' : styles.durationClass
          }`}
          data-testid={`voice-duration-${id}`}
        >
          {formattedDuration}
        </span>
      </button>

      {/* 转录文字 */}
      {/* 需求: 4.1 - 显示在语音条下方 */}
      <div className={`max-w-[200px] ${isUser ? 'text-right' : 'text-left'}`}>
        <TranscriptText text={transcript} maxLines={2} />
      </div>
    </div>
  );
}

/**
 * 播放图标
 */
function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

/**
 * 停止图标
 */
function StopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  );
}

/**
 * 静态声波
 */
function StaticWave() {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[3, 5, 7, 5, 8, 4, 6, 5, 3].map((height, i) => (
        <div
          key={i}
          className="w-0.5 bg-current rounded-full opacity-60"
          style={{ height: `${height * 1.5}px` }}
        />
      ))}
    </div>
  );
}

/**
 * 播放中的声波动画
 */
function PlayingWaveAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
        <div
          key={i}
          className="w-0.5 bg-current rounded-full animate-wave"
          style={{
            animationDelay: `${i * 0.1}s`,
            height: '4px',
          }}
        />
      ))}
      <style>{`
        @keyframes wave {
          0%, 100% { height: 4px; }
          50% { height: 12px; }
        }
        .animate-wave {
          animation: wave 0.8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

export default VoiceMessageCard;
