/**
 * useChatWindowStore 单元测试
 * 覆盖：窗口/子话题/消息的状态变更、活动状态切换、工具方法
 * 存储层（storageProxy）被 mock，只验证状态逻辑与持久化调用
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../../services/storageProxy', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/storageProxy')>()
  return {
    ...actual,
    saveChatWindow: vi.fn().mockResolvedValue(undefined),
    getAllChatWindows: vi.fn().mockResolvedValue([]),
    deleteChatWindow: vi.fn().mockResolvedValue(undefined),
  }
})

vi.mock('../../services/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../services/storage')>()
  return {
    ...actual,
    saveAllChatWindows: vi.fn().mockResolvedValue(undefined),
  }
})

import { useChatWindowStore } from './store'
import {
  saveChatWindow,
  getAllChatWindows,
  deleteChatWindow,
} from '../../services/storageProxy'
import { saveAllChatWindows } from '../../services/storage'
import type { Message } from '../../types/models'

// ============ 工具函数 ============

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role: 'user',
    content: '你好',
    timestamp: 1000,
    ...overrides,
  }
}

/** 创建一个窗口并向其活动子话题注入消息，返回 { windowId, subTopicId } */
async function seedWindowWithMessages(messages: Message[]) {
  const store = useChatWindowStore.getState()
  const win = store.createWindow()
  await useChatWindowStore
    .getState()
    .updateSubTopic(win.id, win.activeSubTopicId, { messages })
  return { windowId: win.id, subTopicId: win.activeSubTopicId }
}

beforeEach(() => {
  vi.clearAllMocks()
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
  })
})

// ============ 窗口操作 ============

