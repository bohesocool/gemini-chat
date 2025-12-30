/**
 * Markdown 渲染组件
 * 需求: 9.1, 9.2, 9.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 2.1
 */

import React, { useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeHighlight from 'rehype-highlight';
import rehypeKatex from 'rehype-katex';
import type { Components } from 'react-markdown';
import { HtmlPreviewModal } from './HtmlPreviewModal';

// 引入 KaTeX 样式
import 'katex/dist/katex.min.css';

// 引入代码高亮主题 - 使用 github-dark 主题，适合深色背景
import 'highlight.js/styles/github-dark.css';

/**
 * 从 React children 中提取纯文本内容
 * @param children - React 节点
 * @returns 纯文本字符串
 */
function extractTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') {
    return children;
  }
  if (typeof children === 'number') {
    return String(children);
  }
  if (Array.isArray(children)) {
    return children.map(extractTextFromChildren).join('');
  }
  if (React.isValidElement(children) && children.props?.children) {
    return extractTextFromChildren(children.props.children);
  }
  return '';
}

interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * Markdown 渲染组件
 * 支持 GFM、代码高亮、数学公式渲染
 * 需求: 2.1 - 使用缓存避免重复解析
 */
export function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  // HTML 预览状态
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // 打开 HTML 预览
  const handleOpenPreview = useCallback((html: string) => {
    setPreviewHtml(html);
    setIsPreviewOpen(true);
  }, []);

  // 关闭 HTML 预览
  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewHtml(null);
  }, []);

  // 创建带有预览功能的组件
  const componentsWithPreview: Components = useMemo(() => ({
    ...markdownComponents,
    // 代码块 - 需求: 4.1, 4.2, 4.3, 4.4, 4.5
    code({ className, children, node, ...props }) {
      // 判断是否为行内代码：检查父元素是否为 pre
      // node.position 存在且 className 不包含 language- 前缀时为行内代码
      const hasLanguageClass = className && /language-\w+/.test(className);
      const isInline = !hasLanguageClass;
      
      // 需求: 3.7 - 优化行内代码样式，添加背景色和圆角
      if (isInline) {
        return (
          <code
            className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 text-pink-600 dark:text-pink-400 text-sm font-mono border border-slate-200 dark:border-slate-600"
            {...props}
          >
            {children}
          </code>
        );
      }

      // 提取语言和代码内容
      const match = /language-(\w+)/.exec(className || '');
      const language = match ? match[1] : '';
      const isHtml = language?.toLowerCase() === 'html';
      const codeText = extractTextFromChildren(children).replace(/\n$/, '');

      return (
        <CodeBlock 
          className={className} 
          onPreview={isHtml ? () => handleOpenPreview(codeText) : undefined}
          {...props}
        >
          {children}
        </CodeBlock>
      );
    },
  }), [handleOpenPreview]);

  // 渲染 Markdown 内容
  // 注意：不缓存渲染结果，因为缓存会导致事件处理函数失效
  const renderedContent = useMemo(() => {
    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeHighlight, rehypeKatex]}
        components={componentsWithPreview}
      >
        {content}
      </ReactMarkdown>
    );
  }, [content, componentsWithPreview]);

  return (
    <div className={`markdown-content ${className}`}>
      {renderedContent}
      
      {/* HTML 预览模态框 */}
      {isPreviewOpen && previewHtml && (
        <HtmlPreviewModal
          html={previewHtml}
          isOpen={isPreviewOpen}
          onClose={handleClosePreview}
        />
      )}
    </div>
  );
}

/**
 * 代码块组件（带复制按钮和语言标签）
 * 需求: 4.1, 4.2, 4.3, 4.4
 */
interface CodeBlockProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
  onPreview?: () => void;
}

