/**
 * 加载动画组件库
 * 提供品牌加载动画和加载状态组件
 * 
 * Requirements: 11.1, 11.5
 */

import React, { useState, useEffect } from 'react';
import { useReducedMotion } from '../motion';
import { useTranslation } from '@/i18n';

// ============================================
// 品牌加载动画组件
// ============================================

export interface BrandLoaderProps {
  /** 加载文本 */
  text?: string;
  /** 尺寸 */
  size?: 'sm' | 'md' | 'lg';
  /** 自定义类名 */
  className?: string;
}

/**
 * 品牌加载动画组件
 * 应用初始化时显示的品牌加载动画
 * 
 * Requirements: 11.1 - 应用初始化加载时显示品牌加载动画
 */
export function BrandLoader({
  text,
  size = 'md',
  className = '',
}: BrandLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();
  
  // 如果没有传入 text，使用国际化的默认值
  const displayText = text ?? t('common.loading');
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
  };
  
  const textSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 ${className}`}>
      {/* Gemini 风格的加载动画 */}
      <div className={`relative ${sizeClasses[size]}`}>
        {/* 外圈 */}
        <div
          className={`
            absolute inset-0 rounded-full
            border-4 border-slate-200 dark:border-slate-700
          `}
        />
        {/* 旋转的渐变圈 */}
        <div
          className={`
            absolute inset-0 rounded-full
            border-4 border-transparent border-t-blue-500 border-r-blue-400
            ${prefersReducedMotion ? '' : 'animate-spin'}
          `}
          style={{ animationDuration: '1s' }}
        />
        {/* 中心点 */}
        <div
          className={`
            absolute inset-0 m-auto w-2 h-2 rounded-full
            bg-blue-500
            ${prefersReducedMotion ? '' : 'animate-pulse'}
          `}
        />
      </div>
      
      {/* 加载文本 */}
      {displayText && (
        <p className={`
          text-slate-600 dark:text-slate-400
          ${textSizeClasses[size]}
          ${prefersReducedMotion ? '' : 'animate-pulse'}
        `}>
          {displayText}
        </p>
      )}
    </div>
  );
}


// ============================================
// 加载覆盖层组件
// ============================================

export interface LoadingOverlayProps {
  /** 是否显示 */
  isLoading: boolean;
  /** 加载文本 */
  text?: string;
  /** 是否全屏 */
  fullScreen?: boolean;
  /** 背景模糊 */
  blur?: boolean;
  /** 自定义类名 */
  className?: string;
  /** 子元素（加载完成后显示） */
  children?: React.ReactNode;
}

/**
 * 加载覆盖层组件
 * 在内容加载时显示覆盖层
 */
export function LoadingOverlay({
  isLoading,
  text,
  fullScreen = false,
  blur = true,
  className = '',
  children,
}: LoadingOverlayProps) {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();
  
  // 如果没有传入 text，使用国际化的默认值
  const displayText = text ?? t('common.loading');

  if (!isLoading && children) {
    return <>{children}</>;
  }

  return (
    <div
      className={`
        ${fullScreen ? 'fixed inset-0 z-50' : 'absolute inset-0'}
        flex items-center justify-center
        bg-white/80 dark:bg-slate-900/80
        ${blur ? 'backdrop-blur-sm' : ''}
        ${prefersReducedMotion ? '' : 'transition-opacity duration-300'}
        ${className}
      `}
    >
      <BrandLoader text={displayText} size="lg" />
    </div>
  );
}

// ============================================
// 淡入包装组件
// ============================================

export interface FadeInProps {
  /** 子元素 */
  children: React.ReactNode;
  /** 是否显示 */
  show: boolean;
  /** 动画时长（毫秒） */
  duration?: number;
  /** 延迟（毫秒） */
  delay?: number;
  /** 自定义类名 */
  className?: string;
  /** 动画完成回调 */
  onAnimationComplete?: () => void;
}

/**
 * 淡入包装组件
 * 加载完成时使用淡入动画显示实际内容
 * 
 * Requirements: 11.5 - 加载完成时使用淡入动画显示实际内容
 */
export function FadeIn({
  children,
  show,
  duration = 300,
  delay = 0,
  className = '',
  onAnimationComplete,
}: FadeInProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(show);

  useEffect(() => {
    if (show) {
      setShouldRender(true);
      // 延迟一帧以触发动画
      const showTimer = setTimeout(() => {
        setIsVisible(true);
      }, delay + 10);
      
      // 动画完成回调
      const completeTimer = setTimeout(() => {
        onAnimationComplete?.();
      }, delay + (prefersReducedMotion ? 0 : duration));
      
      return () => {
        clearTimeout(showTimer);
        clearTimeout(completeTimer);
      };
    } else {
      setIsVisible(false);
      const hideTimer = setTimeout(() => {
        setShouldRender(false);
      }, prefersReducedMotion ? 0 : duration);
      
      return () => clearTimeout(hideTimer);
    }
  }, [show, duration, delay, prefersReducedMotion, onAnimationComplete]);

  if (!shouldRender) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
        transition: prefersReducedMotion
          ? 'none'
          : `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// 应用加载屏组件