describe('窗口操作', () => {
  it('createWindow 创建窗口并置于列表头部、设为活动窗口', () => {
    const store = useChatWindowStore.getState()
    const w1 = store.createWindow()
    const w2 = useChatWindowStore.getState().createWindow()

    const state = useChatWindowStore.getState()
    expect(state.windows.map((w) => w.id)).toEqual([w2.id, w1.id])
    expect(state.activeWindowId).toBe(w2.id)
    expect(saveChatWindow).toHaveBeenCalledTimes(2)
  })

  it('createWindow 默认标题为"新对话"，含一个默认子话题', () => {
    const win = useChatWindowStore.getState().createWindow()

    expect(win.title).toBe('新对话')
    expect(win.subTopics).toHaveLength(1)
    expect(win.activeSubTopicId).toBe(win.subTopics[0]!.id)
  })

  it('createWindow 合并传入配置与默认配置', () => {
    const win = useChatWindowStore.getState().createWindow({ model: 'gemini-2.5-pro' }, '我的窗口')

    expect(win.title).toBe('我的窗口')
    expect(win.config.model).toBe('gemini-2.5-pro')
    // 未覆盖的默认值保留
    expect(win.config.generationConfig.temperature).toBe(1)
  })

  it('selectWindow 切换活动窗口并清除错误', () => {
    const w1 = useChatWindowStore.getState().createWindow()
    useChatWindowStore.getState().createWindow()
    useChatWindowStore.setState({ error: '旧错误' })

    useChatWindowStore.getState().selectWindow(w1.id)

    const state = useChatWindowStore.getState()
    expect(state.activeWindowId).toBe(w1.id)
    expect(state.error).toBeNull()
  })

  it('selectWindow 对不存在的 ID 不做任何修改', () => {
    const w1 = useChatWindowStore.getState().createWindow()

    useChatWindowStore.getState().selectWindow('nope')

    expect(useChatWindowStore.getState().activeWindowId).toBe(w1.id)
  })

  it('updateWindow 更新字段并刷新 updatedAt', async () => {
    const win = useChatWindowStore.getState().createWindow()
    useChatWindowStore.setState((s) => {
      s.windows[0]!.updatedAt = 1
    })

    await useChatWindowStore.getState().updateWindow(win.id, { title: '改名' })

    const updated = useChatWindowStore.getState().windows[0]!
    expect(updated.title).toBe('改名')
    expect(updated.updatedAt).toBeGreaterThan(1)
    expect(saveChatWindow).toHaveBeenLastCalledWith(expect.objectContaining({ title: '改名' }))
  })

  it('deleteWindow 删除活动窗口后切换到第一个窗口', async () => {
    const w1 = useChatWindowStore.getState().createWindow()
    const w2 = useChatWindowStore.getState().createWindow()
    // 当前活动窗口是 w2

    await useChatWindowStore.getState().deleteWindow(w2.id)

    const state = useChatWindowStore.getState()
    expect(state.windows.map((w) => w.id)).toEqual([w1.id])
    expect(state.activeWindowId).toBe(w1.id)
    expect(deleteChatWindow).toHaveBeenCalledWith(w2.id)
  })

  it('删除最后一个窗口后活动窗口为 null', async () => {
    const win = useChatWindowStore.getState().createWindow()

    await useChatWindowStore.getState().deleteWindow(win.id)

    const state = useChatWindowStore.getState()
    expect(state.windows).toHaveLength(0)
    expect(state.activeWindowId).toBeNull()
  })

  it('updateWindowConfig 深度合并 generationConfig 和 advancedConfig.imageConfig', async () => {
    const win = useChatWindowStore.getState().createWindow()
    await useChatWindowStore.getState().updateWindowConfig(win.id, {
      advancedConfig: { imageConfig: { aspectRatio: '16:9' } },
    })

    await useChatWindowStore.getState().updateWindowConfig(win.id, {
      generationConfig: { temperature: 0.2 },
      advancedConfig: { imageConfig: { imageSize: '2K' } },
      systemInstruction: '新指令',
    })

    const config = useChatWindowStore.getState().windows[0]!.config
    expect(config.generationConfig.temperature).toBe(0.2)
    // 深度合并：未覆盖的字段保留
    expect(config.generationConfig.topP).toBe(0.95)
    expect(config.advancedConfig?.imageConfig?.aspectRatio).toBe('16:9')
    expect(config.advancedConfig?.imageConfig?.imageSize).toBe('2K')
    expect(config.systemInstruction).toBe('新指令')
  })

  it('reorderWindows 重排顺序并批量保存', async () => {
    const w1 = useChatWindowStore.getState().createWindow()
    const w2 = useChatWindowStore.getState().createWindow()
    const reversed = [...useChatWindowStore.getState().windows].reverse()

    await useChatWindowStore.getState().reorderWindows(reversed)

    expect(useChatWindowStore.getState().windows.map((w) => w.id)).toEqual([w1.id, w2.id])
    expect(saveAllChatWindows).toHaveBeenCalledTimes(1)
  })

  it('loadWindows 加载存储中的窗口并标记已初始化', async () => {
    const win = useChatWindowStore.getState().createWindow()
    vi.mocked(getAllChatWindows).mockResolvedValueOnce([win])
    useChatWindowStore.setState({ windows: [], initialized: false })

    await useChatWindowStore.getState().loadWindows()

    const state = useChatWindowStore.getState()
    expect(state.windows.map((w) => w.id)).toEqual([win.id])
    expect(state.initialized).toBe(true)
    expect(state.isLoading).toBe(false)
  })

  it('loadWindows 失败时记录错误且仍标记已初始化', async () => {
    vi.mocked(getAllChatWindows).mockRejectedValueOnce(new Error('数据库挂了'))

    await useChatWindowStore.getState().loadWindows()

    const state = useChatWindowStore.getState()
    expect(state.error).toBe('数据库挂了')
    expect(state.initialized).toBe(true)
    expect(state.isLoading).toBe(false)
  })
})

// ============ 子话题操作 ============

