/**
 * 应用数据模型类型定义
 * 需求: 4.1, 5.1, 6.3
 */

import type { GenerationConfig, SafetySetting } from './gemini';
import type { FileReference } from './filesApi';

// ============ 对话相关类型 ============

/**
 * 对话模型
 * 需求: 4.1
 */
export interface Conversation {
  /** 对话唯一标识 */
  id: string;
  /** 对话标题 */
  title: string;
  /** 消息历史 */
  messages: Message[];
  /** 使用的模型 */
  model: string;
  /** 对话级别的系统指令（可选） */
  systemInstruction?: string;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * Token 使用量
 * 需求: 7.1, 7.2, 1.4
 */
export interface MessageTokenUsage {
  /** 输入 Token 数 */
  promptTokens: number;
  /** 输出 Token 数 */
  completionTokens: number;
  /** 思维链 Token 数 */
  thoughtsTokens?: number;
  /** 总 Token 数 */
  totalTokens: number;
}

/**
 * 生成的图片数据
 * 用于存储 AI 模型生成的图片（如 Gemini 3 Pro Image、Gemini 2.5 Flash Image）
 * 需求: 2.1, 4.1
 */
export interface GeneratedImage {
  /** 图片 MIME 类型（如 image/jpeg, image/png） */
  mimeType: string;
  /** Base64 编码的图片数据 */
  data: string;
}

/**
 * 消息模型
 * 需求: 5.1, 4.3, 7.2
 */
export interface Message {
  /** 消息唯一标识 */
  id: string;
  /** 消息角色：用户或模型 */
  role: 'user' | 'model';
  /** 消息文本内容 */
  content: string;
  /** 附件列表（可选） */
  attachments?: Attachment[];
  /** 消息时间戳 */
  timestamp: number;
  /** 思维链摘要（可选） - 需求: 4.3 */
  thoughtSummary?: string;
  /** 思维链签名（用于画图模型连续对话） - 需求: 2.6 */
  thoughtSignature?: string;
  /** 思维链中的图片（可选） - 不进入图片库，仅在思维链区域显示 */
  thoughtImages?: GeneratedImage[];
  /** Token 使用量（可选） - 需求: 7.2 */
  tokenUsage?: MessageTokenUsage;
  /** 请求耗时（毫秒，可选） - 需求: 8.4 */
  duration?: number;
  /** 首字节时间（毫秒，可选） - 需求: 8.3 */
  ttfb?: number;
  /** 错误信息（可选） - 用于持久化消息发送/重新生成失败的错误状态 */
  error?: string;
  /** 生成的图片列表（可选） - AI 模型生成的图片 - 需求: 2.1 */
  generatedImages?: GeneratedImage[];
  /** 文件引用列表（通过 Files API 上传的文件）- 需求: 1.1, 1.2 */
  fileReferences?: FileReference[];
}

/**
 * 附件模型
 * 需求: 6.3
 */
export interface Attachment {
  /** 附件唯一标识 */
  id: string;
  /** 附件类型：图片或文件 */
  type: 'image' | 'file';
  /** 文件名 */
  name: string;
  /** MIME 类型 */
  mimeType: string;
  /** base64 编码的数据 */
  data: string;
  /** 文件大小（字节） */
  size: number;
}

// ============ 设置相关类型 ============

/**
 * 应用设置模型
 */
export interface AppSettings {
  /** API 端点地址 */
  apiEndpoint: string;
  /** API 密钥 */
  apiKey: string;
  /** 当前选择的模型 */
  currentModel: string;
  /** 生成配置参数 */
  generationConfig: GenerationConfig;
  /** 安全设置 */
  safetySettings: SafetySetting[];
  /** 全局系统指令 */
  systemInstruction: string;
  /** 主题设置 */
  theme: ThemeMode;
  /** 侧边栏是否折叠 */
  sidebarCollapsed: boolean;
  /** 是否启用流式输出 - Requirements: 10.5, 10.6 */
  streamingEnabled: boolean;
  /** 是否启用 Files API 上传模式 - Requirements: 1.2, 1.5 */
  filesApiEnabled: boolean;
}

/**
 * 主题模式
 */
export type ThemeMode = 'light' | 'dark' | 'system';

/**
 * API 配置
 */
export interface ApiConfig {
  /** API 端点地址 */
  endpoint: string;
  /** API 密钥 */
  apiKey: string;
  /** 模型名称 */
  model: string;
}

// ============ 预设模型 ============

/**
 * 模型信息
 */
export interface ModelInfo {
  /** 模型 ID */
  id: string;
  /** 模型显示名称 */
  name: string;
  /** 模型描述 */
  description: string;
}

// ============ 模型管理相关类型 ============

/**
 * API 提供商类型
 * 需求: 1.2, 1.3
 */
export type ApiProvider = 'gemini' | 'openai';

/**
 * 思考深度级别
 * 需求: 4.1
 * - 'minimal': 最少思考，最快响应
 * - 'low': 低度思考，快速响应
 * - 'medium': 中度思考，平衡速度和深度
 * - 'high': 深度思考，适合复杂问题
 */
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

/**
 * 思考配置类型
 * 需求: 2.1, 3.1
 * - 'level': 使用思考等级（Gemini 3 系列）
 * - 'budget': 使用思考预算（Gemini 2.5 系列）
 * - 'none': 不支持思考配置
 */
export type ThinkingConfigType = 'level' | 'budget' | 'none';

/**
 * 思考预算配置
 * 需求: 3.1, 3.2, 3.3
 */
export interface ThinkingBudgetConfig {
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 默认值（-1 表示动态，0 表示关闭） */
  defaultValue: number;
  /** 是否支持禁用（设为 0） */
  canDisable: boolean;
}

/**
 * 媒体分辨率级别
 * 需求: 4.2, 4.5, 4.6, 4.7
 * 使用 API 实际参数值格式
 */
export type MediaResolution =
  | 'MEDIA_RESOLUTION_LOW'
  | 'MEDIA_RESOLUTION_MEDIUM'
  | 'MEDIA_RESOLUTION_HIGH';

/**
 * 图片宽高比
 * 需求: 2.1, 2.2, 7.2
 */
export type ImageAspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4' | '3:2' | '2:3' | '5:4' | '4:5' | '21:9';

/**
 * 图片分辨率
 * 需求: 2.3, 2.4
 */
export type ImageSize = '1K' | '2K' | '4K';

/**
 * 图片生成配置
 * 需求: 2.1, 2.5
 */
export interface ImageGenerationConfig {
  /** 图片宽高比 */
  aspectRatio: ImageAspectRatio;
  /** 图片分辨率 */
  imageSize: ImageSize;
}

/**
 * 默认图片生成配置
 */
export const DEFAULT_IMAGE_GENERATION_CONFIG: ImageGenerationConfig = {
  aspectRatio: '1:1',
  imageSize: '1K',
};

/**
 * 模型能力标识
 * 需求: 4.1, 4.2, 4.5, 2.1, 3.1, 5.1
 */
export interface ModelCapabilities {
  /** 是否支持 thinking_level 参数 */
  supportsThinking?: boolean;
  /** 是否支持 media_resolution 参数 */
  supportsMediaResolution?: boolean;
  /** 是否支持图像生成 */
  supportsImageGeneration?: boolean;
  /** 是否支持图片分辨率设置（仅图片生成模型） - 需求: 3.1 */
  supportsImageSize?: boolean;
  /** 最大输入 token 数 */
  maxInputTokens?: number;
  /** 最大输出 token 数 */
  maxOutputTokens?: number;
  /** 思考配置类型 - 需求: 2.1, 3.1 */
  thinkingConfigType?: ThinkingConfigType;
  /** 支持的思考等级列表（仅 thinkingConfigType 为 'level' 时有效） - 需求: 1.1, 1.2 */
  supportedThinkingLevels?: ThinkingLevel[];
  /** 思考预算配置（仅 budget 类型） - 需求: 3.1, 3.2, 3.3 */
  thinkingBudgetConfig?: ThinkingBudgetConfig;
  /** 是否支持思维链 - 需求: 5.1 */
  supportsThoughtSummary?: boolean;
}

/**
 * 模型高级参数配置
 * 需求: 4.1, 4.2, 1.6, 2.6, 3.4, 4.2
 */
export interface ModelAdvancedConfig {
  /** 思考深度级别 */
  thinkingLevel?: ThinkingLevel;
  /** 媒体分辨率 */
  mediaResolution?: MediaResolution;
  /** 图片生成配置 */
  imageConfig?: ImageGenerationConfig;
  /** 思考预算（token 数量，-1 为动态，0 为关闭） - 需求: 3.4 */
  thinkingBudget?: number;
  /** 是否显示思维链 - 需求: 4.2 */
  includeThoughts?: boolean;
}

/**
 * 扩展的模型配置
 * 需求: 2.1, 3.1, 4.1
 */
export interface ModelConfig extends ModelInfo {
  /** 是否为自定义模型 */
  isCustom?: boolean;
  /** 重定向目标模型 ID（别名功能） */
  redirectTo?: string;
  /** 模型能力 */
  capabilities?: ModelCapabilities;
  /** 高级参数配置 */
  advancedConfig?: ModelAdvancedConfig;
  /** API 提供商 */
  provider?: ApiProvider;
  /** 是否启用（显示在对话模型选择中） - 需求: 4.1 */
  enabled?: boolean;
}

/**
 * 模型管理状态
 * 需求: 1.1, 2.1
 */
export interface ModelManagerState {
  /** 所有模型配置（预设 + 自定义） */
  models: ModelConfig[];
  /** 是否正在加载模型列表 */
  isLoading: boolean;
  /** 错误信息 */
  error?: string;
}

/**
 * 预设模型能力映射
 * 需求: 1.1, 2.1, 3.1, 3.2, 3.3, 5.4
 */
export const MODEL_CAPABILITIES: Record<string, ModelCapabilities> = {
  'gemini-3-pro-preview': {
    supportsThinking: true,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,  // 需求: 2.1
    // 思考配置 - 需求: 2.1, 5.4, 1.1
    thinkingConfigType: 'level',
    supportedThinkingLevels: ['low', 'high'],  // 需求: 1.1
    supportsThoughtSummary: true,
  },
  'gemini-3-flash-preview': {
    supportsThinking: true,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,  // 需求: 2.3
    // 思考配置 - 支持 minimal/low/medium/high 四个等级 - 需求: 1.2
    thinkingConfigType: 'level',
    supportedThinkingLevels: ['minimal', 'low', 'medium', 'high'],  // 需求: 1.2
    supportsThoughtSummary: true,
  },
  'gemini-3-pro-image-preview': {
    supportsThinking: false,
    supportsImageGeneration: true,
    supportsMediaResolution: false,
    supportsImageSize: true,  // 需求: 3.4
    maxInputTokens: 65000,
    maxOutputTokens: 32768,  // 需求: 2.2
    // 思考配置 - 需求: 5.4
    thinkingConfigType: 'none',
    supportsThoughtSummary: true,
  },
  'gemini-2.5-pro': {
    supportsThinking: true,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,  // 需求: 2.5
    // 思考配置 - 需求: 3.1, 5.4
    thinkingConfigType: 'budget',
    thinkingBudgetConfig: {
      min: 128,
      max: 32768,
      defaultValue: -1,
      canDisable: false,
    },
    supportsThoughtSummary: true,
  },
  'gemini-2.5-flash': {
    supportsThinking: true,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,  // 需求: 2.6
    // 思考配置 - 需求: 3.2, 5.4
    thinkingConfigType: 'budget',
    thinkingBudgetConfig: {
      min: 0,
      max: 24576,
      defaultValue: -1,
      canDisable: true,
    },
    supportsThoughtSummary: true,
  },
  'gemini-2.5-flash-lite': {
    supportsThinking: false,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 65536,  // 需求: 2.7
    // 思考配置 - 需求: 3.3
    thinkingConfigType: 'budget',
    thinkingBudgetConfig: {
      min: 0,
      max: 24576,
      defaultValue: 0,
      canDisable: true,
    },
    supportsThoughtSummary: false,
  },
  'gemini-2.5-flash-image': {
    supportsThinking: false,
    supportsImageGeneration: true,
    supportsMediaResolution: false,
    supportsImageSize: false,  // 需求: 3.1 - 不支持分辨率设置
    maxInputTokens: 65000,
    maxOutputTokens: 32768,  // 需求: 2.4
    // 思考配置
    thinkingConfigType: 'none',
    supportsThoughtSummary: false,
  },
  'gemini-2.0-flash': {
    supportsThinking: false,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,  // 需求: 2.8
    // 思考配置
    thinkingConfigType: 'none',
    supportsThoughtSummary: false,
  },
  'gemini-2.0-flash-lite': {
    supportsThinking: false,
    supportsImageGeneration: false,
    supportsMediaResolution: true,
    maxInputTokens: 1000000,
    maxOutputTokens: 8192,  // 需求: 2.9
    // 思考配置
    thinkingConfigType: 'none',
    supportsThoughtSummary: false,
  },
};

/**
 * 获取模型能力
 * @param modelId 模型 ID
 * @returns 模型能力配置，如果未找到则返回空对象
 */
export function getModelCapabilities(modelId: string): ModelCapabilities {
  return MODEL_CAPABILITIES[modelId] || {};
}

/**
 * 预设的 Gemini 模型列表
 */
export const GEMINI_MODELS: ModelInfo[] = [
  // Gemini 3 系列 - 最智能的模型
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro', description: '最智能的多模态理解模型，最强大的代理和编程模型' },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash', description: '快速智能模型，支持四级思考深度调节' },
  { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', description: '支持图像生成的 Gemini 3 Pro' },
  
  // Gemini 2.5 Pro 系列 - 高级思考模型
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: '最先进的思考模型，擅长代码、数学和 STEM 推理' },
  
