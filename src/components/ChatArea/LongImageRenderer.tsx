/**
 * 长图渲染组件
 * 用于将对话内容渲染为可导出的长图
 * 
 * Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.5, 3.6
 */

import { forwardRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { Components } from 'react-markdown';
import { IMAGE_EXPORT_CONFIG, formatTimestamp, getRoleLabel } from '../../services/export';
import type { Message } from '../../types';

// ============ 类型定义 ============

/** 主题配色类型 */
export interface ThemeColors {
  background: string;
  headerBackground: string;
  userMessageBackground: string;
  aiMessageBackground: string;
  textColor: string;
  secondaryTextColor: string;
  borderColor: string;
}

/** 导出元数据 */
export interface ExportMetadata {
  /** 窗口标题 */
  title: string;
  /** 模型名称 */
  modelName: string;
  /** 导出时间戳 */
  exportedAt: number;
}

/** 长图渲染选项 */
export interface LongImageOptions {
  /** 是否包含时间戳 */
  includeTimestamps: boolean;
  /** 是否包含思维链 */
  includeThoughts: boolean;
}

/** 长图渲染组件 Props */
export interface LongImageRendererProps {
  /** 消息列表 */
  messages: Message[];
  /** 元数据 */
  metadata: ExportMetadata;
  /** 导出选项 */
  options: LongImageOptions;
  /** 主题 */
  theme: 'light' | 'dark';
  /** 渲染完成回调 */
  onRenderComplete?: (element: HTMLElement) => void;
}

// ============ 主组件 ============

/**
 * 长图渲染组件
 * 
 * 该组件用于渲染对话内容为可导出的长图格式。
 * 组件会在内存中渲染，然后被 html-to-image 库捕获生成图片。
 * 
 * Requirements:
 * - 3.2: 在顶部显示对话标题和模型名称
 * - 3.3: 清晰区分用户消息和 AI 消息（不同背景色）
 */
export const LongImageRenderer = forwardRef<HTMLDivElement, LongImageRendererProps>(
  function LongImageRenderer({ messages, metadata, options, theme, onRenderComplete }, ref) {
    // 获取主题配色
    const colors = theme === 'dark' 
      ? IMAGE_EXPORT_CONFIG.DARK_THEME 
      : IMAGE_EXPORT_CONFIG.LIGHT_THEME;

    // 渲染完成后调用回调
    const handleRef = useCallback((element: HTMLDivElement | null) => {
      if (element && onRenderComplete) {
        // 等待 DOM 渲染完成
        requestAnimationFrame(() => {
          onRenderComplete(element);
        });
      }
      // 同步 ref
      if (typeof ref === 'function') {
        ref(element);
      } else if (ref) {
        ref.current = element;
      }
    }, [ref, onRenderComplete]);

    return (
      <div
        ref={handleRef}
        style={{
          width: `${IMAGE_EXPORT_CONFIG.WIDTH}px`,
          backgroundColor: colors.background,
          color: colors.textColor,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          fontSize: '14px',
          lineHeight: '1.6',
        }}
      >
        {/* 头部区域 - Requirements: 3.2 */}
        <Header metadata={metadata} colors={colors} />
        
        {/* 消息列表 - Requirements: 2.1, 2.2, 3.3 */}
        <div style={{ padding: `${IMAGE_EXPORT_CONFIG.PADDING}px` }}>
          {messages.map((message, index) => (
            <MessageItem
              key={message.id}
              message={message}
              options={options}
              colors={colors}
              isLast={index === messages.length - 1}
            />
          ))}
        </div>
        
        {/* 页脚区域 */}
        <Footer colors={colors} />
      </div>
    );
  }
);

// ============ 子组件 ============

/** 头部组件 Props */
interface HeaderProps {
  metadata: ExportMetadata;
  colors: ThemeColors;
}

/**
 * 头部组件
 * 显示对话标题、模型名称和导出时间
 * Requirements: 3.2
 */
function Header({ metadata, colors }: HeaderProps) {
  return (
    <div
      style={{
        backgroundColor: colors.headerBackground,
        padding: `${IMAGE_EXPORT_CONFIG.PADDING}px`,
        borderBottom: `1px solid ${colors.borderColor}`,
      }}
    >
      {/* 标题 */}
      <h1
        style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: 600,
          color: colors.textColor,
          marginBottom: '8px',
        }}
      >
        {metadata.title || '对话记录'}
      </h1>
      
      {/* 元信息 */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          fontSize: '13px',
          color: colors.secondaryTextColor,
        }}
      >
        <span>模型: {metadata.modelName || '未知'}</span>
        <span>导出时间: {formatTimestamp(metadata.exportedAt)}</span>
      </div>
    </div>
  );
}

