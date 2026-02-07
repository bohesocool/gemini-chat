/**
 * 文件引用专用文件图标（来自 FileReferencePreview）
 * 与 FileIcon 区分：本图标用于文件引用预览，SVG 路径不同
 */

/**
 * 文件引用文件图标组件
 */
export function FileRefFileIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );
}