  // Gemini 2.5 Flash 系列 - 快速智能模型
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: '性价比最佳，适合大规模处理和代理用例' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', description: '超快速模型，优化成本效率和高吞吐量' },
  { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: '支持图像生成的 Flash 模型' },
  
  // Gemini 2.0 系列 - 第二代主力模型
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', description: '第二代主力模型，100万 token 上下文' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash-Lite', description: '第二代快速模型，优化成本和延迟' },
];

// ============ 默认值 ============

/**
 * 官方 API 端点地址
 * 需求: 1.1
 */
export const OFFICIAL_API_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * 默认 API 端点（空字符串表示使用官方地址）
 * 需求: 1.1
 */
export const DEFAULT_API_ENDPOINT = '';

/**
 * 默认模型
 */
export const DEFAULT_MODEL = 'gemini-2.5-flash';

/**
 * 默认应用设置
 */
export const DEFAULT_APP_SETTINGS: AppSettings = {
  apiEndpoint: DEFAULT_API_ENDPOINT,
  apiKey: '',
  currentModel: DEFAULT_MODEL,
  generationConfig: {
    temperature: 1,
    topP: 0.95,
    topK: 40,
  },
  safetySettings: [],
  systemInstruction: '',
  theme: 'system',
  sidebarCollapsed: false,
  streamingEnabled: true, // 默认启用流式输出 - Requirements: 10.6
  filesApiEnabled: false, // 默认关闭 Files API 模式 - Requirements: 1.2
};

