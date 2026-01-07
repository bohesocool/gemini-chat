/**
 * 关于面板组件
 * 显示应用信息、Logo、版本号、检查更新按钮和官方网站链接
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9
 */

import { useState, useCallback } from 'react';
import { APP_CONFIG } from '../../constants/app';
import { getAppVersion, formatVersion } from '../../services/version';
import { checkForUpdates, type UpdateStatus, type UpdateCheckResult } from '../../services/updateChecker';

/**
 * 关于面板组件
 * 显示应用信息、Logo、版本号、检查更新按钮和官方网站链接
 */
export function AboutPanel(): JSX.Element {
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>('idle');
  const [updateResult, setUpdateResult] = useState<UpdateCheckResult | null>(null);
  const [logoError, setLogoError] = useState(false);

  const appVersion = getAppVersion();
  const formattedVersion = formatVersion(appVersion.version);

  // 处理检查更新 - Requirements: 2.8, 3.1, 3.2, 3.3, 3.4
  const handleCheckUpdate = useCallback(async () => {
    setUpdateStatus('checking');
    setUpdateResult(null);

    try {
      const result = await checkForUpdates(appVersion.version);
      setUpdateResult(result);
      setUpdateStatus(result.status);
    } catch {
      setUpdateStatus('error');
      setUpdateResult({
        status: 'error',
        error: '检查更新时发生未知错误',
      });
    }
  }, [appVersion.version]);

  // 处理 Logo 加载失败
  const handleLogoError = useCallback(() => {
    setLogoError(true);
  }, []);

  // 渲染更新状态
  const renderUpdateStatus = () => {
    if (updateStatus === 'idle') {
      return null;
    }

    if (updateStatus === 'checking') {
      return (
        <div className="flex items-center gap-2 text-neutral-500 dark:text-neutral-400">
          <LoadingSpinner className="h-4 w-4" />
          <span className="text-sm">正在检查更新...</span>
        </div>
      );
    }

    if (updateStatus === 'available' && updateResult?.updateInfo) {
      return (
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <NewVersionIcon className="h-4 w-4" />
            <span className="text-sm">
              发现新版本: {updateResult.updateInfo.latestVersion}
            </span>
          </div>
          <a
            href={updateResult.updateInfo.downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
          >
            立即下载
          </a>
        </div>
      );
    }

    if (updateStatus === 'latest') {
      return (
        <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
          <CheckIcon className="h-4 w-4" />
          <span className="text-sm">已是最新版本</span>
        </div>
      );
    }

    if (updateStatus === 'error') {
      return (
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
          <ErrorIcon className="h-4 w-4" />
          <span className="text-sm">{updateResult?.error || '检查更新失败'}</span>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col items-center justify-center h-full space-y-6 py-8">
      {/* Logo - Requirements: 2.2, 4.2, 4.3 */}
      <div className="w-24 h-24 flex items-center justify-center">
        {logoError ? (
          <DefaultLogoIcon className="w-20 h-20 text-neutral-400 dark:text-neutral-500" />
        ) : (
          <img
            src={APP_CONFIG.logoPath}
            alt={`${APP_CONFIG.name} Logo`}
            className="w-full h-full object-contain"
            onError={handleLogoError}
          />
        )}
      </div>

      {/* 应用名称 - Requirements: 2.3 */}
      <h2 className="text-2xl font-semibold text-neutral-900 dark:text-neutral-100">
        {APP_CONFIG.name}
      </h2>

      {/* 版本号 - Requirements: 2.4 */}
      <p className="text-neutral-500 dark:text-neutral-400 font-mono">
        {formattedVersion}
      </p>

      {/* 操作按钮 - Requirements: 2.5, 2.6, 2.8, 2.9 */}
      <div className="flex items-center gap-4">
        {/* 检查更新按钮 */}
        <button
          onClick={handleCheckUpdate}
          disabled={updateStatus === 'checking'}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 
            disabled:bg-neutral-300 dark:disabled:bg-neutral-600
            text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {updateStatus === 'checking' ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <RefreshIcon className="h-4 w-4" />
          )}
          检查更新
        </button>

        {/* 官方网站链接 */}
        <a
          href={APP_CONFIG.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-neutral-200 dark:bg-neutral-700 
            hover:bg-neutral-300 dark:hover:bg-neutral-600
            text-neutral-700 dark:text-neutral-200 rounded-lg font-medium transition-colors"
        >
          <ExternalLinkIcon className="h-4 w-4" />
          官方网站
        </a>
      </div>

      {/* 更新状态显示 */}
      <div className="min-h-[24px]">
        {renderUpdateStatus()}
      </div>

      {/* 分隔线 */}
      <div className="w-full max-w-xs border-t border-neutral-200 dark:border-neutral-700" />

      {/* 版权信息 */}
      <p className="text-sm text-neutral-400 dark:text-neutral-500 text-center">
        {APP_CONFIG.copyright}
      </p>
    </div>
  );
}

// ============================================
// 图标组件
// ============================================

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function NewVersionIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
    </svg>
  );
}

function DefaultLogoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} 
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

export default AboutPanel;
