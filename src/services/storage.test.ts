/**
 * storage.ts 单元测试（基于 fake-indexeddb）
 * 覆盖：对话/聊天窗口 CRUD、子话题操作、设置、模型配置、数据迁移、导入导出
 */

import { describe, it, expect, beforeEach } from 'vitest'
import * as storage from './storage'
import {
  setStorageVersion,
  resetStorageVersion,
  getStorageVersion,
  CURRENT_STORAGE_VERSION,
} from './migration'
import {
  DEFAULT_APP_SETTINGS,
  EXPORT_DATA_VERSION,
  EXPORT_DATA_VERSION_V2,
  DEFAULT_CHAT_WINDOW_CONFIG,
} from '../types'
import type { Conversation, ChatWindow, SubTopic, Message } from '../types'

// ============ 测试数据工厂 ============

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: `msg-${Math.random().toString(36).slice(2)}`,
    role: 'user',
    content: '你好',
    timestamp: 1000,
    ...overrides,
  }
}

function makeConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: `conv-${Math.random().toString(36).slice(2)}`,
    title: '旧版对话',
    messages: [makeMessage()],
    model: 'gemini-2.0-flash',
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  } as Conversation
}

function makeSubTopic(overrides: Partial<SubTopic> = {}): SubTopic {
  return {
    id: `st-${Math.random().toString(36).slice(2)}`,
    title: '主话题',
    messages: [],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  }
}

function makeChatWindow(overrides: Partial<ChatWindow> = {}): ChatWindow {
  const subTopic = makeSubTopic()
  return {
    id: `win-${Math.random().toString(36).slice(2)}`,
    title: '测试窗口',
    config: { ...DEFAULT_CHAT_WINDOW_CONFIG },
    subTopics: [subTopic],
    activeSubTopicId: subTopic.id,
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  }
}

beforeEach(async () => {
  // 每个用例使用干净的数据库和存储版本
  await storage.deleteDatabase()
  localStorage.clear()
})

// ============ 对话 CRUD（旧版） ============

describe('对话 CRUD', () => {
  it('保存后能按 ID 读回', async () => {
    const conv = makeConversation()
    await storage.saveConversation(conv)

    expect(await storage.getConversation(conv.id)).toEqual(conv)
  })

  it('不存在的 ID 返回 null', async () => {
    expect(await storage.getConversation('nope')).toBeNull()
  })

  it('getAllConversations 按更新时间降序排列', async () => {
    await storage.saveConversation(makeConversation({ id: 'old', updatedAt: 1000 }))
    await storage.saveConversation(makeConversation({ id: 'new', updatedAt: 3000 }))
    await storage.saveConversation(makeConversation({ id: 'mid', updatedAt: 2000 }))

    const all = await storage.getAllConversations()
    expect(all.map((c) => c.id)).toEqual(['new', 'mid', 'old'])
  })

  it('删除后读取返回 null', async () => {
    const conv = makeConversation()
    await storage.saveConversation(conv)
    await storage.deleteConversation(conv.id)

    expect(await storage.getConversation(conv.id)).toBeNull()
  })
})

// ============ 聊天窗口 CRUD ============

describe('聊天窗口 CRUD', () => {
  it('保存后能按 ID 读回', async () => {
    const win = makeChatWindow()
    await storage.saveChatWindow(win)

    expect(await storage.getChatWindow(win.id)).toEqual(win)
  })

  it('saveChatWindow 覆盖同 ID 的旧数据', async () => {
    const win = makeChatWindow()
    await storage.saveChatWindow(win)
    await storage.saveChatWindow({ ...win, title: '新标题' })

    const loaded = await storage.getChatWindow(win.id)
    expect(loaded!.title).toBe('新标题')
    expect(await storage.getAllChatWindows()).toHaveLength(1)
  })

  it('getAllChatWindows 按更新时间降序排列', async () => {
    await storage.saveChatWindow(makeChatWindow({ id: 'w1', updatedAt: 1000 }))
    await storage.saveChatWindow(makeChatWindow({ id: 'w2', updatedAt: 3000 }))
    await storage.saveChatWindow(makeChatWindow({ id: 'w3', updatedAt: 2000 }))

    const all = await storage.getAllChatWindows()
    expect(all.map((w) => w.id)).toEqual(['w2', 'w3', 'w1'])
  })

  it('saveAllChatWindows 批量保存', async () => {
    await storage.saveAllChatWindows([
      makeChatWindow({ id: 'a' }),
      makeChatWindow({ id: 'b' }),
    ])

    expect((await storage.getAllChatWindows()).map((w) => w.id).sort()).toEqual(['a', 'b'])
  })

  it('删除后读取返回 null', async () => {
    const win = makeChatWindow()
    await storage.saveChatWindow(win)
    await storage.deleteChatWindow(win.id)

    expect(await storage.getChatWindow(win.id)).toBeNull()
  })
})