// ============ 文件限制常量 ============

/**
 * 图片文件大小限制（20MB）
 */
export const IMAGE_SIZE_LIMIT = 20 * 1024 * 1024;

/**
 * 文档文件大小限制（50MB）
 */
export const DOCUMENT_SIZE_LIMIT = 50 * 1024 * 1024;

/**
 * 支持的图片 MIME 类型
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

/**
 * 支持的文档 MIME 类型
 */
export const SUPPORTED_DOCUMENT_TYPES = [
  'application/pdf',
  'text/plain',
  'text/javascript',
  'text/typescript',
  'text/x-python',
  'text/x-java',
  'text/css',
  'text/html',
  'application/json',
  'application/xml',
];

/**
 * 代码文件扩展名到 MIME 类型的映射
 */
export const CODE_FILE_EXTENSIONS: Record<string, string> = {
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.jsx': 'text/javascript',
  '.tsx': 'text/typescript',
  '.py': 'text/x-python',
  '.java': 'text/x-java',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.md': 'text/plain',
  '.txt': 'text/plain',
};

// ============ 导入导出相关类型 ============

/**
 * 导出数据格式（新版，支持 ChatWindow）
 */
export interface ExportDataV2 {
  /** 数据版本 */
  version: string;
  /** 导出时间戳 */
  exportedAt: number;
  /** 聊天窗口列表（新版格式） */
  chatWindows: import('./chatWindow').ChatWindow[];
  /** 应用设置 */
  settings: AppSettings;
}

/**
 * 导出数据格式（旧版，兼容 Conversation）
 */
export interface ExportData {
  /** 数据版本 */
  version: string;
  /** 导出时间戳 */
  exportedAt: number;
  /** 对话列表（旧版格式） */
  conversations: Conversation[];
  /** 应用设置 */
  settings: AppSettings;
}

/**
 * 导入数据格式（支持新旧两种格式）
 */
export type ImportData = ExportData | ExportDataV2;

/**
 * 当前导出数据版本（旧版）
 */
export const EXPORT_DATA_VERSION = '1.0.0';

/**
 * 新版导出数据版本
 */
export const EXPORT_DATA_VERSION_V2 = '2.0.0';
