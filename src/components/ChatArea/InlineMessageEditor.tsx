/**
 * 原位消息编辑器组件
 * 需求: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5
 */

import { useState, useRef, useEffect, useCallback, useMemo, memo } from 'react';
import type { Message } from '../../types/models';

// ============ 类型定义 ============

/**
 * 原位消息编辑器 Props
 */
export interface InlineMessageEditorProps {
  /** 消息对象 */
  message: Message;
  /** 是否为最后一条用户消息 */
  isLastUserMessage: boolean;
  /** 保存回调 */
  onSave: (newContent: string) => void;
  /** 保存并重新发送回调 */
  onSaveAndResend: (newContent: string) => void;
  /** 取消回调 */
  onCancel: () => void;
}

// ============ 主组件 ============

/**
 * 原位消息编辑器组件
 * 
 * 需求:
 * - 1.1: 在消息原位置显示编辑界面
 * - 1.2: 保持消息在列表中的位置不变
 * - 1.3: 实时调整文本区域高度以适应内容
 * - 1.4: 最后一条消息只显示"保存并重新发送"
 * - 1.5: 历史消息显示"仅保存"和"保存并重新发送"
 * - 3.1: Escape 键取消编辑
 * - 3.2: Ctrl+Enter 保存或保存并重新发送
 * - 3.3: 阻止保存空白内容
 * - 3.4: 相同内容直接退出编辑模式
 * - 3.5: 编辑完成后平滑切换回显示模式
 */
export function InlineMessageEditor({
  message,
  isLastUserMessage,
  onSave,
  onSaveAndResend,
  onCancel,
}: InlineMessageEditorProps) {
  const [content, setContent] = useState(message.content);
  const [error, setError] = useState<string>('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 需求 1.2: 自动聚焦到文本区域
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // 将光标移到末尾
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, []);

  // 需求 1.3: 自动调整文本区域高度
  useEffect(() => {
    if (textareaRef.current) {
      // 重置高度以获取正确的 scrollHeight
      textareaRef.current.style.height = 'auto';
      // 设置为内容高度
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [content]);

  // 需求 3.3: 验证内容是否为空白
  const validateContent = useCallback((text: string): boolean => {
    if (text.trim().length === 0) {
      setError('消息内容不能为空');
      return false;
    }
    setError('');
    return true;
  }, []);

  // 需求 3.4: 检查内容是否相同
  const isContentUnchanged = useCallback((text: string): boolean => {
    return text === message.content;
  }, [message.content]);

  // 处理保存
  const handleSave = useCallback(() => {
    // 需求 3.4: 内容相同时直接退出
    if (isContentUnchanged(content)) {
      onCancel();
      return;
    }

    // 需求 3.3: 验证内容
    if (!validateContent(content)) {
      return;
    }

    onSave(content);
  }, [content, isContentUnchanged, validateContent, onSave, onCancel]);

  // 处理保存并重新发送
  const handleSaveAndResend = useCallback(() => {
    // 需求 3.3: 验证内容
    if (!validateContent(content)) {
      return;
    }

    // 即使内容相同也允许重新发送（用户可能想重试）
    onSaveAndResend(content);
  }, [content, validateContent, onSaveAndResend]);

  // 需求 3.1, 3.2: 键盘快捷键处理
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // 需求 3.1: Escape 键取消编辑
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      onCancel();
      return;
    }

    // 需求 3.2: Ctrl+Enter 保存或保存并重新发送
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      
      if (isLastUserMessage) {
        handleSaveAndResend();
      } else {
        handleSave();
      }
      return;
    }
  }, [onCancel, isLastUserMessage, handleSave, handleSaveAndResend]);

  // 处理内容变化
  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    // 清除错误提示
    if (error) {
      setError('');
    }
  }, [error]);

  // 性能优化：缓存是否禁用保存按钮的计算结果
  const isSaveDisabled = useMemo(() => !!error, [error]);

  return (
    <div className="flex-1 min-w-0 max-w-[85%]">
      {/* 编辑器容器 */}
      <div className="relative">
        {/* 文本区域 */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className={`
            w-full px-4 py-3 rounded-2xl rounded-br-md
            bg-white dark:bg-neutral-800
            border-2 transition-colors
            ${error 
              ? 'border-red-500 dark:border-red-400' 
              : 'border-green-500 dark:border-green-400 focus:border-green-600 dark:focus:border-green-300'
            }
            text-neutral-900 dark:text-neutral-100
            placeholder-neutral-400 dark:placeholder-neutral-500
            resize-none overflow-hidden
            focus:outline-none focus:ring-2 focus:ring-green-500/20 dark:focus:ring-green-400/20
            shadow-md shadow-green-500/20 dark:shadow-green-400/10
          `}
          placeholder="输入消息内容..."
          rows={1}
        />

        {/* 错误提示 */}
        {error && (
          <div className="absolute -bottom-6 left-0 text-xs text-red-500 dark:text-red-400">
            {error}
          </div>
        )}
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mt-3">
        {/* 需求 1.4, 1.5: 根据消息位置显示不同按钮 */}
        {isLastUserMessage ? (
          // 最后一条消息：只显示"保存并重新发送"
          <>
            <ActionButton
              onClick={handleSaveAndResend}
              variant="primary"
              disabled={isSaveDisabled}
            >
              <SaveIcon className="w-4 h-4" />
              保存并重新发送
            </ActionButton>
            <ActionButton onClick={onCancel} variant="secondary">
              取消
            </ActionButton>
          </>
        ) : (
          // 历史消息：显示"仅保存"和"保存并重新发送"
          <>
            <ActionButton
              onClick={handleSave}
              variant="secondary"
              disabled={isSaveDisabled}
            >
              <SaveIcon className="w-4 h-4" />
              仅保存
            </ActionButton>
            <ActionButton
              onClick={handleSaveAndResend}
              variant="primary"
              disabled={isSaveDisabled}
            >
              <SaveIcon className="w-4 h-4" />
              保存并重新发送
            </ActionButton>
            <ActionButton onClick={onCancel} variant="secondary">
              取消
            </ActionButton>
          </>
        )}

        {/* 快捷键提示 */}
        <div className="ml-auto text-xs text-neutral-400 dark:text-neutral-500">
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700">Esc</kbd> 取消
          {' · '}
          <kbd className="px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-700">Ctrl+Enter</kbd> 保存
        </div>
      </div>
    </div>
  );
}

// ============ 子组件 ============

/**
 * 操作按钮组件
 * 性能优化：使用 memo 避免不必要的重渲染
 */
interface ActionButtonProps {
  onClick: () => void;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
  children: React.ReactNode;
}

const ActionButton = memo(function ActionButton({ onClick, variant, disabled = false, children }: ActionButtonProps) {
  const isPrimary = variant === 'primary';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        flex items-center gap-1.5 px-3 py-1.5 rounded-lg
        text-sm font-medium
        transition-all duration-200
        ${isPrimary
          ? 'bg-green-500 hover:bg-green-600 text-white shadow-md shadow-green-500/30 hover:shadow-lg hover:shadow-green-500/40'
          : 'bg-neutral-100 hover:bg-neutral-200 text-neutral-700 dark:bg-neutral-700 dark:hover:bg-neutral-600 dark:text-neutral-200'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}
        disabled:hover:scale-100
      `}
    >
      {children}
    </button>
  );
});

// ============ 图标组件 ============

function SaveIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

export default InlineMessageEditor;
