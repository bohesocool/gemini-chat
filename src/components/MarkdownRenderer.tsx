/**
 * Markdown 渲染组件（懒加载包装器）
 *
 * 真正的渲染实现在 MarkdownRendererImpl.tsx，包含 react-markdown、katex、
 * highlight.js 等重型依赖。这里用 React.lazy 将其拆分为独立 chunk 并按需加载，
 * 显著减小首屏 bundle 体积。配合 preloadMarkdownRenderer 在应用空闲时预取，
 * 避免首次渲染消息时出现回退闪烁。
 */

import { lazy, Suspense } from 'react';

const MarkdownRendererImpl = lazy(() => import('./MarkdownRendererImpl'));

interface MarkdownRendererProps {
  /** Markdown 内容 */
  content: string;
  /** 自定义类名 */
  className?: string;
}

/**
 * 加载回退：以纯文本展示内容，避免空白闪烁。
 * 由于 chunk 通常已被 preloadMarkdownRenderer 预取，回退几乎不可见。
 */
function PlainTextFallback({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`markdown-content ${className}`}>
      <p className="whitespace-pre-wrap break-words">{content}</p>
    </div>
  );
}

export function MarkdownRenderer(props: MarkdownRendererProps) {
  return (
    <Suspense fallback={<PlainTextFallback {...props} />}>
      <MarkdownRendererImpl {...props} />
    </Suspense>
  );
}

/**
 * 预加载重型 Markdown 渲染 chunk（react-markdown / katex / highlight.js）。
 * 在应用启动空闲时调用，使后续渲染无需等待下载。
 */
export function preloadMarkdownRenderer(): void {
  void import('./MarkdownRendererImpl');
}

export default MarkdownRenderer;
