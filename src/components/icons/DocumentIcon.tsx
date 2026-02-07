/**
 * 文档文件图标
 * 来自 FileReferencePreview.tsx，内置琥珀色主题色
 */
export function DocumentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-amber-500 dark:text-amber-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}
