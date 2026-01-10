/**
 * Gemini API 相关类型定义
 * 需求: 2.1, 5.6, 12.1
 */

// ============ 请求相关类型 ============

/**
 * 思考配置
 * 需求: 1.3, 1.4, 3.8, 4.2
 */
export interface ThinkingConfig {
  /** 思考深度级别（Gemini 3 系列） */
  thinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
  /** 思考预算（Gemini 2.5 系列，token 数量，-1 为动态） */
  thinkingBudget?: number;
  /** 是否包含思维链 */
  includeThoughts?: boolean;
}

/**
 * 思维链部分
 * 需求: 4.3
 */
export interface ThoughtPart {
  /** 思维链文本内容 */
  text: string;
  /** 标识这是思维链内容 */
  thought: true;
  /** 思维链签名（用于画图模型连续对话） */
  thoughtSignature?: string;
}

/**
 * 思维链签名部分（用于画图模型连续对话）
 * 需求: 2.6
 */
export interface ThoughtSignaturePart {
  /** 思维链签名 */
  thoughtSignature: string;
}

/**
 * 图片生成 API 配置
 * 需求: 2.5, 3.1
 */
export interface ImageConfig {
  /** 图片宽高比 */
  aspectRatio: string;
  /** 图片分辨率（可选，gemini-2.5-flash-image 不支持） */
  imageSize?: string;
}

// ============ 工具相关类型 ============

/**
 * Google 搜索工具配置
 * 需求: 联网搜索功能
 */
export interface GoogleSearchTool {
  /** Google 搜索工具（空对象表示启用） */
  googleSearch: Record<string, never>;
}

/**
 * URL 上下文工具配置
 * 需求: URL 上下文功能 2.1
 */
export interface UrlContextTool {
  /** URL 上下文工具（空对象表示启用） */
  urlContext: Record<string, never>;
}

/**
 * Gemini API 工具配置
 * 需求: 联网搜索功能, URL 上下文功能
 */
export type GeminiTool = GoogleSearchTool | UrlContextTool;

/**
 * Gemini API 请求体
 * 注意: thinkingConfig 和 imageConfig 已移至 generationConfig 内部
 */
export interface GeminiRequest {
  contents: GeminiContent[];
  generationConfig?: GenerationConfig;
  safetySettings?: SafetySetting[];
  systemInstruction?: GeminiContent;
  /** 工具配置（如 Google 搜索） */
  tools?: GeminiTool[];
}

/**
 * Gemini 内容对象，包含角色和内容部分
 */
export interface GeminiContent {
  role: 'user' | 'model';
  parts: GeminiPart[];
}

/**
 * Gemini 内容部分，可以是文本、内联数据（图片/文件）、文件引用、思维链或思维链签名
 * 需求: 4.1, 4.2, 4.3
 */
export type GeminiPart = GeminiTextPart | GeminiInlineDataPart | GeminiFileDataPart | ThoughtPart | ThoughtSignaturePart;

/**
 * 文本类型的内容部分
 */
export interface GeminiTextPart {
  text: string;
}

/**
 * 内联数据类型的内容部分（用于图片和文件的 base64 编码）
 */
export interface GeminiInlineDataPart {
  inlineData: {
    mimeType: string;
    data: string; // base64 编码
  };
}

/**
 * 文件数据类型的内容部分（用于 Files API 上传的文件引用）
 * 需求: 4.1 - 使用 file_data 格式引用已上传的文件
 */
export interface GeminiFileDataPart {
  file_data: {
    /** 文件 URI，从 Files API 上传结果获取 */
    file_uri: string;
    /** 文件 MIME 类型 */
    mime_type: string;
  };
}

/**
 * 生成配置参数
 * 需求: 2.1, 4.4, 4.5, 4.6, 4.7
 * 注意: thinkingConfig 和 imageConfig 必须放在 generationConfig 内部
 */
export interface GenerationConfig {
  /** 温度参数，控制随机性，范围 0-2，默认 1 */
  temperature?: number;
  /** Top-P 采样参数，范围 0-1，默认 0.95 */
  topP?: number;
  /** Top-K 采样参数，默认 40 */
  topK?: number;
  /** 最大输出 token 数 */
  maxOutputTokens?: number;
  /** 停止序列数组 */
  stopSequences?: string[];
  /** 响应模态（用于画图模型支持连续对话） */
  responseModalities?: ('TEXT' | 'IMAGE')[];
  /** 思考配置（必须放在 generationConfig 内部） */
  thinkingConfig?: ThinkingConfig;
  /** 图片生成配置（必须放在 generationConfig 内部） */
  imageConfig?: ImageConfig;
  /** 媒体分辨率（用于控制输入媒体的处理分辨率） - 需求: 4.4, 4.5, 4.6, 4.7 */
  mediaResolution?: import('../types/models').MediaResolution;
}