function CodeBlock({
  children,
  className,
  onPreview,
  ...props
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  
  // 提取语言名称
  const match = /language-(\w+)/.exec(className || '');
  const language = match ? match[1] : '';
  
  // 检测是否为 HTML 代码块
  const isHtml = language?.toLowerCase() === 'html';
  
  // 获取代码文本 - 使用辅助函数正确提取文本
  const codeText = extractTextFromChildren(children).replace(/\n$/, '');

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(codeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('复制失败:', err);
    }
  }, [codeText]);

  return (
    <div className="relative">
      {/* 代码块头部 - 语言标签和操作按钮 */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-600 rounded-t-lg">
        {/* 语言标签 */}
        <div className="flex items-center gap-2">
          <CodeIcon className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-300 uppercase tracking-wide">
            {language || 'code'}
          </span>
        </div>
        
        {/* 操作按钮 */}
        <div className="flex items-center gap-2">
          {/* HTML 预览按钮 */}
          {isHtml && onPreview && (
            <button
              onClick={onPreview}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 transition-all duration-200 text-xs font-medium"
              title="预览 HTML"
            >
              <PreviewIcon className="w-3.5 h-3.5" />
              <span>预览</span>
            </button>
          )}
          
          {/* 复制按钮 */}
          <button
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all duration-200 text-xs font-medium ${
              copied
                ? 'bg-green-600/20 text-green-400'
                : 'bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 hover:text-white'
            }`}
            title={copied ? '已复制' : '复制代码'}
          >
            {copied ? (
              <>
                <CheckIcon className="w-3.5 h-3.5 animate-scale-in" />
                <span className="animate-fade-in">已复制</span>
              </>
            ) : (
              <>
                <CopyIcon className="w-3.5 h-3.5" />
                <span>复制</span>
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* 代码内容 */}
      <code className={className} {...props}>
        {children}
      </code>
    </div>
  );
}

/**
 * 自定义 Markdown 组件（基础组件，不包含需要状态的组件）
 */
const markdownComponents: Components = {
  // 预格式化块
  // 需求: 4.1, 4.2 - 代码块容器样式，配合头部显示
  pre({ children, ...props }) {
    return (
      <pre
        className="overflow-x-auto rounded-b-lg bg-slate-900 dark:bg-slate-950 p-4 my-0 text-sm [&:first-child]:rounded-t-lg [&:first-child]:mt-4"
        {...props}
      >
        {children}
      </pre>
    );
  },

  // 标题
  // 需求: 3.1 - 优化标题渲染样式，添加适当间距和边框，深色模式兼容
  h1: ({ children, ...props }) => (
    <h1 
      className="text-2xl font-bold mt-6 mb-4 pb-2 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
      {...props}
    >
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 
      className="text-xl font-bold mt-5 mb-3 pb-1 border-b border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100" 
      {...props}
    >
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 
      className="text-lg font-semibold mt-4 mb-2 text-slate-900 dark:text-slate-100" 
      {...props}
    >
      {children}
    </h3>
  ),
  h4: ({ children, ...props }) => (
    <h4 
      className="text-base font-semibold mt-3 mb-2 text-slate-900 dark:text-slate-100" 
      {...props}
    >
      {children}
    </h4>
  ),
  h5: ({ children, ...props }) => (
    <h5 
      className="text-sm font-semibold mt-3 mb-1 text-slate-900 dark:text-slate-100" 
      {...props}
    >
      {children}
    </h5>
  ),
  h6: ({ children, ...props }) => (
    <h6 
      className="text-sm font-medium mt-2 mb-1 text-slate-600 dark:text-slate-400" 
      {...props}
    >
      {children}
    </h6>
  ),

  // 段落
  p: ({ children, ...props }) => (
    <p className="my-2 leading-7" {...props}>
      {children}
    </p>
  ),

  // 列表
  // 需求: 3.2 - 优化列表渲染样式，添加适当缩进，嵌套列表正确显示
  ul: ({ children, ...props }) => (
    <ul 
      className="list-disc pl-6 my-3 space-y-1 marker:text-slate-500 dark:marker:text-slate-400 [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4" 
      {...props}
    >
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol 
      className="list-decimal pl-6 my-3 space-y-1 marker:text-slate-500 dark:marker:text-slate-400 [&_ul]:my-1 [&_ul]:pl-4 [&_ol]:my-1 [&_ol]:pl-4" 
      {...props}
    >
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li 
      className="leading-7 text-slate-700 dark:text-slate-300 pl-1" 
      {...props}
    >
      {children}
    </li>
  ),

  // 链接
  a: ({ children, href, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline"
      {...props}
    >
      {children}
    </a>
  ),

  // 强调
  // 需求: 9.1
  strong: ({ children, ...props }) => (
    <strong className="font-semibold text-slate-900 dark:text-slate-100" {...props}>
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em className="italic" {...props}>
      {children}
    </em>
  ),

  // 引用块
  // 需求: 3.6 - 优化引用块样式，添加左边框和背景色
  blockquote: ({ children, ...props }) => (
    <blockquote
      className="border-l-4 border-blue-500 dark:border-blue-400 pl-4 pr-4 py-2 my-4 bg-slate-50 dark:bg-slate-800/50 rounded-r-lg italic text-slate-600 dark:text-slate-400"
      {...props}
    >
      {children}
    </blockquote>
  ),

  // 水平线
  hr: (props) => (
    <hr className="my-6 border-slate-200 dark:border-slate-700" {...props} />
  ),

  // 表格（GFM）
  // 需求: 3.5 - 优化表格渲染样式，添加边框和圆角，表头背景色区分，响应式滚动支持
  table: ({ children, ...props }) => (
    <div className="overflow-x-auto my-4 rounded-lg border border-slate-200 dark:border-slate-700">
      <table className="min-w-full border-collapse" {...props}>
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead 
      className="bg-slate-100 dark:bg-slate-800/80" 
      {...props}
    >
      {children}
    </thead>
  ),
  tbody: ({ children, ...props }) => (
    <tbody 
      className="divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900/50" 
      {...props}
    >
      {children}
    </tbody>
  ),
  tr: ({ children, ...props }) => (
    <tr 
      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors" 
      {...props}
    >
      {children}
    </tr>
  ),
  th: ({ children, ...props }) => (
    <th
      className="px-4 py-3 text-left text-sm font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-200 dark:border-slate-700 first:rounded-tl-lg last:rounded-tr-lg"
      {...props}
    >
      {children}
    </th>
  ),
  td: ({ children, ...props }) => (
    <td
      className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300"
      {...props}
    >
      {children}
    </td>
  ),

  // 图片
  img: ({ src, alt, ...props }) => (
    <img
      src={src}
      alt={alt}
      className="max-w-full h-auto rounded-lg my-4"
      loading="lazy"
      {...props}
    />
  ),
};

// ============ 图标组件 ============

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

function CheckIcon({ className }: { className?: string }) {
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

function CodeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"
      />
    </svg>
  );
}

function PreviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
      />
    </svg>
  );
}

export default MarkdownRenderer;
