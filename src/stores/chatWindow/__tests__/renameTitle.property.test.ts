/**
 * 手动重命名标记持久化的属性测试
 *
 * 使用 fast-check 库验证：当用户通过重命名操作更新标题后，
 * 该窗口的 titleGenerated 字段应为 true。
 *
 * 这是一个 store 级别的测试，直接测试 updateWindow 函数
 * 在接收 { title, titleGenerated: true } 参数时的行为。
 *
 * Validates: Requirements 4.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fc from 'fast-check';

// vi.mock 会被提升到文件顶部，工厂函数内不能引用外部变量
// 因此在工厂函数内部直接定义 mock 对象

// mock logger 服务，避免日志输出干扰
vi.mock('../../../services/logger', () => {
  const logger = {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    group: vi.fn(),
    groupEnd: vi.fn(),
    time: vi.fn(),
    timeEnd: vi.fn(),
  };
  return {
    createLogger: vi.fn(() => logger),
    storeLogger: logger,
    appLogger: logger,
    apiLogger: logger,
    storageLogger: logger,
    authLogger: logger,
    configureLogger: vi.fn(),
    resetLoggerConfig: vi.fn(),
    getLoggerConfig: vi.fn(),
  };
});

// mock storage 服务，避免 IndexedDB 操作
vi.mock('../../../services/storage', () => ({
  saveChatWindow: vi.fn().mockResolvedValue(undefined),
  getAllChatWindows: vi.fn().mockResolvedValue([]),
  deleteChatWindow: vi.fn().mockResolvedValue(undefined),
  saveAllChatWindows: vi.fn().mockResolvedValue(undefined),
  saveModelConfigs: vi.fn().mockResolvedValue(undefined),
  loadModelConfigs: vi.fn().mockResolvedValue(null),
  resetModelConfigs: vi.fn().mockResolvedValue(undefined),
}));

// mock services/model，避免 API 调用依赖
vi.mock('../../../services/model', () => ({
  fetchModels: vi.fn().mockResolvedValue([]),
  mergeModels: vi.fn().mockReturnValue([]),
  getEffectiveConfig: vi.fn().mockReturnValue({}),
  getEffectiveCapabilities: vi.fn().mockReturnValue({}),
  detectModelCapabilities: vi.fn().mockReturnValue({}),
  setNewModelsDisabled: vi.fn().mockReturnValue([]),
}));

// mock gemini 服务，避免 API 调用
vi.mock('../../../services/gemini', () => ({
  sendMessageWithThoughts: vi.fn(),
  sendMessageNonStreamingWithThoughts: vi.fn(),
  GeminiApiError: class GeminiApiError extends Error {},
  GeminiRequestCancelledWithThoughtsError: class extends Error {},
}));

// mock i18n，避免翻译依赖
vi.mock('../../../i18n', () => ({
  getTranslation: vi.fn((key: string) => key),
}));

// mock titleGeneration 服务
vi.mock('../../../services/titleGeneration', () => ({
  triggerTitleGeneration: vi.fn(),
  shouldGenerateTitle: vi.fn().mockReturnValue(false),
  generateTitle: vi.fn(),
  cleanTitle: vi.fn(),
  buildTitlePrompt: vi.fn(),
}));

// 在所有 mock 之后导入 store
import { useChatWindowStore } from '../store';

describe('Feature: auto-title-generation, Property 4: 手动重命名标记持久化', () => {
  beforeEach(() => {
    // 每次测试前重置 store 状态
    useChatWindowStore.setState({
      windows: [],
      activeWindowId: null,
      isLoading: false,
      isSending: false,
      error: null,
      streamingText: '',
      streamingThought: '',
      initialized: false,
      currentRequestController: null,
    });
  });

  /**
   * **Validates: Requirements 4.1**
   *
   * 对于任意聊天窗口，当用户通过重命名操作更新标题后（调用 updateWindow
   * 传入 { title: newTitle, titleGenerated: true }），该窗口的 titleGenerated
   * 字段应为 true。
   *
   * 这模拟了 Sidebar.tsx 中 handleSaveRename 的行为：
   * updateWindow(editingId, { title: editingTitle.trim(), titleGenerated: true })
   */
  it('Feature: auto-title-generation, Property 4: 对于任意窗口和标题，重命名后 titleGenerated 应为 true', async () => {
    await fc.assert(
      fc.asyncProperty(
        // 生成非空的标题字符串（模拟 editingTitle.trim() 后的结果）
        fc.string({ minLength: 1, maxLength: 100 }).map((s) => s.trim()).filter((s) => s.length > 0),
        // 生成初始标题
        fc.string({ minLength: 1, maxLength: 50 }).map((s) => s.trim()).filter((s) => s.length > 0),
        async (newTitle, initialTitle) => {
          // 1. 创建一个窗口（titleGenerated 默认为 undefined）
          const store = useChatWindowStore.getState();
          const window = store.createWindow(undefined, initialTitle);

          // 验证初始状态：titleGenerated 应为 undefined（未设置）
          const initialWindow = useChatWindowStore.getState().windows.find((w) => w.id === window.id);
          expect(initialWindow?.titleGenerated).toBeUndefined();

          // 2. 模拟手动重命名操作：调用 updateWindow 设置新标题和 titleGenerated 标记
          //    这与 Sidebar.tsx 中 handleSaveRename 的行为一致
          await useChatWindowStore.getState().updateWindow(window.id, {
            title: newTitle,
            titleGenerated: true,
          });

          // 3. 验证：窗口的 titleGenerated 字段应为 true
          const updatedWindow = useChatWindowStore.getState().windows.find((w) => w.id === window.id);
          expect(updatedWindow).toBeDefined();
          expect(updatedWindow!.titleGenerated).toBe(true);
          expect(updatedWindow!.title).toBe(newTitle);

          // 清理：删除测试窗口，避免影响后续迭代
          useChatWindowStore.setState((state) => {
            const index = state.windows.findIndex((w) => w.id === window.id);
            if (index !== -1) {
              state.windows.splice(index, 1);
            }
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