// ============ 安全设置相关类型 ============

/**
 * 安全设置
 * 需求: 12.1
 */
export interface SafetySetting {
  category: HarmCategory;
  threshold: HarmBlockThreshold;
}

/**
 * 危害类别
 */
export type HarmCategory =
  | 'HARM_CATEGORY_HARASSMENT'
  | 'HARM_CATEGORY_HATE_SPEECH'
  | 'HARM_CATEGORY_SEXUALLY_EXPLICIT'
  | 'HARM_CATEGORY_DANGEROUS_CONTENT';

/**
 * 危害阻止阈值
 */
export type HarmBlockThreshold =
  | 'BLOCK_NONE'
  | 'BLOCK_LOW_AND_ABOVE'
  | 'BLOCK_MEDIUM_AND_ABOVE'
  | 'BLOCK_ONLY_HIGH';

// ============ 响应相关类型 ============

/**
 * Gemini API 响应体
 */
export interface GeminiResponse {
  candidates: GeminiCandidate[];
  usageMetadata?: UsageMetadata;
}

/**
 * 响应候选项
 */
export interface GeminiCandidate {
  content: GeminiContent;
  finishReason: string;
  safetyRatings: SafetyRating[];
}

/**
 * 安全评级
 */
export interface SafetyRating {
  category: HarmCategory;
  probability: string;
}

/**
 * 使用量元数据
 */
export interface UsageMetadata {
  promptTokenCount: number;
  candidatesTokenCount: number;
  totalTokenCount: number;
}

// ============ 流式响应相关类型 ============

/**
 * 流式响应块的 Token 使用量元数据
 * 需求: 1.1
 */
export interface StreamUsageMetadata {
  /** 输入 Token 数 */
  promptTokenCount: number;
  /** 输出 Token 数（候选响应） */
  candidatesTokenCount: number;
  /** 总 Token 数 */
  totalTokenCount: number;
  /** 思维链 Token 数 */
  thoughtsTokenCount?: number;
  /** 输入 Token 详情 */
  promptTokensDetails?: {
    modality: string;
    tokenCount: number;
  }[];
}

/**
 * URL 检索状态枚举
 * 需求: 3.2
 */
export type UrlRetrievalStatus =
  | 'URL_RETRIEVAL_STATUS_SUCCESS'
  | 'URL_RETRIEVAL_STATUS_UNSAFE'
  | 'URL_RETRIEVAL_STATUS_UNSPECIFIED'
  | 'URL_RETRIEVAL_STATUS_ERROR';

/**
 * 单个 URL 的元数据
 * 需求: 3.2
 */
export interface UrlMetadata {
  /** 检索的 URL */
  retrievedUrl: string;
  /** 检索状态 */
  urlRetrievalStatus: UrlRetrievalStatus;
}

/**
 * URL 上下文元数据
 * 需求: 3.2
 */
export interface UrlContextMetadata {
  /** URL 元数据数组 */
  urlMetadata: UrlMetadata[];
}

/**
 * 流式响应块
 * 需求: 1.1, 3.1, 3.2
 */
export interface StreamChunk {
  candidates?: {
    content?: GeminiContent;
    finishReason?: string;
  }[];
  /** Token 使用量元数据 */
  usageMetadata?: StreamUsageMetadata;
  /** 模型版本 */
  modelVersion?: string;
  /** 响应 ID */
  responseId?: string;
  /** URL 上下文元数据 - 需求: 3.1, 3.2 */
  urlContextMetadata?: UrlContextMetadata;
}

// ============ 常量定义 ============

/**
 * 所有危害类别列表
 */
export const HARM_CATEGORIES: HarmCategory[] = [
  'HARM_CATEGORY_HARASSMENT',
  'HARM_CATEGORY_HATE_SPEECH',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT',
  'HARM_CATEGORY_DANGEROUS_CONTENT',
];

/**
 * 所有阻止阈值列表
 */
export const HARM_BLOCK_THRESHOLDS: HarmBlockThreshold[] = [
  'BLOCK_NONE',
  'BLOCK_LOW_AND_ABOVE',
  'BLOCK_MEDIUM_AND_ABOVE',
  'BLOCK_ONLY_HIGH',
];

/**
 * 默认生成配置
 */
export const DEFAULT_GENERATION_CONFIG: GenerationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 40,
};
