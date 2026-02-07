/**
 * 下拉按钮组件
 * 通用的下拉选择按钮，用于显示当前值并提供选项列表
 * 
 * Requirements: 2.1, 3.1, 6.2, 6.3
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { durationValues, easings } from '../../design/tokens';
import { useReducedMotion } from '../motion';
import { CheckIcon, ChevronDownIcon } from '../icons';

/**
 * 下拉选项
 */
export interface DropdownOption<T> {
  /** 选项值 */
  value: T;
  /** 显示标签 */
  label: string;
  /** 可选描述 */
  description?: string;
}

/**
 * 下拉按钮属性
 */
export interface DropdownButtonProps<T> {
  /** 当前选中值 */
  value: T;
  /** 选项列表 */
  options: DropdownOption<T>[];
  /** 选择回调 */
  onSelect: (value: T) => void;
  /** 按钮前缀标签 */
  label?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 自定义类名 */
  className?: string;
}

/**
 * 下拉按钮组件
 * 显示当前值，点击展开选项列表
 * 使用 Portal 渲染下拉菜单，避免被父容器 overflow 裁剪
 * 
 * Requirements:
 * - 2.1, 3.1: 点击展开/收起菜单
 * - 6.2: 高亮显示当前选中的选项
 * - 6.3: 点击外部关闭菜单
 */
export function DropdownButton<T extends string | number>({
  value,
  options,
  onSelect,
  label,
  disabled = false,
  className = '',
}: DropdownButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ bottom: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  // 获取当前选中选项的标签
  const currentOption = options.find((opt) => opt.value === value);
  const displayLabel = currentOption?.label || String(value);

  // 计算菜单位置 - 向上展开
  const updateMenuPosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      // 使用 bottom 定位，从按钮顶部向上展开
      // bottom = 视口高度 - 按钮顶部位置 + 间距
      setMenuPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left,
      });
    }
  }, []);

  // 打开菜单时计算位置
  useEffect(() => {
    if (isOpen) {
      updateMenuPosition();
      // 监听滚动和窗口大小变化
      window.addEventListener('scroll', updateMenuPosition, true);
      window.addEventListener('resize', updateMenuPosition);
      return () => {
        window.removeEventListener('scroll', updateMenuPosition, true);
        window.removeEventListener('resize', updateMenuPosition);
      };
    }
  }, [isOpen, updateMenuPosition]);

  // 点击外部关闭菜单 - Requirements: 6.3
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        buttonRef.current &&
        !buttonRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    // 使用 mousedown 而不是 click，以便更快响应
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // 处理按钮点击 - Requirements: 2.1, 3.1
  const handleButtonClick = useCallback(() => {
    if (!disabled) {
      setIsOpen((prev) => !prev);
    }
  }, [disabled]);

  // 处理选项选择
  const handleOptionSelect = useCallback(
    (optionValue: T) => {
      onSelect(optionValue);
      setIsOpen(false);
    },
    [onSelect]
  );

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (disabled) return;

      switch (event.key) {
        case 'Enter':
        case ' ':
          event.preventDefault();
          setIsOpen((prev) => !prev);
          break;
        case 'Escape':
          setIsOpen(false);
          break;
        case 'ArrowDown':
          if (!isOpen) {
            event.preventDefault();
            setIsOpen(true);
          }
          break;
      }
    },
    [disabled, isOpen]
  );

  const transitionStyle = reducedMotion
    ? {}
    : { transition: `all ${durationValues.fast}ms ${easings.easeOut}` };

  // 渲染下拉菜单（使用 Portal）
  const renderMenu = () => {
    if (!isOpen) return null;

    const menuContent = (
      <div
        ref={menuRef}
        className={`
          fixed min-w-[120px] py-1
          bg-white dark:bg-neutral-800
          border border-neutral-200 dark:border-neutral-700
          rounded-lg shadow-lg
          ${reducedMotion ? '' : 'animate-dropdown-in'}
        `}
        style={{
          bottom: menuPosition.bottom,
          left: menuPosition.left,
          zIndex: 9999,
        }}
        role="listbox"
        aria-activedescendant={`option-${value}`}
      >
        {options.map((option) => {
          const isSelected = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              onClick={() => handleOptionSelect(option.value)}
              className={`
                w-full px-3 py-2 text-left text-sm
                flex items-center justify-between gap-2
                ${isSelected
                  ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400'
                  : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                }
              `}
              style={transitionStyle}
              role="option"
              aria-selected={isSelected}
              id={`option-${option.value}`}
            >
              <div className="flex flex-col">
                <span className="font-medium">{option.label}</span>
                {option.description && (
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">
                    {option.description}
                  </span>
                )}
              </div>
              {/* 选中标记 - Requirements: 6.2 */}
              {isSelected && (
                <CheckIcon className="w-4 h-4 text-primary-500 flex-shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    );

    return createPortal(menuContent, document.body);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* 触发按钮 */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleButtonClick}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm
          ${disabled
            ? 'opacity-50 cursor-not-allowed bg-neutral-100 dark:bg-neutral-800 text-neutral-400 dark:text-neutral-500'
            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 active:scale-95'
          }
        `}
        style={transitionStyle}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        {/* 前缀标签 */}
        {label && (
          <span className="text-neutral-400 dark:text-neutral-500">
            {label}
          </span>
        )}
        {/* 当前值 */}
        <span className="font-medium">{displayLabel}</span>
        {/* 下拉箭头 */}
        <ChevronDownIcon
          className={`w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500 ${
            isOpen ? 'rotate-180' : ''
          }`}
          style={transitionStyle}
        />
      </button>

      {/* 下拉菜单（通过 Portal 渲染） */}
      {renderMenu()}
    </div>
  );
}

export default DropdownButton;
