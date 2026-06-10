/**
 * 文件/图片上传与 Files API 上传状态管理 Hook
 * 从 MessageInput.tsx 拆分而来，逻辑保持不变
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.1, 5.2, 5.4
 */

import { useState, useCallback, useEffect } from 'react';
import type { Attachment } from '../../types/models';
import { SUPPORTED_IMAGE_TYPES } from '../../types/models';
import { validateFile, fileToBase64, getFileMimeType, isImageFile } from '../../services/file';
import { useSettingsStore } from '../../stores/settings';
import type { FileReference } from '../../types/filesApi';
import { generateFileReferenceId, createFileReference } from '../../types/filesApi';
import { uploadFileToFilesApi, validateFilesApiFile, FilesApiError, getErrorMessage } from '../../services/filesApi';
import { generatePastedImageFilename } from './utils';
import { createLogger } from '../../services/logger';

// 模块日志记录器
const logger = createLogger('MessageInput');

/**
 * 文件上传状态管理 Hook
 * 管理附件列表、Files API 文件引用列表与上传错误状态
 */
export function useFileUpload() {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [fileReferences, setFileReferences] = useState<FileReference[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 获取 Files API 开关状态 - 需求: 1.1, 1.2
  const filesApiEnabled = useSettingsStore(state => state.filesApiEnabled);
  const apiKey = useSettingsStore(state => state.apiKey);
  const apiEndpoint = useSettingsStore(state => state.apiEndpoint);

  // 清除错误提示
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // 处理文件选择
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newAttachments: Attachment[] = [];

    // 调试日志
    logger.debug('handleFiles called', {
      filesApiEnabled,
      fileCount: fileArray.length,
      apiKey: apiKey ? '***' : 'empty',
    });

    for (const file of fileArray) {
      // 如果启用了 Files API 模式，使用 Files API 上传
      // 需求: 2.1 - Files API 模式下上传文件到 Gemini Files API
      if (filesApiEnabled) {
        logger.debug('Using Files API mode for:', file.name);
        // 验证文件是否可以通过 Files API 上传
        const validation = validateFilesApiFile(file);
        if (!validation.valid) {
          setError(validation.error || '文件验证失败');
          continue;
        }

        // 创建初始文件引用（上传中状态）
        const tempRef: FileReference = {
          id: generateFileReferenceId(),
          uri: '',
          mimeType: file.type || 'application/octet-stream',
          displayName: file.name,
          sizeBytes: file.size,
          status: 'uploading',
          progress: 0,
          originalFile: file, // 保存原始文件用于重试 - 需求: 5.2
        };

        // 添加到文件引用列表
        setFileReferences(prev => [...prev, tempRef]);

        try {
          // 上传文件到 Files API
          // 需求: 2.2 - 显示上传进度
          const result = await uploadFileToFilesApi(
            file,
            apiKey,
            apiEndpoint || undefined,
            (progress) => {
              // 更新上传进度
              setFileReferences(prev =>
                prev.map(ref =>
                  ref.id === tempRef.id
                    ? { ...ref, progress }
                    : ref
                )
              );
            }
          );

          // 更新文件引用为成功状态
          // 需求: 2.3 - 存储文件引用
          const successRef = createFileReference(result, file.name);
          setFileReferences(prev =>
            prev.map(ref =>
              ref.id === tempRef.id
                ? { ...successRef, id: tempRef.id }
                : ref
            )
          );
        } catch (err) {
          logger.error('Files API 上传失败:', err);
          // 更新文件引用为错误状态
          // 需求: 2.4, 5.1, 5.2, 5.4 - 显示上传错误，保留错误代码和原始文件用于重试
          const errorMessage = getErrorMessage(err);
          const errorCode = err instanceof FilesApiError ? err.code : undefined;

          setFileReferences(prev =>
            prev.map(ref =>
              ref.id === tempRef.id
                ? {
                  ...ref,
                  status: 'error' as const,
                  error: errorMessage,
                  errorCode: errorCode,
                  originalFile: file, // 保留原始文件用于重试
                }
                : ref
            )
          );
          // 需求: 5.4 - 错误时保留文本内容（不清空 content）
          setError(errorMessage);
        }
      } else {
        // 使用传统的 base64 内联方式
        // 需求: 4.4 - Files API 模式禁用时使用现有内联 base64 上传方法
        logger.debug('Using traditional base64 mode for:', file.name);
        const validation = validateFile(file);
        if (!validation.valid) {
          setError(validation.error || '文件验证失败');
          continue;
        }

        try {
          const mimeType = getFileMimeType(file);
          const base64Data = await fileToBase64(file);

          const attachment: Attachment = {
            id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            type: isImageFile(mimeType) ? 'image' : 'file',
            name: file.name,
            mimeType,
            data: base64Data,
            size: file.size,
          };

          newAttachments.push(attachment);
        } catch (err) {
          logger.error('文件处理失败:', err);
          setError(`文件处理失败: ${file.name}`);
        }
      }
    }

    if (newAttachments.length > 0) {
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  }, [filesApiEnabled, apiKey, apiEndpoint]);

  /**
   * 处理粘贴事件，从剪贴板提取图片
   * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6
   */
  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    const imageFiles: File[] = [];

    // 遍历剪贴板项目，提取图片
    for (const item of items) {
      // 检查是否为支持的图片类型
      if (item.kind === 'file' && SUPPORTED_IMAGE_TYPES.includes(item.type)) {
        const file = item.getAsFile();
        if (file) {
          // 生成带时间戳的默认文件名
          const filename = generatePastedImageFilename(item.type);
          // 创建带有新文件名的 File 对象
          const renamedFile = new File([file], filename, { type: file.type });
          imageFiles.push(renamedFile);
        }
      }
    }

    // 如果有图片，阻止默认粘贴行为并处理图片
    if (imageFiles.length > 0) {
      e.preventDefault();
      await handleFiles(imageFiles);
    }
    // 如果没有图片，允许默认的文本粘贴行为
  }, [handleFiles]);

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // 删除文件引用 - 需求: 3.2
  const handleRemoveFileReference = (id: string) => {
    setFileReferences((prev) => prev.filter((ref) => ref.id !== id));
  };

  // 重试上传文件 - 需求: 5.2
  const handleRetryFileUpload = useCallback(async (id: string) => {
    // 找到需要重试的文件引用
    const refToRetry = fileReferences.find(ref => ref.id === id);
    if (!refToRetry || !refToRetry.originalFile) {
      setError('无法重试：原始文件不可用');
      return;
    }

    const file = refToRetry.originalFile;

    // 更新状态为上传中
    setFileReferences(prev =>
      prev.map(ref =>
        ref.id === id
          ? {
            ...ref,
            status: 'uploading' as const,
            progress: 0,
            error: undefined,
            errorCode: undefined,
          }
          : ref
      )
    );

    try {
      // 重新上传文件
      const result = await uploadFileToFilesApi(
        file,
        apiKey,
        apiEndpoint || undefined,
        (progress) => {
          setFileReferences(prev =>
            prev.map(ref =>
              ref.id === id
                ? { ...ref, progress }
                : ref
            )
          );
        }
      );

      // 更新为成功状态
      const successRef = createFileReference(result, file.name);
      setFileReferences(prev =>
        prev.map(ref =>
          ref.id === id
            ? { ...successRef, id }
            : ref
        )
      );

      // 清除错误提示
      setError(null);
    } catch (err) {
      logger.error('重试上传失败:', err);
      const errorMessage = getErrorMessage(err);
      const errorCode = err instanceof FilesApiError ? err.code : undefined;

      setFileReferences(prev =>
        prev.map(ref =>
          ref.id === id
            ? {
              ...ref,
              status: 'error' as const,
              error: errorMessage,
              errorCode: errorCode,
            }
            : ref
        )
      );
      setError(errorMessage);
    }
  }, [fileReferences, apiKey, apiEndpoint]);

  return {
    attachments,
    setAttachments,
    fileReferences,
    setFileReferences,
    error,
    handleFiles,
    handlePaste,
    handleRemoveAttachment,
    handleRemoveFileReference,
    handleRetryFileUpload,
  };
}