// ============ 子话题操作 ============

describe('子话题操作', () => {
  it('addSubTopic 追加子话题并更新时间戳', async () => {
    const win = makeChatWindow({ updatedAt: 1000 })
    await storage.saveChatWindow(win)

    const updated = await storage.addSubTopic(win.id, makeSubTopic({ id: 'st-new' }))

    expect(updated!.subTopics.map((st) => st.id)).toEqual([win.subTopics[0]!.id, 'st-new'])
    expect(updated!.updatedAt).toBeGreaterThan(1000)
    // 持久化生效
    expect((await storage.getChatWindow(win.id))!.subTopics).toHaveLength(2)
  })

  it('窗口不存在时 addSubTopic 返回 null', async () => {
    expect(await storage.addSubTopic('nope', makeSubTopic())).toBeNull()
  })

  it('updateSubTopic 更新标题和消息，保留 createdAt', async () => {
    const st = makeSubTopic({ id: 'st-1', createdAt: 500 })
    const win = makeChatWindow({ subTopics: [st], activeSubTopicId: 'st-1' })
    await storage.saveChatWindow(win)

    const msgs = [makeMessage()]
    const updated = await storage.updateSubTopic(win.id, 'st-1', { title: '新标题', messages: msgs })

    const result = updated!.subTopics[0]!
    expect(result.title).toBe('新标题')
    expect(result.messages).toEqual(msgs)
    expect(result.createdAt).toBe(500)
  })

  it('子话题不存在时 updateSubTopic 返回 null', async () => {
    const win = makeChatWindow()
    await storage.saveChatWindow(win)

    expect(await storage.updateSubTopic(win.id, 'nope', { title: 'x' })).toBeNull()
  })

  it('deleteSubTopic 删除活动子话题时切换到第一个', async () => {
    const st1 = makeSubTopic({ id: 'st-1' })
    const st2 = makeSubTopic({ id: 'st-2' })
    const win = makeChatWindow({ subTopics: [st1, st2], activeSubTopicId: 'st-2' })
    await storage.saveChatWindow(win)

    const updated = await storage.deleteSubTopic(win.id, 'st-2')

    expect(updated!.subTopics.map((st) => st.id)).toEqual(['st-1'])
    expect(updated!.activeSubTopicId).toBe('st-1')
  })

  it('getSubTopic 返回指定子话题，不存在返回 null', async () => {
    const st = makeSubTopic({ id: 'st-1' })
    const win = makeChatWindow({ subTopics: [st], activeSubTopicId: 'st-1' })
    await storage.saveChatWindow(win)

    expect(await storage.getSubTopic(win.id, 'st-1')).toEqual(st)
    expect(await storage.getSubTopic(win.id, 'nope')).toBeNull()
    expect(await storage.getSubTopic('nope', 'st-1')).toBeNull()
  })
})

// ============ 设置与模型配置 ============

