/**
 * Live API 组件导出入口
 * 需求: 1.1
 * 
 * 导出所有 Live API 相关的 UI 组件
 */

// 主视图组件
export { LiveApiView } from './LiveApiView';
export type { LiveApiViewProps } from './LiveApiView';

// 控制面板组件
export { LiveControlPanel } from './LiveControlPanel';
export type { LiveControlPanelProps } from './LiveControlPanel';

// 配置面板组件
export { LiveConfigPanel } from './LiveConfigPanel';
export type { LiveConfigPanelProps } from './LiveConfigPanel';

// 转录显示组件
export { TranscriptDisplay, getMessageRoleClassName } from './TranscriptDisplay';
export type { TranscriptDisplayProps } from './TranscriptDisplay';

// 屏幕预览组件
export { ScreenPreview } from './ScreenPreview';
export type { ScreenPreviewProps } from './ScreenPreview';

// 连接状态组件
export { 
  ConnectionStatus, 
  CompactConnectionStatus, 
  ConnectionStatusBadge 
} from './ConnectionStatus';
export type { 
  ConnectionStatusProps, 
  CompactConnectionStatusProps, 
  ConnectionStatusBadgeProps 
} from './ConnectionStatus';

// 音频电平指示器组件
export { 
  AudioLevelIndicator, 
  CircularAudioLevel, 
  WaveformAudioLevel 
} from './AudioLevelIndicator';
export type { 
  AudioLevelIndicatorProps, 
  CircularAudioLevelProps, 
  WaveformAudioLevelProps 
} from './AudioLevelIndicator';

// 历史记录相关组件
export { TranscriptText } from './TranscriptText';
export type { TranscriptTextProps } from './TranscriptText';

export { VoiceMessageCard, getVoiceMessageRoleStyles } from './VoiceMessageCard';
export type { VoiceMessageCardProps } from './VoiceMessageCard';

export { LiveSessionList } from './LiveSessionList';
export type { LiveSessionListProps } from './LiveSessionList';

export { LiveHistoryView } from './LiveHistoryView';
export type { LiveHistoryViewProps } from './LiveHistoryView';
