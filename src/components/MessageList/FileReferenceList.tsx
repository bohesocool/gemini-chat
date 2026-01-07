/**
 * 文件引用列表组件（消息列表中显示）
 * 渲染文件引用卡片列表
 * 
 * Requirements: 5.1, 5.3, 5.4
 */

import type { FileReference } from '../../types/filesApi';
import { FileReferenceCard } from './FileReferenceCard';

/**
 * FileReferenceList 组件属性
 */
export interface FileReferenceListProps {
  /** 文件引用列表 */
  fileReferences: FileReference[];
  /** 是否为用户消息（用于对齐） */
  isUser: boolean;
}

/**
 * 文件引用列表组件
 * 
 * Requirements:
 * - 5.1: 显示文件引用卡片
 * - 5.3: 文件引用显示在消息文本上方
 * - 5.4: 同时显示文件引用和内联附件
 */
export function FileReferenceList({ fileReferences, isUser }: FileReferenceListProps) {
  // 如果没有文件引用，不渲染任何内容
  if (!fileReferences || fileReferences.length === 0) {
    return null;
  }

  return (
    <div className={`flex flex-wrap gap-2 mb-2 ${isUser ? 'justify-end' : ''}`}>
      {fileReferences.map((ref) => (
        <FileReferenceCard key={ref.id} fileReference={ref} />
      ))}
    </div>
  );
}

export default FileReferenceList;
