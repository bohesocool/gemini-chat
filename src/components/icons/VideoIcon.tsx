/**
 * 视频文件图标
 * 来自 FileReferencePreview.tsx，内置红色主题色
 */
export function VideoIcon({ className }: { className?: string }) {
  return (
    <svg
      className={`${className} text-red-500 dark:text-red-400`}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
      />
    </svg>
  );
}