// ============================================

export interface AppLoaderProps {
  /** 是否正在加载 */
  isLoading: boolean;
  /** 加载完成后显示的内容 */
  children: React.ReactNode;
  /** 最小加载时间（毫秒） */
  minLoadTime?: number;
}

/**
 * 应用加载屏组件
 * 应用初始化时显示品牌加载动画，加载完成后淡入显示内容
 * 
 * Requirements: 11.1, 11.5
 */
export function AppLoader({
  isLoading,
  children,
  minLoadTime = 500,
}: AppLoaderProps) {
  const [showContent, setShowContent] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, minLoadTime);
    
    return () => clearTimeout(timer);
  }, [minLoadTime]);

  useEffect(() => {
    if (!isLoading && minTimeElapsed) {
      setShowContent(true);
    }
  }, [isLoading, minTimeElapsed]);

  if (!showContent) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-slate-900">
        <BrandLoader text="Gemini Chat" size="lg" />
      </div>
    );
  }

  return (
    <FadeIn show={showContent} duration={300}>
      {children}
    </FadeIn>
  );
}

// ============================================
// 内联加载指示器
// ============================================

export interface InlineLoaderProps {
  /** 尺寸 */
  size?: 'xs' | 'sm' | 'md';
  /** 颜色 */
  color?: 'primary' | 'white' | 'current';
  /** 自定义类名 */
  className?: string;
}

/**
 * 内联加载指示器
 * 用于按钮或小区域的加载状态
 */
export function InlineLoader({
  size = 'sm',
  color = 'current',
  className = '',
}: InlineLoaderProps) {
  const prefersReducedMotion = useReducedMotion();
  const { t } = useTranslation();
  
  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border-2',
    md: 'w-5 h-5 border-2',
  };
  
  const colorClasses = {
    primary: 'border-blue-500 border-t-transparent',
    white: 'border-white border-t-transparent',
    current: 'border-current border-t-transparent',
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${colorClasses[color]}
        rounded-full
        ${prefersReducedMotion ? '' : 'animate-spin'}
        ${className}
      `}
      style={{ animationDuration: '0.6s' }}
      aria-label={t('common.loading')}
    />
  );
}

// ============================================
// 打字指示器
// ============================================

export interface TypingIndicatorProps {
  /** 自定义类名 */
  className?: string;
}

/**
 * 打字指示器组件
 * 显示 AI 正在输入的动画
 * 
 * Requirements: 8.4 - 消息正在流式输出时显示打字指示器动画
 */
export function TypingIndicator({ className = '' }: TypingIndicatorProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className={`
            w-2 h-2 rounded-full
            bg-slate-400 dark:bg-slate-500
            ${prefersReducedMotion ? '' : 'animate-bounce'}
          `}
          style={{
            animationDelay: prefersReducedMotion ? '0ms' : `${index * 150}ms`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
}