describe('设置与模型配置', () => {
  it('未保存过设置时返回默认设置', async () => {
    expect(await storage.getSettings()).toEqual(DEFAULT_APP_SETTINGS)
  })

  it('保存后读回相同设置', async () => {
    const settings = { ...DEFAULT_APP_SETTINGS, apiKey: 'test-key', theme: 'dark' }
    await storage.saveSettings(settings)

    expect(await storage.getSettings()).toEqual(settings)
  })

  it('未保存过模型配置时返回预设模型列表', async () => {
    const configs = await storage.loadModelConfigs()

    expect(configs.length).toBeGreaterThan(0)
    expect(configs.every((c) => c.isCustom === false)).toBe(true)
  })

  it('保存的模型配置能读回（含自定义模型）', async () => {
    const configs = await storage.loadModelConfigs()
    const custom = { ...configs[0]!, id: 'my-model', name: '自定义', isCustom: true, description: 'mine' }
    await storage.saveModelConfigs([...configs, custom])

    const loaded = await storage.loadModelConfigs()
    expect(loaded.find((c) => c.id === 'my-model')).toBeTruthy()
  })

  it('resetModelConfigs 恢复为预设列表', async () => {
    const configs = await storage.loadModelConfigs()
    await storage.saveModelConfigs([{ ...configs[0]!, id: 'only-one', isCustom: true }])

    const reset = await storage.resetModelConfigs()
    expect(reset.find((c) => c.id === 'only-one')).toBeUndefined()
    expect((await storage.loadModelConfigs()).find((c) => c.id === 'only-one')).toBeUndefined()
  })
})

// ============ 数据迁移 ============

describe('performDataMigration', () => {
  it('版本已是最新时返回 false', async () => {
    setStorageVersion(CURRENT_STORAGE_VERSION)
    expect(await storage.performDataMigration()).toBe(false)
  })

  it('无旧数据时只更新版本号', async () => {
    resetStorageVersion()
    expect(await storage.performDataMigration()).toBe(true)
    expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION)
    expect(await storage.getAllChatWindows()).toHaveLength(0)
  })

  it('将旧版对话迁移为聊天窗口并更新版本号', async () => {
    resetStorageVersion()
    const conv = makeConversation({ id: 'legacy-1' })
    await storage.saveConversation(conv)

    expect(await storage.performDataMigration()).toBe(true)

    const windows = await storage.getAllChatWindows()
    expect(windows).toHaveLength(1)
    expect(windows[0]!.id).toBe('legacy-1')
    expect(windows[0]!.subTopics[0]!.messages).toEqual(conv.messages)
    expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION)

    // 再次调用不重复迁移
    expect(await storage.performDataMigration()).toBe(false)
  })
})

// ============ 导出 ============

describe('数据导出', () => {
  it('exportAllDataV2 输出含版本号、窗口和设置的 JSON', async () => {
    const win = makeChatWindow()
    await storage.saveChatWindow(win)
    await storage.saveSettings({ ...DEFAULT_APP_SETTINGS, apiKey: 'k' })

    const json = await storage.exportAllDataV2()
    const data = JSON.parse(json)

    expect(data.version).toBe(EXPORT_DATA_VERSION_V2)
    expect(typeof data.exportedAt).toBe('number')
    expect(data.chatWindows).toHaveLength(1)
    expect(data.chatWindows[0].id).toBe(win.id)
    expect(data.settings.apiKey).toBe('k')
  })

  it('exportAllData（旧版）使用 conversations 字段', async () => {
    await storage.saveConversation(makeConversation({ id: 'c1' }))

    const data = JSON.parse(await storage.exportAllData())

    expect(data.version).toBe(EXPORT_DATA_VERSION)
    expect(data.conversations).toHaveLength(1)
  })
})

// ============ 导入校验 ============

