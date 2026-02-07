/**
 * Gemini 官方星形图标
 * 来源：ChatArea.tsx
 * 使用 SVG 格式的四角星形图标，与主题色协调
 */
export function GeminiIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 28 28"
      fill="none"
    >
      {/* Gemini 官方四角星形图标 */}
      <path
        d="M14 0C14 7.732 7.732 14 0 14C7.732 14 14 20.268 14 28C14 20.268 20.268 14 28 14C20.268 14 14 7.732 14 0Z"
        fill="currentColor"
      />
    </svg>
  );
}
