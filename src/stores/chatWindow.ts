/**
 * 聊天窗口状态管理 - 向后兼容导出
 * 需求: 2.3 - 确保向后兼容
 * 
 * 此文件保留以确保现有导入路径继续工作
 * 实际实现已拆分到 src/stores/chatWindow/ 目录
 */

// 重新导出所有内容以保持向后兼容
export { useChatWindowStore } from './chatWindow/store';
export type { 
  ChatWindowState, 
  ChatWindowActions, 
  ChatWindowStore,
} from './chatWindow/types';
