/**
 * 拖拽排序列表组件（虚拟化）
 * 需求: 7.5
 *
 * 使用 @tanstack/react-virtual 只渲染可视区域内的项
 * （与 VirtualMessageList 同方案），窗口数量多时避免全量渲染。
 */

import React, { useState, useCallback, useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';

// ============ 类型定义 ============

interface DragDropListProps<T> {
  /** 列表项数据 */
  items: T[];
  /** 获取项的唯一标识 */
  keyExtractor: (item: T) => string;
  /** 渲染列表项 */
  renderItem: (item: T, index: number, isDragging: boolean, isDropTarget: boolean) => React.ReactNode;
  /** 排序变化回调 */
  onReorder: (items: T[]) => void;
  /** 滚动容器引用（虚拟化需要，由父组件提供可滚动元素） */
  scrollRef: React.RefObject<HTMLElement>;
  /** 自定义类名 */
  className?: string;
}

interface DragState {
  /** 正在拖拽的项索引 */
  dragIndex: number | null;
  /** 拖拽目标位置索引 */
  dropIndex: number | null;
}

// ============ 工具函数 ============

/**
 * 重新排序数组
 * 将 fromIndex 位置的元素移动到 toIndex 位置
 * @param list 原数组
 * @param fromIndex 源位置
 * @param toIndex 目标位置
 * @returns 重新排序后的新数组
 */
export function reorderList<T>(list: T[], fromIndex: number, toIndex: number): T[] {
  // 验证索引有效性
  if (fromIndex < 0 || fromIndex >= list.length) {
    return list;
  }
  if (toIndex < 0 || toIndex >= list.length) {
    return list;
  }
  if (fromIndex === toIndex) {
    return list;
  }

  const result = [...list];
  const [removed] = result.splice(fromIndex, 1);
  if (removed !== undefined) {
    result.splice(toIndex, 0, removed);
  }
  return result;
}

// ============ 拖拽排序列表组件 ============

/**
 * 拖拽排序列表
 * 支持通过拖拽重新排序列表项
 */
export function DragDropList<T>({
  items,
  keyExtractor,
  renderItem,
  onReorder,
  scrollRef,
  className = '',
}: DragDropListProps<T>) {
  // 拖拽状态
  const [dragState, setDragState] = useState<DragState>({
    dragIndex: null,
    dropIndex: null,
  });

  // 拖拽数据引用
  const dragDataRef = useRef<{ index: number } | null>(null);

  // 虚拟化器：只渲染可视区域内的项，动态测量实际高度
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 96,
    overscan: 5,
    measureElement: (element) => element.getBoundingClientRect().height,
  });

  // 处理拖拽开始
  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    // 设置拖拽数据
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(index));
    
    // 保存拖拽数据到 ref
    dragDataRef.current = { index };
    
    // 更新拖拽状态
    setDragState({
      dragIndex: index,
      dropIndex: null,
    });

    // 添加拖拽样式（延迟以确保拖拽图像正确）
    requestAnimationFrame(() => {
      const target = e.target as HTMLElement;
      target.style.opacity = '0.5';
    });
  }, []);

  // 处理拖拽结束
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    // 恢复样式
    const target = e.target as HTMLElement;
    target.style.opacity = '1';

    // 清除拖拽状态
    setDragState({
      dragIndex: null,
      dropIndex: null,
    });
    dragDataRef.current = null;
  }, []);

  // 处理拖拽经过
  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // 更新放置目标
    if (dragState.dropIndex !== index) {
      setDragState(prev => ({
        ...prev,
        dropIndex: index,
      }));
    }
  }, [dragState.dropIndex]);

  // 处理拖拽离开
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // 检查是否真的离开了元素（而不是进入子元素）
    const relatedTarget = e.relatedTarget as HTMLElement;
    const currentTarget = e.currentTarget as HTMLElement;
    
    if (!currentTarget.contains(relatedTarget)) {
      setDragState(prev => ({
        ...prev,
        dropIndex: null,
      }));
    }
  }, []);

  // 处理放置
  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();

    const dragIndex = dragDataRef.current?.index;
    
    if (dragIndex !== undefined && dragIndex !== null && dragIndex !== dropIndex) {
      // 执行重新排序
      const reorderedItems = reorderList(items, dragIndex, dropIndex);
      onReorder(reorderedItems);
    }

    // 清除拖拽状态
    setDragState({
      dragIndex: null,
      dropIndex: null,
    });
    dragDataRef.current = null;
  }, [items, onReorder]);

  return (
    <div
      className={`relative w-full ${className}`}
      style={{ height: `${virtualizer.getTotalSize()}px` }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const index = virtualItem.index;
        const item = items[index];
        if (item === undefined) return null;

        const key = keyExtractor(item);
        const isDragging = dragState.dragIndex === index;
        const isDropTarget = dragState.dropIndex === index && dragState.dragIndex !== index;

        return (
          <div
            key={key}
            data-index={index}
            ref={virtualizer.measureElement}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              transform: `translateY(${virtualItem.start}px)`,
            }}
            className={`
              pb-1 transition-all duration-200 cursor-grab active:cursor-grabbing
              ${isDropTarget ? 'border-t-2 border-primary-500' : ''}
            `}
          >
            {renderItem(item, index, isDragging, isDropTarget)}
          </div>
        );
      })}
    </div>
  );
}

export default DragDropList;
