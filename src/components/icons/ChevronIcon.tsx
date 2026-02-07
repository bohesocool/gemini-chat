/**
 * 展开/折叠箭头图标
 * 来源：ThoughtSummaryCard.tsx
 * 注意：SVG 与 ChevronDownIcon 相同，保留独立命名作为别名
 */
export function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
