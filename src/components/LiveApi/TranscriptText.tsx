/**
 * 转录文字组件
 * 需求: 4.1, 4.2, 4.3, 4.4
 * 
 * 显示语音消息的文字转录，支持展开/折叠长文本
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * 转录文字组件属性
 */
export interface TranscriptTextProps {
  /** 转录文字内容 */
  text: string;
  /** 最大显示行数，默认 2 行 */
  maxLines?: number;
  /** 展开回调 */
  onExpand?: () => void;
  /** 自定义类名 */
  className?: string;
}

/**
 * 转录文字组件
 * 需求: 4.1 - 显示在对应语音条的下方
 * 需求: 4.2 - 使用较小的字体和次要颜色
 * 需求: 4.3 - 空转录显示占位符
 * 需求: 4.4 - 支持展开/折叠长文本
 */
export function TranscriptText({
  text,
  maxLines = 2,
  onExpand,
  className = '',
}: TranscriptTextProps): JSX.Element {
  // 展开/折叠状态
  const [isExpanded, setIsExpanded] = useState(false);

  // 检查是否为空转录
  const isEmpty = !text || text.trim() === '';

  // 计算是否需要展开/折叠功能
  // 简单估算：假设每行约 30 个字符
  const estimatedLines = useMemo(() => {
    if (isEmpty) return 0;
    return Math.ceil(text.length / 30);
  }, [text, isEmpty]);

  const needsExpansion = estimatedLines > maxLines;

  // 处理展开/折叠
  const handleToggle = useCallback(() => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    if (newExpanded && onExpand) {
      onExpand();
    }
  }, [isExpanded, onExpand]);

  // 空转录占位符
  // 需求: 4.3
  if (isEmpty) {
    return (
      <div
        className={`text-xs text-neutral-400 dark:text-neutral-500 italic ${className}`}
        data-testid="transcript-empty"
      >
        [无转录]
      </div>
    );
  }

  return (
    <div className={`${className}`} data-testid="transcript-text">
      {/* 转录文字内容 */}
      {/* 需求: 4.2 - 较小字体和次要颜色 */}
      <p
        className={`
          text-xs text-neutral-500 dark:text-neutral-400 leading-relaxed
          ${!isExpanded && needsExpansion ? 'line-clamp-2' : ''}
        `}
        style={!isExpanded && needsExpansion ? { 
          display: '-webkit-box',
          WebkitLineClamp: maxLines,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        } : undefined}
      >
        {text}
      </p>

      {/* 展开/折叠按钮 */}
      {/* 需求: 4.4 */}
      {needsExpansion && (
        <button
          onClick={handleToggle}
          className="
            mt-1 text-xs text-primary-500 dark:text-primary-400 
            hover:text-primary-600 dark:hover:text-primary-300
            transition-colors cursor-pointer
          "
          data-testid="transcript-toggle"
        >
          {isExpanded ? '收起' : '展开'}
        </button>
      )}
    </div>
  );
}

export default TranscriptText;
