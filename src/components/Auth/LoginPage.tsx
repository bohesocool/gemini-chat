/**
 * 登录页面组件
 * Requirements: 5.1, 5.6
 */

import React, { useState, useCallback } from 'react';
import { useAuthStore } from '../../stores/auth';
import { isEnvPassword } from '../../types/auth';

/**
 * 登录页面
 * 显示密码输入框和登录按钮
 */
export function LoginPage() {
  const [password, setPassword] = useState('');
  const { login, isLoading, error, clearError } = useAuthStore();

  // 处理密码输入
  const handlePasswordChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (error) {
      clearError();
    }
  }, [error, clearError]);

  // 处理登录提交
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      return;
    }
    await login(password);
  }, [password, login]);

  // 处理回车键
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit(e);
    }
  }, [handleSubmit, isLoading]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-900 dark:to-neutral-800">
      <div className="w-full max-w-md p-8">
        {/* 登录卡片 */}
        <div className="bg-white/80 dark:bg-neutral-800/80 backdrop-blur-xl rounded-2xl shadow-xl p-8 border border-white/20 dark:border-neutral-700/50">
          {/* 标题 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary-100 dark:bg-primary-900/40 mb-4">
              <LockIcon className="w-8 h-8 text-primary-600 dark:text-primary-400" />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              Gemini Chat
            </h1>
            <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2">
              请输入密码以继续
            </p>
          </div>

          {/* 登录表单 */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 密码输入框 */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                onKeyDown={handleKeyDown}
                placeholder="请输入密码"
                disabled={isLoading}
                autoFocus
                className={`
                  w-full px-4 py-3 rounded-lg border transition-colors
                  bg-white dark:bg-neutral-700
                  text-neutral-900 dark:text-neutral-100
                  placeholder-neutral-400 dark:placeholder-neutral-500
                  focus:outline-none focus:ring-2 focus:ring-primary-500
                  disabled:opacity-50 disabled:cursor-not-allowed
                  ${error 
                    ? 'border-red-500 dark:border-red-400' 
                    : 'border-neutral-300 dark:border-neutral-600'
                  }
                `}
              />
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                <ErrorIcon className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* 登录按钮 */}
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={`
                w-full py-3 px-4 rounded-lg font-medium transition-all
                flex items-center justify-center gap-2
                ${isLoading || !password.trim()
                  ? 'bg-neutral-300 dark:bg-neutral-600 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg hover:shadow-xl'
                }
              `}
            >
              {isLoading ? (
                <>
                  <LoadingSpinner className="w-5 h-5" />
                  <span>登录中...</span>
                </>
              ) : (
                <span>登录</span>
              )}
            </button>
          </form>

          {/* 提示信息 */}
          {!isEnvPassword() && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center mt-6">
              默认密码: adminiadmin
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// 图标组件
// ============================================

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth={2} 
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
      />
    </svg>
  );
}

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

export default LoginPage;
