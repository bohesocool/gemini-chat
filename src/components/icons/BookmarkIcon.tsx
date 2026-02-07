/**
 * 书签图标
 * 来源：ChatArea/MessageActions.tsx
 * 支持 filled 属性切换填充/描边版本
 * filled 为 true 时显示填充版本（带 text-primary-500 颜色），false 时显示描边版本
 */
export function BookmarkIcon({ className, filled }: { className?: string; filled?: boolean }) {
  if (filled) {
    return (
      <svg className={`${className} text-primary-500`} fill="currentColor" viewBox="0 0 24 24">
        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  );
}
