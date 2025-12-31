/**
 * ChatWindow Store 统一导出
 * 需求: 2.3 - 确保向后兼容
 */

// 导出 store
export { useChatWindowStore } from './store';

// 导出类型
export type { 
  ChatWindowState, 
  ChatWindowActions, 
  ChatWindowStore,
  SetState,
  GetState,
} from './types';
