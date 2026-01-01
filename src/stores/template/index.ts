/**
 * 模板 Store 导出
 */

export { useTemplateStore } from './store';
export { DEFAULT_TEMPLATES, generateTemplateId } from './defaults';
export type {
  PromptTemplate,
  CreateTemplateInput,
  UpdateTemplateInput,
  TemplateState,
  TemplateActions,
  TemplateStore,
} from './types';
