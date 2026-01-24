/**
 * 模型标签组件
 * 在程序卡片上显示使用的模型名称
 * 需求: 5.1, 5.2, 5.3
 */



/**
 * 模型系列类型
 */
type ModelSeries = 'gemini-3' | 'gemini-2.5' | 'gemini-2.0' | 'unknown';

/**
 * 模型系列颜色配置
 * 所有系列使用统一的主题色
 */
const MODEL_SERIES_COLORS: Record<ModelSeries, { bg: string; text: string; darkBg: string; darkText: string }> = {
  'gemini-3': {
    bg: 'bg-primary-100',
    text: 'text-primary-700',
    darkBg: 'dark:bg-primary-900/30',
    darkText: 'dark:text-primary-300',
  },
  'gemini-2.5': {
    bg: 'bg-primary-100',
    text: 'text-primary-700',
    darkBg: 'dark:bg-primary-900/30',
    darkText: 'dark:text-primary-300',
  },
  'gemini-2.0': {
    bg: 'bg-primary-100',
    text: 'text-primary-700',
    darkBg: 'dark:bg-primary-900/30',
    darkText: 'dark:text-primary-300',
  },
  'unknown': {
    bg: 'bg-neutral-100',
    text: 'text-neutral-700',
    darkBg: 'dark:bg-neutral-700',
    darkText: 'dark:text-neutral-300',
  },
};

/**
 * 获取模型系列
 * @param modelId 模型 ID
 * @returns 模型系列
 */
export function getModelSeries(modelId: string): ModelSeries {
  if (modelId.includes('gemini-3')) {
    return 'gemini-3';
  }
  if (modelId.includes('gemini-2.5')) {
    return 'gemini-2.5';
  }
  if (modelId.includes('gemini-2.0')) {
    return 'gemini-2.0';
  }
  return 'unknown';
}

/**
 * 获取模型颜色配置
 * @param modelId 模型 ID
 * @returns 颜色配置
 */
export function getModelColor(modelId: string): { bg: string; text: string; darkBg: string; darkText: string } {
  const series = getModelSeries(modelId);
  return MODEL_SERIES_COLORS[series];
}

/**
 * 获取简短的模型显示名称
 * @param modelId 模型 ID
 * @returns 简短名称（如 "3 Pro"、"2.5 Flash"）
 */
export function getShortModelName(modelId: string): string {
  // 处理常见的模型 ID 格式
  // gemini-3-pro-preview -> "3 Pro"
  // gemini-3-pro-image-preview -> "3 Pro Img"
  // gemini-2.5-pro -> "2.5 Pro"
  // gemini-2.5-flash -> "2.5 Flash"
  // gemini-2.5-flash-lite -> "2.5 Lite"
  // gemini-2.5-flash-image -> "2.5 Img"
  // gemini-2.0-flash -> "2.0 Flash"
  // gemini-2.0-flash-lite -> "2.0 Lite"

  // 移除 gemini- 前缀和 -preview 后缀
  let name = modelId
    .replace(/^gemini-/, '')
    .replace(/-preview$/, '');

  // 处理图片模型
  if (name.includes('-image')) {
    name = name.replace('-image', '');
    // 提取版本号和类型
    const parts = name.split('-');
    const version = parts[0];
    const type = parts[1] || '';
    
    if (type === 'pro') {
      return `${version} Pro Img`;
    }
    if (type === 'flash') {
      return `${version} Img`;
    }
    return `${version} Img`;
  }

  // 处理 lite 模型
  if (name.includes('-lite')) {
    name = name.replace('-lite', '');
    const parts = name.split('-');
    const version = parts[0];
    return `${version} Lite`;
  }

  // 处理普通模型
  const parts = name.split('-');
  const version = parts[0];
  const type = parts[1] || '';

  if (type === 'pro') {
    return `${version} Pro`;
  }
  if (type === 'flash') {
    return `${version} Flash`;
  }

  // 如果无法解析，返回原始 ID 的简化版本
  if (version) {
    return version;
  }

  return modelId;
}

interface ModelBadgeProps {
  /** 模型 ID */
  modelId: string;
  /** 额外的 CSS 类名 */
  className?: string;
}

/**
 * 模型标签组件
 * 显示简短名称和对应颜色
 */
export function ModelBadge({ modelId, className = '' }: ModelBadgeProps) {
  const shortName = getShortModelName(modelId);
  const colors = getModelColor(modelId);

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 text-xs font-medium rounded ${colors.bg} ${colors.text} ${colors.darkBg} ${colors.darkText} ${className}`}
    >
      {shortName}
    </span>
  );
}

export default ModelBadge;
