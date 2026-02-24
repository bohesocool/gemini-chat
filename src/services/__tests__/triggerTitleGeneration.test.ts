/**
 * triggerTitleGeneration 函数的单元测试
 *
 * 测试标题生成编排流程：前置条件检查、竞态防护、错误处理等。
 *
 * Validates: Requirements 1.1, 1.2, 1.4, 4.2
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { triggerTitleGeneration } from '../titleGeneration';
import { useSettingsStore } from '../../stores/settings';
import { useChatWindowStore } from '../../stores/chatWindow';

// 模拟 gemini 服务，避免真实 API 调用
vi.mock('../gemini', () => ({
  sendMessageNonStreaming: vi.fn().mockResolvedValue('生成的标题'),
}));

// 模拟 storage 服务，避免 IndexedDB 操作
vi.mock('../storage', () => ({
  saveSettings: vi.fn().mockResolvedValue(undefined),
  getSettings: vi.fn().mockResolvedValue({
    apiEndpoint: 'https://api.test.com',
    apiKey: 'test-key',
    currentModel: 'gemini-pro',
    generationConfig: {},
    safetySettings: [],
    systemInstruction: '',
    theme: 'system',
    sidebarCollapsed: false,
    streamingEnabled: true,
    filesApiEnabled: false,
    autoTitleEnabled: true,
    titleModel: 'gemini-2.5-flash',
  }),
  saveChatWindow: vi.fn().mockResolvedValue(undefined),
  getAllChatWindows: vi.fn().mockResolvedValue([]),
  deleteChatWindow: vi.fn().mockResolvedValue(undefined),
}));

describe('triggerTitleGeneration', () => {
  const testWindowId = 'test-window-1';
  const testUserMessage = '你好，请帮我写一段代码';
  const testAiResponse = '好的，我来帮你写一段代码...';

  beforeEach(() => {
    vi.clearAllMocks();

    // 重置设置 store 到默认状态
    useSettingsStore.setState({
      apiEndpoint: 'https://api.test.com',
      apiKey: 'test-key',
      currentModel: 'gemini-pro',
      autoTitleEnabled: true,
      titleModel: 'gemini-2.5-flash',
    });
  });

  // --- 前置条件检查 ---

  it('autoTitleEnabled 为 false 时应跳过标题生成', async () => {
    useSettingsStore.setState({ autoTitleEnabled: false });

    // 设置一个窗口
    useChatWindowStore.setState({
      windows: [{
        id: testWindowId,
        title: '新对话',
        titleGenerated: undefined,
        config: {} as any,
        activeSubTopicId: '',
        subTopics: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    const updateWindowSpy = vi.spyOn(useChatWindowStore.getState(), 'updateWindow');

    await triggerTitleGeneration(testWindowId, testUserMessage, testAiResponse);

    // updateWindow 不应被调用
    expect(updateWindowSpy).not.toHaveBeenCalled();
  });

  it('titleGenerated 为 true 时应跳过标题生成', async () => {
    useChatWindowStore.setState({
      windows: [{
        id: testWindowId,
        title: '已有标题',
        titleGenerated: true,
        config: {} as any,
        activeSubTopicId: '',
        subTopics: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    const updateWindowSpy = vi.spyOn(useChatWindowStore.getState(), 'updateWindow');

    await triggerTitleGeneration(testWindowId, testUserMessage, testAiResponse);

    expect(updateWindowSpy).not.toHaveBeenCalled();
  });

  it('窗口不存在时应静默返回', async () => {
    useChatWindowStore.setState({ windows: [] });

    const updateWindowSpy = vi.spyOn(useChatWindowStore.getState(), 'updateWindow');

    // 不应抛出错误
    await triggerTitleGeneration('non-existent-id', testUserMessage, testAiResponse);

    expect(updateWindowSpy).not.toHaveBeenCalled();
  });

  // --- 正常流程 ---

  it('条件满足时应生成标题并更新窗口', async () => {
    useChatWindowStore.setState({
      windows: [{
        id: testWindowId,
        title: '新对话',
        titleGenerated: undefined,
        config: {} as any,
        activeSubTopicId: '',
        subTopics: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    const updateWindowSpy = vi.spyOn(useChatWindowStore.getState(), 'updateWindow');

    await triggerTitleGeneration(testWindowId, testUserMessage, testAiResponse);

    // updateWindow 应被调用，设置标题和 titleGenerated
    expect(updateWindowSpy).toHaveBeenCalledWith(testWindowId, {
      title: '生成的标题',
      titleGenerated: true,
    });
  });

  it('应使用 titleModel 而非 currentModel 作为 API 模型', async () => {
    const { sendMessageNonStreaming } = await import('../gemini');

    useChatWindowStore.setState({
      windows: [{
        id: testWindowId,
        title: '新对话',
        titleGenerated: undefined,
        config: {} as any,
        activeSubTopicId: '',
        subTopics: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    await triggerTitleGeneration(testWindowId, testUserMessage, testAiResponse);

    // 验证 sendMessageNonStreaming 被调用时使用了 titleModel
    expect(sendMessageNonStreaming).toHaveBeenCalledWith(
      expect.any(Array),
      expect.objectContaining({ model: 'gemini-2.5-flash' }),
      undefined,
      undefined,
      expect.any(String),
    );
  });

  // --- 竞态防护 ---

  it('生成期间用户手动重命名后应丢弃生成结果（需求 4.2）', async () => {
    const { sendMessageNonStreaming } = await import('../gemini');

    useChatWindowStore.setState({
      windows: [{
        id: testWindowId,
        title: '新对话',
        titleGenerated: undefined,
        config: {} as any,
        activeSubTopicId: '',
        subTopics: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    // 模拟：在 generateTitle 执行期间，用户手动重命名了标题
    (sendMessageNonStreaming as any).mockImplementation(async () => {
      // 模拟用户在生成期间手动重命名
      useChatWindowStore.setState({
        windows: [{
          id: testWindowId,
          title: '用户手动设置的标题',
          titleGenerated: true,
          config: {} as any,
          activeSubTopicId: '',
          subTopics: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }],
      });
      return '自动生成的标题';
    });

    const updateWindowSpy = vi.spyOn(useChatWindowStore.getState(), 'updateWindow');

    await triggerTitleGeneration(testWindowId, testUserMessage, testAiResponse);

    // 由于用户已手动重命名，updateWindow 不应被调用
    expect(updateWindowSpy).not.toHaveBeenCalled();
  });

  // --- 错误处理 ---

  it('API 请求失败时应静默降级，记录错误（需求 1.4）', async () => {
    const { sendMessageNonStreaming } = await import('../gemini');
    const { storeLogger } = await import('../logger');

    (sendMessageNonStreaming as any).mockRejectedValue(new Error('API 请求失败'));

    useChatWindowStore.setState({
      windows: [{
        id: testWindowId,
        title: '新对话',
        titleGenerated: undefined,
        config: {} as any,
        activeSubTopicId: '',
        subTopics: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }],
    });

    const errorSpy = vi.spyOn(storeLogger, 'error');

    // 不应抛出错误
    await triggerTitleGeneration(testWindowId, testUserMessage, testAiResponse);

    // 应记录错误日志
    expect(errorSpy).toHaveBeenCalledWith('自动标题生成失败', expect.objectContaining({
      error: 'API 请求失败',
      windowId: testWindowId,
    }));
  });
});
