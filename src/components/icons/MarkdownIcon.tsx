/**
 * Markdown 格式图标
 * 来源：ExportDialog.tsx
 */
export function MarkdownIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M22.27 19.385H1.73A1.73 1.73 0 010 17.655V6.345a1.73 1.73 0 011.73-1.73h20.54A1.73 1.73 0 0124 6.345v11.31a1.73 1.73 0 01-1.73 1.73zM5.769 15.923v-4.5l2.308 2.885 2.307-2.885v4.5h2.308V8.077h-2.308l-2.307 2.885-2.308-2.885H3.461v7.846h2.308zM19.385 12h-2.308V8.077h-2.307V12h-2.308l3.461 4.039 3.462-4.039z" />
    </svg>
  );
}
