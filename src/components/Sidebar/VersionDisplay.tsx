/**
 * 版本显示组件
 * 显示在侧边栏底部，点击可检查更新
 * 需求: 1.1, 1.2, 1.3
 */

import { useState, useCallback } from 'react';
import { getAppVersion, formatVersion } from '../../services/version';
import { checkForUpdates, UpdateCheckResult, UpdateStatus } from '../../services/updateChecker';

export interface VersionDisplayProps {
  /** 点击版本号的回调 */
  onCheckUpdate?: () => void;
}

/**
 * 版本显示组件
 * 显示当前版本号，点击可检查更新
 */
export function VersionDisplay({ onCheckUpdate }: VersionDisplayProps) {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);

  const appVersion = getAppVersion();
  const formattedVersion = formatVersion(appVersion.version);

  // 处理点击检查更新
  const handleClick = useCallback(async () => {
    // 如果正在检查中，不重复触发
    if (updateStatus === 'checking') return;

    // 调用外部回调
    onCheckUpdate?.();

    // 开始检查更新
    setUpdateStatus('checking');
    setUpdateResult(null);

    try {
      const result = await checkForUpdates(appVersion.version);
      setUpdateStatus(result.status);
      setUpdateResult(result);
    } catch {
      setUpdateStatus('error');
      setUpdateResult({
        status: 'error',
        error: '检查更新失败',
      });
    }
  }, [appVersion.version, updateStatus, onCheckUpdate]);

  // 渲染状态指示器
  const renderStatusIndicator = () => {
    switch (updateStatus) {
      case 'checking':
        return (
          <span className="ml-1.5 inline-flex items-center">
            <LoadingSpinner className="h-3 w-3 text-primary-500" />
          </span>
        );
      case 'available':
        return (
          <span className="ml-1.5 inline-flex items-center text-amber-500" title={`新版本: ${updateResult?.updateInfo?.latestVersion}`}>
            <UpdateIcon className="h-3 w-3" />
          </span>
        );
      case 'latest':
        return (
          <span className="ml-1.5 inline-flex items-center text-green-500" title="已是最新版本">
            <CheckIcon className="h-3 w-3" />
          </span>
        );
      case 'error':
        return (
          <span className="ml-1.5 inline-flex items-center text-red-500" title={updateResult?.error || '检查失败'}>
            <ErrorIcon className="h-3 w-3" />
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={updateStatus === 'checking'}
      className="inline-flex items-center text-xs text-neutral-500 dark:text-neutral-400 
                 hover:text-primary-500 dark:hover:text-primary-400 
                 transition-colors duration-200 cursor-pointer
                 disabled:cursor-wait"
      title="点击检查更新"
      aria-label={`当前版本 ${formattedVersion}，点击检查更新`}
    >
      <span data-testid="version-text">{formattedVersion}</span>
      {renderStatusIndicator()}
    </button>
  );
}

/**
 * 加载动画图标
 */
function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * 更新可用图标
 */
function UpdateIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

/**
 * 检查成功图标
 */
function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

/**
 * 错误图标
 */
function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default VersionDisplay;