/** 消息项组件 Props */
interface MessageItemProps {
  message: Message;
  options: LongImageOptions;
  colors: ThemeColors;
  isLast: boolean;
}

/**
 * 消息项组件
 * 渲染单条消息，包括角色标识、时间戳、思维链和内容
 * 
 * Requirements:
 * - 3.3: 清晰区分用户消息和 AI 消息（不同背景色）
 * - 3.5: 根据选项显示时间戳
 * - 3.6: 根据选项渲染思维链内容
 */
function MessageItem({ message, options, colors, isLast }: MessageItemProps) {
  const isUser = message.role === 'user';
  const backgroundColor = isUser 
    ? colors.userMessageBackground 
    : colors.aiMessageBackground;
  const roleEmoji = isUser ? '👤' : '🤖';
  const roleLabel = getRoleLabel(message.role);

  return (
    <div
      style={{
        backgroundColor,
        borderRadius: '8px',
        padding: '16px',
        marginBottom: isLast ? 0 : `${IMAGE_EXPORT_CONFIG.MESSAGE_GAP}px`,
        border: `1px solid ${colors.borderColor}`,
      }}
    >
      {/* 消息头部：角色和时间戳 */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        {/* 角色标识 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: 600,
            fontSize: '14px',
          }}
        >
          <span>{roleEmoji}</span>
          <span>{roleLabel}</span>
        </div>
        
        {/* 时间戳 - Requirements: 3.5 */}
        {options.includeTimestamps && message.timestamp && (
          <span
            style={{
              fontSize: '12px',
              color: colors.secondaryTextColor,
            }}
          >
            {formatTimestamp(message.timestamp)}
          </span>
        )}
      </div>
      
      {/* 思维链内容 - Requirements: 3.6 */}
      {options.includeThoughts && message.thoughtSummary && (
        <ThoughtContent 
          thoughtSummary={message.thoughtSummary} 
          colors={colors} 
        />
      )}
      
      {/* 消息内容 - Requirements: 2.3, 2.4 */}
      <ExportMarkdownRenderer content={message.content} colors={colors} />
      
      {/* 用户附件图片 */}
      {message.attachments && message.attachments.length > 0 && (
        <AttachmentImages attachments={message.attachments} colors={colors} />
      )}
      
      {/* AI 生成的图片 */}
      {message.generatedImages && message.generatedImages.length > 0 && (
        <GeneratedImagesGrid images={message.generatedImages} colors={colors} />
      )}
    </div>
  );
}

/** 思维链内容组件 Props */
interface ThoughtContentProps {
  thoughtSummary: string;
  colors: ThemeColors;
}

/**
 * 思维链内容组件
 * 渲染 AI 的思考过程
 * Requirements: 3.6
 */
function ThoughtContent({ thoughtSummary, colors }: ThoughtContentProps) {
  return (
    <div
      style={{
        backgroundColor: colors.background,
        borderRadius: '6px',
        padding: '12px',
        marginBottom: '12px',
        borderLeft: `3px solid ${colors.borderColor}`,
      }}
    >
      {/* 思维链标题 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: 500,
          color: colors.secondaryTextColor,
          marginBottom: '8px',
        }}
      >
        <span>💭</span>
        <span>思考过程</span>
      </div>
      
      {/* 思维链内容 */}
      <div
        style={{
          fontSize: '13px',
          color: colors.secondaryTextColor,
          whiteSpace: 'pre-wrap',
          lineHeight: '1.5',
        }}
      >
        {thoughtSummary}
      </div>
    </div>
  );
}

/** AI 生成图片网格组件 Props */
interface GeneratedImagesGridProps {
  images: import('../../types').GeneratedImage[];
  colors: ThemeColors;
}

/**
 * AI 生成图片网格组件
 * 渲染 AI 模型生成的图片（如画图模型）
 */
function GeneratedImagesGrid({ images, colors }: GeneratedImagesGridProps) {
  // 计算网格布局：1张图片占满宽度，2张及以上使用2列网格
  const gridColumns = images.length === 1 ? 1 : 2;
  
  return (
    <div
      style={{
        marginTop: '12px',
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '8px',
      }}
    >
      {images.map((image, index) => (
        <div
          key={index}
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            border: `1px solid ${colors.borderColor}`,
            backgroundColor: colors.background,
          }}
        >
          <img
            src={`data:${image.mimeType};base64,${image.data}`}
            alt={`生成的图片 ${index + 1}`}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** 用户附件图片组件 Props */
interface AttachmentImagesProps {
  attachments: import('../../types').Attachment[];
  colors: ThemeColors;
}

/**
 * 用户附件图片组件
 * 渲染用户上传的图片附件
 */
function AttachmentImages({ attachments, colors }: AttachmentImagesProps) {
  // 只筛选图片类型的附件
  const imageAttachments = attachments.filter(att => att.type === 'image');
  
  if (imageAttachments.length === 0) return null;
  
  // 计算网格布局
  const gridColumns = imageAttachments.length === 1 ? 1 : 2;
  
  return (
    <div
      style={{
        marginTop: '12px',
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, 1fr)`,
        gap: '8px',
      }}
    >
      {imageAttachments.map((attachment) => (
        <div
          key={attachment.id}
          style={{
            borderRadius: '8px',
            overflow: 'hidden',
            border: `1px solid ${colors.borderColor}`,
            backgroundColor: colors.background,
          }}
        >
          <img
            src={`data:${attachment.mimeType};base64,${attachment.data}`}
            alt={attachment.name}
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      ))}
    </div>
  );
}

/** 页脚组件 Props */
interface FooterProps {
  colors: ThemeColors;
}

/**
 * 页脚组件
 * 显示导出来源标识
 */
function Footer({ colors }: FooterProps) {
  return (
    <div
      style={{
        backgroundColor: colors.headerBackground,
        padding: `${IMAGE_EXPORT_CONFIG.PADDING / 2}px ${IMAGE_EXPORT_CONFIG.PADDING}px`,
        borderTop: `1px solid ${colors.borderColor}`,
        textAlign: 'center',
        fontSize: '12px',
        color: colors.secondaryTextColor,
      }}
    >
      由 Gemini Chat 导出
    </div>
  );
}

// ============ 导出专用 Markdown 渲染器 ============

/** 导出 Markdown 渲染器 Props */
interface ExportMarkdownRendererProps {
  content: string;
  colors: ThemeColors;
}

/**
 * 导出专用 Markdown 渲染器
 * 使用内联样式确保 html-to-image 能正确捕获样式
 * 
 * Requirements: 2.3, 2.4
 */
function ExportMarkdownRenderer({ content, colors }: ExportMarkdownRendererProps) {
  // 创建使用内联样式的组件
  const components: Components = useMemo(() => ({
    // 段落
    p: ({ children }) => (
      <p style={{ margin: '8px 0', lineHeight: '1.7' }}>{children}</p>
    ),
    
    // 标题
    h1: ({ children }) => (
      <h1 style={{ 
        fontSize: '20px', 
        fontWeight: 600, 
        margin: '16px 0 8px',
        borderBottom: `1px solid ${colors.borderColor}`,
        paddingBottom: '4px',
      }}>{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 style={{ 
        fontSize: '18px', 
        fontWeight: 600, 
        margin: '14px 0 6px',
        borderBottom: `1px solid ${colors.borderColor}`,
        paddingBottom: '4px',
      }}>{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '12px 0 4px' }}>{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 style={{ fontSize: '15px', fontWeight: 600, margin: '10px 0 4px' }}>{children}</h4>
    ),
    h5: ({ children }) => (
      <h5 style={{ fontSize: '14px', fontWeight: 600, margin: '8px 0 4px' }}>{children}</h5>
    ),
    h6: ({ children }) => (
      <h6 style={{ fontSize: '13px', fontWeight: 500, margin: '8px 0 4px', color: colors.secondaryTextColor }}>{children}</h6>
    ),
    
    // 列表
    ul: ({ children }) => (
      <ul style={{ 
        margin: '8px 0', 
        paddingLeft: '24px',
        listStyleType: 'disc',
      }}>{children}</ul>
    ),
    ol: ({ children }) => (
      <ol style={{ 
        margin: '8px 0', 
        paddingLeft: '24px',
        listStyleType: 'decimal',
      }}>{children}</ol>
    ),
    li: ({ children }) => (
      <li style={{ margin: '4px 0', lineHeight: '1.6' }}>{children}</li>
    ),
    
    // 链接
    a: ({ children, href }) => (
      <a 
        href={href} 
        style={{ 
          color: '#3b82f6', 
          textDecoration: 'underline',
        }}
      >{children}</a>
    ),
    
    // 强调
    strong: ({ children }) => (
      <strong style={{ fontWeight: 600 }}>{children}</strong>
    ),
    em: ({ children }) => (
      <em style={{ fontStyle: 'italic' }}>{children}</em>
    ),
    
    // 行内代码 - Requirements: 2.4
    code: ({ children, className }) => {
      // 检查是否为代码块（有 language- 前缀）
      const isCodeBlock = className && /language-\w+/.test(className);
      
      if (isCodeBlock) {
        // 代码块内容由 pre 处理
        return <code>{children}</code>;
      }
      
      // 行内代码
      return (
        <code
          style={{
            backgroundColor: colors.headerBackground,
            padding: '2px 6px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            border: `1px solid ${colors.borderColor}`,
          }}
        >
          {children}
        </code>
      );
    },
    
    // 代码块 - Requirements: 2.3
    pre: ({ children }) => (
      <pre
        style={{
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
          padding: '12px 16px',
          borderRadius: '6px',
          margin: '12px 0',
          overflow: 'auto',
          fontSize: '13px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          lineHeight: '1.5',
        }}
      >
        {children}
      </pre>
    ),
    
    // 引用块
    blockquote: ({ children }) => (
      <blockquote
        style={{
          borderLeft: '4px solid #3b82f6',
          paddingLeft: '16px',
          margin: '12px 0',
          color: colors.secondaryTextColor,
          fontStyle: 'italic',
        }}
      >
        {children}
      </blockquote>
    ),
    
    // 水平线
    hr: () => (
      <hr style={{ 
        border: 'none', 
        borderTop: `1px solid ${colors.borderColor}`,
        margin: '16px 0',
      }} />
    ),
    
    // 表格
    table: ({ children }) => (
      <div style={{ overflowX: 'auto', margin: '12px 0' }}>
        <table style={{ 
          borderCollapse: 'collapse', 
          width: '100%',
          border: `1px solid ${colors.borderColor}`,
          borderRadius: '6px',
        }}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead style={{ backgroundColor: colors.headerBackground }}>{children}</thead>
    ),
    tbody: ({ children }) => (
      <tbody>{children}</tbody>
    ),
    tr: ({ children }) => (
      <tr style={{ borderBottom: `1px solid ${colors.borderColor}` }}>{children}</tr>
    ),
    th: ({ children }) => (
      <th style={{ 
        padding: '8px 12px', 
        textAlign: 'left',
        fontWeight: 600,
        borderBottom: `1px solid ${colors.borderColor}`,
      }}>{children}</th>
    ),
    td: ({ children }) => (
      <td style={{ 
        padding: '8px 12px',
        borderBottom: `1px solid ${colors.borderColor}`,
      }}>{children}</td>
    ),
    
    // 图片
    img: ({ src, alt }) => (
      <img 
        src={src} 
        alt={alt} 
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          borderRadius: '6px',
          margin: '8px 0',
        }} 
      />
    ),
  }), [colors]);

  return (
    <div style={{ color: colors.textColor }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export default LongImageRenderer;
