/**
 * HTML 包装工具函数
 * 用于检测和包装 HTML 内容为完整的 HTML5 文档
 */

/**
 * 检测 HTML 内容是否为完整的 HTML 文档
 * 满足以下任一条件即视为完整文档：
 * 1. 包含 <!DOCTYPE 声明（不区分大小写）
 * 2. 包含 <html 标签（不区分大小写）
 * 
 * @param html - HTML 字符串
 * @returns 是否为完整文档
 * 
 * 需求: 1.4
 */
export function isCompleteHtmlDocument(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return false;
  }
  
  // 使用正则表达式进行不区分大小写的匹配
  const doctypePattern = /<!doctype\s+html/i;
  const htmlTagPattern = /<html[\s>]/i;
  
  return doctypePattern.test(html) || htmlTagPattern.test(html);
}

/**
 * 从 HTML 片段中提取 style 标签
 * @param html - HTML 字符串
 * @returns { styles: 提取的 style 标签数组, remaining: 剩余的 HTML }
 */
function extractStyleTags(html: string): { styles: string[], remaining: string } {
  const stylePattern = /<style[^>]*>[\s\S]*?<\/style>/gi;
  const styles: string[] = [];
  let remaining = html;
  
  let match;
  while ((match = stylePattern.exec(html)) !== null) {
    styles.push(match[0]);
  }
  
  // 从原始 HTML 中移除 style 标签
  remaining = html.replace(stylePattern, '');
  
  return { styles, remaining };
}

/**
 * 将 HTML 片段包装为完整的 HTML5 文档
 * 如果已经是完整文档则直接返回，否则包装为完整结构
 * 
 * 智能处理：
 * - 将 <style> 标签提取到 <head> 中
 * - 将其他内容放在 <body> 中
 * 
 * @param html - HTML 字符串（可能是片段或完整文档）
 * @returns 完整的 HTML5 文档字符串
 * 
 * 需求: 1.1, 1.2, 1.3
 */
export function wrapHtmlContent(html: string): string {
  // 如果是完整文档则直接返回
  if (isCompleteHtmlDocument(html)) {
    return html;
  }
  
  // 提取 style 标签
  const { styles, remaining } = extractStyleTags(html);
  
  // 构建额外的样式标签
  const additionalStyles = styles.join('\n  ');
  
  // 包装为完整 HTML5 文档结构
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* 基础重置样式 */
    * { box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 16px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
  </style>
  ${additionalStyles}
</head>
<body>
${remaining}
</body>
</html>`;
}
