/**
 * 保存图标
 * 来源：InlineMessageEditor.tsx
 * 注意：实际 SVG 与 CheckIcon 相同，保留独立语义命名
 */
export function SaveIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