describe('导入数据校验', () => {
  function makeExportV2(overrides: Record<string, unknown> = {}) {
    return {
      version: EXPORT_DATA_VERSION_V2,
      exportedAt: 1000,
      chatWindows: [makeChatWindow()],
      settings: { ...DEFAULT_APP_SETTINGS },
      ...overrides,
    }
  }

  it('合法的 V2 数据通过校验', () => {
    expect(storage.validateImportDataV2(makeExportV2())).toBe(true)
  })

  it('缺少 version / exportedAt / settings 时不通过', () => {
    expect(storage.validateImportDataV2(makeExportV2({ version: undefined }))).toBe(false)
    expect(storage.validateImportDataV2(makeExportV2({ exportedAt: 'x' }))).toBe(false)
    expect(storage.validateImportDataV2(makeExportV2({ settings: null }))).toBe(false)
  })

  it('窗口条目缺字段时不通过', () => {
    const badWindow = { ...makeChatWindow(), subTopics: 'oops' }
    expect(storage.validateImportDataV2(makeExportV2({ chatWindows: [badWindow] }))).toBe(false)
  })

  it('设置缺字段时不通过', () => {
    const badSettings = { ...DEFAULT_APP_SETTINGS, apiKey: undefined }
    expect(storage.validateImportDataV2(makeExportV2({ settings: badSettings }))).toBe(false)
  })

  it('null 和原始类型不通过', () => {
    expect(storage.validateImportDataV2(null)).toBe(false)
    expect(storage.validateImportData('str')).toBe(false)
  })
})

// ============ 导入 ============

describe('数据导入', () => {
  it('V2 导出再导入：数据完整往返', async () => {
    const win = makeChatWindow({ id: 'roundtrip' })
    await storage.saveChatWindow(win)
    await storage.saveSettings({ ...DEFAULT_APP_SETTINGS, apiKey: 'secret' })
    const json = await storage.exportAllDataV2()

    // 清空后导入
    await storage.clearAllData()
    await storage.importDataV2(json)

    const windows = await storage.getAllChatWindows()
    expect(windows).toHaveLength(1)
    expect(windows[0]!.id).toBe('roundtrip')
    expect((await storage.getSettings()).apiKey).toBe('secret')
  })

  it('导入会清空原有窗口数据（整体替换）', async () => {
    await storage.saveChatWindow(makeChatWindow({ id: 'existing' }))
    const json = JSON.stringify({
      version: EXPORT_DATA_VERSION_V2,
      exportedAt: 1000,
      chatWindows: [makeChatWindow({ id: 'imported' })],
      settings: { ...DEFAULT_APP_SETTINGS },
    })

    await storage.importDataV2(json)

    const windows = await storage.getAllChatWindows()
    expect(windows.map((w) => w.id)).toEqual(['imported'])
  })

  it('非法 JSON 抛出"无效的 JSON 格式"', async () => {
    await expect(storage.importDataV2('{broken')).rejects.toThrow('无效的 JSON 格式')
    await expect(storage.importDataAuto('{broken')).rejects.toThrow('无效的 JSON 格式')
  })

  it('格式不符抛出"导入数据格式无效"', async () => {
    await expect(storage.importDataV2('{"foo":1}')).rejects.toThrow('导入数据格式无效')
  })

  it('importDataAuto 识别 V2 格式', async () => {
    const json = JSON.stringify({
      version: EXPORT_DATA_VERSION_V2,
      exportedAt: 1000,
      chatWindows: [makeChatWindow({ id: 'auto-v2' })],
      settings: { ...DEFAULT_APP_SETTINGS },
    })

    await storage.importDataAuto(json)

    expect((await storage.getAllChatWindows()).map((w) => w.id)).toEqual(['auto-v2'])
  })

  it('importDataAuto 识别旧版格式并自动迁移为聊天窗口', async () => {
    resetStorageVersion()
    const conv = makeConversation({ id: 'auto-v1' })
    const json = JSON.stringify({
      version: EXPORT_DATA_VERSION,
      exportedAt: 1000,
      conversations: [conv],
      settings: { ...DEFAULT_APP_SETTINGS },
    })

    await storage.importDataAuto(json)

    const windows = await storage.getAllChatWindows()
    expect(windows).toHaveLength(1)
    expect(windows[0]!.id).toBe('auto-v1')
    expect(windows[0]!.subTopics[0]!.messages).toEqual(conv.messages)
  })

  it('importDataAuto 无法识别的格式抛错', async () => {
    await expect(storage.importDataAuto('{"version":"1.0.0"}')).rejects.toThrow('无法识别的导入数据格式')
  })
})
