/**
 * 图片预览模态框组件
 * 显示图片放大视图，提供下载、复制和缩放功能
 * 需求: 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.5, 13.1-13.8
 */

import { useEffect, useCallback, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { GeneratedImage } from '../types';
import type { GeneratedImage as MessageGeneratedImage } from '../types/models';

/**
 * 简化的图片数据接口
 * 支持消息中的图片（只有 mimeType 和 data）
 * 需求: 7.1, 7.2
 */
export interface SimpleImageData {
  /** 图片 MIME 类型 */
  mimeType: string;
  /** Base64 编码的图片数据 */
  data: string;
}

/**
 * 缩放状态接口
 * 需求: 13.4
 */
interface ZoomState {
  /** 当前缩放比例 */
  scale: number;
  /** X 轴平移 */
  translateX: number;
  /** Y 轴平移 */
  translateY: number;
}

/** 最小缩放比例 10% - 需求: 13.4 */
const MIN_SCALE = 0.1;
/** 最大缩放比例 500% - 需求: 13.4 */
const MAX_SCALE = 5.0;
/** 每次缩放步进 10% */
const ZOOM_STEP = 0.1;

interface ImagePreviewModalProps {
  /** 要预览的图片（支持完整的 GeneratedImage 或简化的 SimpleImageData） */
  image: GeneratedImage | SimpleImageData | MessageGeneratedImage | null;
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

/**
 * 图片预览模态框
 * 需求: 2.3, 2.4, 2.5, 2.6, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1-12.5, 13.1-13.8
 */
export function ImagePreviewModal({ image, isOpen, onClose }: ImagePreviewModalProps) {
  const [copyStatus, setCopyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  // 需求 7.5: 用户友好的错误信息
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // 需求 13.4: 缩放状态管理
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, translateX: 0, translateY: 0 });
  // 是否正在拖拽
  const [isDragging, setIsDragging] = useState(false);
  // 拖拽起始位置
  const dragStartRef = useRef({ x: 0, y: 0, translateX: 0, translateY: 0 });
  // 图片容器引用
  const containerRef = useRef<HTMLDivElement>(null);
  // 图片引用
  const imageRef = useRef<HTMLImageElement>(null);

  // 判断是否为完整的 GeneratedImage（有 id 和 createdAt 字段）
  const isFullImage = (img: GeneratedImage | SimpleImageData | MessageGeneratedImage | null): img is GeneratedImage => {
    return img !== null && 'id' in img && 'createdAt' in img;
  };

  // 重置缩放状态当图片改变时
  useEffect(() => {
    setZoom({ scale: 1, translateX: 0, translateY: 0 });
  }, [image]);

  // 处理 ESC 键关闭
  // 需求: 2.6
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 锁定背景滚动
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // 需求 13.1, 13.2, 13.3: 滚轮缩放，以鼠标位置为中心
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, zoom.scale + delta));
    
    // 计算以鼠标位置为中心的缩放
    if (containerRef.current && imageRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left - rect.width / 2;
      const mouseY = e.clientY - rect.top - rect.height / 2;
      
      const scaleFactor = newScale / zoom.scale;
      const newTranslateX = mouseX - (mouseX - zoom.translateX) * scaleFactor;
      const newTranslateY = mouseY - (mouseY - zoom.translateY) * scaleFactor;
      
      setZoom({ scale: newScale, translateX: newTranslateX, translateY: newTranslateY });
    } else {
      setZoom(prev => ({ ...prev, scale: newScale }));
    }
  }, [zoom]);

  // 需求 13.5: 拖拽平移 - mousedown
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 仅在放大时允许拖拽
    if (zoom.scale > 1) {
      e.preventDefault();
      setIsDragging(true);
      dragStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        translateX: zoom.translateX,
        translateY: zoom.translateY,
      };
    }
  }, [zoom.scale, zoom.translateX, zoom.translateY]);

  // 需求 13.5: 拖拽平移 - mousemove
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.x;
    const deltaY = e.clientY - dragStartRef.current.y;
    setZoom(prev => ({
      ...prev,
      translateX: dragStartRef.current.translateX + deltaX,
      translateY: dragStartRef.current.translateY + deltaY,
    }));
  }, [isDragging]);

  // 需求 13.5: 拖拽平移 - mouseup
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // 需求 13.7: 双击切换适应屏幕/100%
  const handleDoubleClick = useCallback(() => {
    if (zoom.scale === 1 && zoom.translateX === 0 && zoom.translateY === 0) {
      // 当前是适应屏幕，切换到 100%
      setZoom({ scale: 1, translateX: 0, translateY: 0 });
    } else {
      // 当前是其他状态，重置到适应屏幕
      setZoom({ scale: 1, translateX: 0, translateY: 0 });
    }
  }, [zoom.scale, zoom.translateX, zoom.translateY]);

  // 需求 13.8: 缩放控制按钮 - 放大
  const handleZoomIn = useCallback(() => {
    setZoom(prev => ({ 
      ...prev, 
      scale: Math.min(MAX_SCALE, prev.scale + ZOOM_STEP) 
    }));
  }, []);
  
  // 需求 13.8: 缩放控制按钮 - 缩小
  const handleZoomOut = useCallback(() => {
    setZoom(prev => ({ 
      ...prev, 
      scale: Math.max(MIN_SCALE, prev.scale - ZOOM_STEP) 
    }));
  }, []);
  
  // 需求 13.8: 缩放控制按钮 - 重置
  const handleZoomReset = useCallback(() => {
    setZoom({ scale: 1, translateX: 0, translateY: 0 });
  }, []);

  // 处理下载
  // 需求: 2.4, 7.3, 8.3
  const handleDownload = useCallback(() => {
    if (!image) return;

    try {
      // 创建下载链接
      const link = document.createElement('a');
      link.href = `data:${image.mimeType};base64,${image.data}`;
      
      // 需求 7.3, 8.3: 使用原始 mimeType 确定文件扩展名，生成描述性文件名
      const extension = image.mimeType.split('/')[1] || 'png';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      
      // 如果是完整的 GeneratedImage，使用其 id；否则使用时间戳
      const imageId = isFullImage(image) ? image.id.slice(0, 8) : timestamp.slice(-8);
      link.download = `generated_image_${timestamp}_${imageId}.${extension}`;
      
      // 触发下载
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setDownloadStatus('success');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    } catch (error) {
      console.error('下载失败:', error);
      setDownloadStatus('error');
      setTimeout(() => setDownloadStatus('idle'), 2000);
    }
  }, [image]);

  // 处理复制到剪贴板
  // 需求: 2.5, 7.4, 7.5
  const handleCopy = useCallback(async () => {
    if (!image) return;

    try {
      // 将 base64 转换为 Blob
      const byteCharacters = atob(image.data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: image.mimeType });

      // 复制到剪贴板
      await navigator.clipboard.write([
        new ClipboardItem({
          [image.mimeType]: blob,
        }),
      ]);

      setCopyStatus('success');
      setErrorMessage('');
      setTimeout(() => setCopyStatus('idle'), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      // 需求 7.5: 显示用户友好的错误信息
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setErrorMessage('浏览器不允许复制图片，请尝试右键保存');
        } else if (error.name === 'SecurityError') {
          setErrorMessage('安全限制，无法复制图片');
        } else {
          setErrorMessage('复制失败，请尝试下载图片');
        }
      } else {
        setErrorMessage('复制失败，请尝试下载图片');
      }
      setCopyStatus('error');
      setTimeout(() => {
        setCopyStatus('idle');
        setErrorMessage('');
      }, 3000);
    }
  }, [image]);

  // 处理遮罩点击
  // 需求: 2.6
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen || !image) {
    return null;
  }

  // 构建图片 URL
  const imageUrl = `data:${image.mimeType};base64,${image.data}`;

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      onClick={handleOverlayClick}
      role="presentation"
    >
      {/* 需求 13.6, 13.8: 顶部缩放控制工具栏 */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2 z-10">
        {/* 缩小按钮 */}
        <button
          onClick={handleZoomOut}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="缩小"
          disabled={zoom.scale <= MIN_SCALE}
        >
          <ZoomOutIcon className="h-5 w-5" />
        </button>
        {/* 需求 13.6: 显示当前缩放百分比 */}
        <span className="text-white text-sm min-w-[60px] text-center font-medium">
          {Math.round(zoom.scale * 100)}%
        </span>
        {/* 放大按钮 */}
        <button
          onClick={handleZoomIn}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="放大"
          disabled={zoom.scale >= MAX_SCALE}
        >
          <ZoomInIcon className="h-5 w-5" />
        </button>
        {/* 分隔线 */}
        <div className="w-px h-5 bg-white/20 mx-1" />
        {/* 重置按钮 */}
        <button
          onClick={handleZoomReset}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="重置缩放"
        >
          <ResetIcon className="h-5 w-5" />
        </button>
        {/* 下载按钮 */}
        <button
          onClick={handleDownload}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="下载图片"
        >
          <DownloadIcon className="h-5 w-5" />
          {downloadStatus === 'success' && <span className="sr-only">已下载</span>}
        </button>
        {/* 复制按钮 */}
        <button
          onClick={handleCopy}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="复制到剪贴板"
        >
          <CopyIcon className="h-5 w-5" />
          {copyStatus === 'success' && <span className="sr-only">已复制</span>}
        </button>
        {/* 分隔线 */}
        <div className="w-px h-5 bg-white/20 mx-1" />
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="关闭 (ESC)"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      {/* 状态提示 */}
      {(copyStatus !== 'idle' || downloadStatus !== 'idle') && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-10">
          {copyStatus === 'success' && (
            <div className="bg-green-500/90 text-white px-4 py-2 rounded-lg text-sm">
              已复制到剪贴板
            </div>
          )}
          {copyStatus === 'error' && errorMessage && (
            <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
              {errorMessage}
            </div>
          )}
          {downloadStatus === 'success' && (
            <div className="bg-green-500/90 text-white px-4 py-2 rounded-lg text-sm">
              下载已开始
            </div>
          )}
          {downloadStatus === 'error' && (
            <div className="bg-red-500/90 text-white px-4 py-2 rounded-lg text-sm">
              下载失败
            </div>
          )}
        </div>
      )}

      {/* 需求 12.1, 12.2, 12.3, 12.5: 图片容器，自适应屏幕，居中显示 */}
      <div
        ref={containerRef}
        className="w-full h-full flex items-center justify-center overflow-hidden"
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{ cursor: isDragging ? 'grabbing' : zoom.scale > 1 ? 'grab' : 'default' }}
        role="dialog"
        aria-modal="true"
        aria-label="图片预览"
      >
        {/* 需求 12.1, 12.2: 使用 max-w-[90vw] max-h-[90vh] 限制图片大小，确保完整显示 */}
        <img
          ref={imageRef}
          src={imageUrl}
          alt={isFullImage(image) && image.prompt ? image.prompt : '生成的图片'}
          className="max-w-[90vw] max-h-[90vh] object-contain select-none"
          style={{
            transform: `translate(${zoom.translateX}px, ${zoom.translateY}px) scale(${zoom.scale})`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          draggable={false}
        />
      </div>

      {/* 底部信息栏 */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-black/50 backdrop-blur-sm rounded-lg px-4 py-2 text-sm text-white/80 z-10">
        {/* 显示生成时间（如果有）或思维链图片标签 */}
        {isFullImage(image) ? (
          <span>生成时间: {formatTime(image.createdAt)}</span>
        ) : (
          // 需求 2.8: 对于思维链图片，显示 "思维链图片" 标签
          <span>思维链图片 · {image.mimeType.split('/')[1]?.toUpperCase() || 'PNG'}</span>
        )}
        {/* 显示提示词（如果有） */}
        {isFullImage(image) && image.prompt && (
          <>
            <div className="w-px h-4 bg-white/20" />
            <span className="truncate max-w-[300px]" title={image.prompt}>
              提示词: {image.prompt}
            </span>
          </>
        )}
        {/* 操作提示 */}
        <div className="w-px h-4 bg-white/20" />
        <span className="text-white/60">滚轮缩放 · 双击重置 · 拖拽平移</span>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}


/**
 * 下载图标
 */
function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
      />
    </svg>
  );
}

/**
 * 复制图标
 */
function CopyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}

/**
 * 关闭图标
 */
function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

/**
 * 放大图标
 * 需求: 13.8
 */
function ZoomInIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7"
      />
    </svg>
  );
}

/**
 * 缩小图标
 * 需求: 13.8
 */
function ZoomOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7"
      />
    </svg>
  );
}

/**
 * 重置图标
 * 需求: 13.8
 */
function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

export default ImagePreviewModal;