describe('子话题操作', () => {
  it('createSubTopic 追加子话题并设为活动', () => {
    const win = useChatWindowStore.getState().createWindow()

    const st = useChatWindowStore.getState().createSubTopic(win.id)

    const updated = useChatWindowStore.getState().windows[0]!
    expect(st).not.toBeNull()
    expect(updated.subTopics).toHaveLength(2)
    expect(updated.activeSubTopicId).toBe(st!.id)
    expect(st!.title).toBe('话题 2')
  })

  it('窗口不存在时 createSubTopic 返回 null', () => {
    expect(useChatWindowStore.getState().createSubTopic('nope')).toBeNull()
  })

  it('updateSubTopic 更新标题', async () => {
    const win = useChatWindowStore.getState().createWindow()

    await useChatWindowStore
      .getState()
      .updateSubTopic(win.id, win.activeSubTopicId, { title: '新话题名' })

    expect(useChatWindowStore.getState().windows[0]!.subTopics[0]!.title).toBe('新话题名')
  })

  it('deleteSubTopic 不允许删除最后一个子话题', async () => {
    const win = useChatWindowStore.getState().createWindow()

    await useChatWindowStore.getState().deleteSubTopic(win.id, win.activeSubTopicId)

    const state = useChatWindowStore.getState()
    expect(state.windows[0]!.subTopics).toHaveLength(1)
    expect(state.error).toBe('至少需要保留一个子话题')
  })

  it('deleteSubTopic 删除活动子话题后切换到第一个', async () => {
    const win = useChatWindowStore.getState().createWindow()
    const st2 = useChatWindowStore.getState().createSubTopic(win.id)!
    // 当前活动子话题是 st2

    await useChatWindowStore.getState().deleteSubTopic(win.id, st2.id)

    const updated = useChatWindowStore.getState().windows[0]!
    expect(updated.subTopics).toHaveLength(1)
    expect(updated.activeSubTopicId).toBe(updated.subTopics[0]!.id)
  })

  it('selectSubTopic 切换活动子话题，忽略不存在的 ID', () => {
    const win = useChatWindowStore.getState().createWindow()
    const firstId = win.activeSubTopicId
    const st2 = useChatWindowStore.getState().createSubTopic(win.id)!

    useChatWindowStore.getState().selectSubTopic(win.id, firstId)
    expect(useChatWindowStore.getState().windows[0]!.activeSubTopicId).toBe(firstId)

    useChatWindowStore.getState().selectSubTopic(win.id, 'nope')
    expect(useChatWindowStore.getState().windows[0]!.activeSubTopicId).toBe(firstId)

    useChatWindowStore.getState().selectSubTopic(win.id, st2.id)
    expect(useChatWindowStore.getState().windows[0]!.activeSubTopicId).toBe(st2.id)
  })
})

// ============ 消息操作 ============

