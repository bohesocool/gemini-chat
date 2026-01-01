/**
 * 提示词模板类型定义
 * 需求: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

/**
 * 提示词模板接口
 */
export interface PromptTemplate {
  /** 唯一标识 */
  id: string;
  /** 模板名称 */
  name: string;
  /** 模板描述 */
  description: string;
  /** 系统指令内容 */
  systemInstruction: string;
  /** 是否为内置模板（内置模板不可删除） */
  isBuiltIn: boolean;
  /** 创建时间戳 */
  createdAt: number;
  /** 更新时间戳 */
  updatedAt: number;
}

/**
 * 创建模板时的输入类型（不包含自动生成的字段）
 */
export type CreateTemplateInput = Omit<PromptTemplate, 'id' | 'createdAt' | 'updatedAt' | 'isBuiltIn'>;

/**
 * 更新模板时的输入类型
 */
export type UpdateTemplateInput = Partial<Pick<PromptTemplate, 'name' | 'description' | 'systemInstruction'>>;

/**
 * 模板 Store 状态接口
 */
export interface TemplateState {
  /** 模板列表 */
  templates: PromptTemplate[];
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
}

/**
 * 模板 Store 操作接口
 */
export interface TemplateActions {
  /** 从存储加载模板 */
  loadTemplates: () => Promise<void>;
  /** 添加新模板 */
  addTemplate: (template: CreateTemplateInput) => Promise<PromptTemplate>;
  /** 更新模板 */
  updateTemplate: (id: string, updates: UpdateTemplateInput) => Promise<PromptTemplate | null>;
  /** 删除模板（内置模板不可删除） */
  deleteTemplate: (id: string) => Promise<boolean>;
  /** 根据 ID 获取模板 */
  getTemplateById: (id: string) => PromptTemplate | undefined;
}

/**
 * 完整的模板 Store 类型
 */
export type TemplateStore = TemplateState & TemplateActions;