describe('消息操作', () => {
  it('deleteMessage 删除指定消息及其后续所有消息', async () => {
    const msgs = [
      makeMessage({ id: 'm1' }),
      makeMessage({ id: 'm2', role: 'model' }),
      makeMessage({ id: 'm3' }),
    ]
    const { windowId, subTopicId } = await seedWindowWithMessages(msgs)

    await useChatWindowStore.getState().deleteMessage(windowId, subTopicId, 'm2')

    const messages = useChatWindowStore.getState().windows[0]!.subTopics[0]!.messages
    expect(messages.map((m) => m.id)).toEqual(['m1'])
  })

  it('deleteMessage 消息不存在时设置错误', async () => {
    const { windowId, subTopicId } = await seedWindowWithMessages([makeMessage()])

    await useChatWindowStore.getState().deleteMessage(windowId, subTopicId, 'nope')

    expect(useChatWindowStore.getState().error).toBe('消息不存在')
  })

  it('updateMessageContent 仅更新用户消息内容', async () => {
    const { windowId, subTopicId } = await seedWindowWithMessages([
      makeMessage({ id: 'm1', content: '原内容' }),
    ])

    await useChatWindowStore.getState().updateMessageContent(windowId, subTopicId, 'm1', '新内容')

    expect(useChatWindowStore.getState().windows[0]!.subTopics[0]!.messages[0]!.content).toBe('新内容')
  })

  it('updateMessageContent 拒绝编辑 AI 消息', async () => {
    const { windowId, subTopicId } = await seedWindowWithMessages([
      makeMessage({ id: 'm1', role: 'model', content: 'AI 回复' }),
    ])

    await useChatWindowStore.getState().updateMessageContent(windowId, subTopicId, 'm1', '篡改')

    const state = useChatWindowStore.getState()
    expect(state.error).toBe('只能编辑用户消息')
    expect(state.windows[0]!.subTopics[0]!.messages[0]!.content).toBe('AI 回复')
  })

  it('updateMessageError 写入和清除消息错误状态', async () => {
    const { windowId, subTopicId } = await seedWindowWithMessages([makeMessage({ id: 'm1' })])

    await useChatWindowStore.getState().updateMessageError(windowId, subTopicId, 'm1', '请求失败')
    expect(useChatWindowStore.getState().windows[0]!.subTopics[0]!.messages[0]!.error).toBe('请求失败')

    await useChatWindowStore.getState().updateMessageError(windowId, subTopicId, 'm1', null)
    expect(useChatWindowStore.getState().windows[0]!.subTopics[0]!.messages[0]!.error).toBeUndefined()
  })

  it('editMessage 对不存在的消息和 AI 消息设置错误', async () => {
    const { windowId, subTopicId } = await seedWindowWithMessages([
      makeMessage({ id: 'ai-msg', role: 'model' }),
    ])

    await useChatWindowStore.getState().editMessage(windowId, subTopicId, 'nope', 'x')
    expect(useChatWindowStore.getState().error).toBe('消息不存在')

    await useChatWindowStore.getState().editMessage(windowId, subTopicId, 'ai-msg', 'x')
    expect(useChatWindowStore.getState().error).toBe('只能编辑用户消息')
  })
})

// ============ 工具方法 ============

describe('工具方法', () => {
  it('getActiveWindow / getActiveSubTopic 返回当前活动对象', () => {
    const win = useChatWindowStore.getState().createWindow()

    const state = useChatWindowStore.getState()
    expect(state.getActiveWindow()?.id).toBe(win.id)
    expect(state.getActiveSubTopic()?.id).toBe(win.activeSubTopicId)
  })

  it('无活动窗口时返回 null', () => {
    const state = useChatWindowStore.getState()
    expect(state.getActiveWindow()).toBeNull()
    expect(state.getActiveSubTopic()).toBeNull()
  })

  it('getTotalTokenUsage 累计子话题内所有消息的 Token', async () => {
    const { windowId, subTopicId } = await seedWindowWithMessages([
      makeMessage({ tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 } }),
      makeMessage({ tokenUsage: { promptTokens: 5, completionTokens: 15, totalTokens: 20 } }),
      makeMessage(), // 无 tokenUsage 的消息被忽略
    ])

    const usage = useChatWindowStore.getState().getTotalTokenUsage(windowId, subTopicId)

    expect(usage).toEqual({ promptTokens: 15, completionTokens: 35, totalTokens: 50 })
  })

  it('getTotalTokenUsage 对不存在的窗口或子话题返回零值', () => {
    const usage = useChatWindowStore.getState().getTotalTokenUsage('nope', 'nope')
    expect(usage).toEqual({ promptTokens: 0, completionTokens: 0, totalTokens: 0 })
  })

  it('clearError / clearStreamingText / clearStreamingThought 重置对应状态', () => {
    useChatWindowStore.setState({ error: 'e', streamingText: 't', streamingThought: 'th' })

    const state = useChatWindowStore.getState()
    state.clearError()
    state.clearStreamingText()
    state.clearStreamingThought()

    const after = useChatWindowStore.getState()
    expect(after.error).toBeNull()
    expect(after.streamingText).toBe('')
    expect(after.streamingThought).toBe('')
  })
})
