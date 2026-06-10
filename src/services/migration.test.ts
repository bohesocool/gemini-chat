/**
 * migration.ts 单元测试
 * 覆盖：版本检测、Conversation→ChatWindow 迁移、格式校验、迁移执行流程
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import fc from 'fast-check'
import {
  CURRENT_STORAGE_VERSION,
  LEGACY_STORAGE_VERSION,
  getStorageVersion,
  setStorageVersion,
  needsMigration,
  generateId,
  migrateConversationToChatWindow,
  migrateConversationsToChatWindows,
  isLegacyConversation,
  isChatWindow,
  performMigrationIfNeeded,
  resetStorageVersion,
} from './migration'
import { DEFAULT_CHAT_WINDOW_CONFIG } from '../types/chatWindow'
import type { LegacyConversation, ChatWindow } from '../types/chatWindow'
import type { Message } from '../types/models'

// ============ 测试数据工厂 ============

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-1',
    role: 'user',
    content: '你好',
    timestamp: 1000,
    ...overrides,
  }
}

function makeLegacyConversation(overrides: Partial<LegacyConversation> = {}): LegacyConversation {
  return {
    id: 'conv-1',
    title: '测试对话',
    messages: [makeMessage()],
    model: 'gemini-2.0-flash',
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  }
}

beforeEach(() => {
  localStorage.clear()
})

// ============ 版本检测 ============

describe('存储版本检测', () => {
  it('无版本记录时返回旧版版本号', () => {
    expect(getStorageVersion()).toBe(LEGACY_STORAGE_VERSION)
  })

  it('setStorageVersion 后能读回相同版本', () => {
    setStorageVersion(CURRENT_STORAGE_VERSION)
    expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION)
  })

  it('版本记录为非法字符串时回退到旧版版本号', () => {
    localStorage.setItem('gemini-chat-storage-version', 'abc')
    expect(getStorageVersion()).toBe(LEGACY_STORAGE_VERSION)
  })

  it('无版本记录时 needsMigration 为 true', () => {
    expect(needsMigration()).toBe(true)
  })

  it('版本为当前版本时 needsMigration 为 false', () => {
    setStorageVersion(CURRENT_STORAGE_VERSION)
    expect(needsMigration()).toBe(false)
  })

  it('resetStorageVersion 后恢复需要迁移状态', () => {
    setStorageVersion(CURRENT_STORAGE_VERSION)
    resetStorageVersion()
    expect(needsMigration()).toBe(true)
  })
})

// ============ ID 生成 ============

describe('generateId', () => {
  it('生成的 ID 互不相同', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()))
    expect(ids.size).toBe(100)
  })
})

// ============ 单个迁移 ============

describe('migrateConversationToChatWindow', () => {
  it('保留原有的 id、title、createdAt', () => {
    const conv = makeLegacyConversation()
    const win = migrateConversationToChatWindow(conv)

    expect(win.id).toBe(conv.id)
    expect(win.title).toBe(conv.title)
    expect(win.createdAt).toBe(conv.createdAt)
  })

  it('消息迁移到唯一的默认子话题，activeSubTopicId 指向它', () => {
    const messages = [makeMessage({ id: 'a' }), makeMessage({ id: 'b', role: 'model' })]
    const win = migrateConversationToChatWindow(makeLegacyConversation({ messages }))

    expect(win.subTopics).toHaveLength(1)
    expect(win.subTopics[0]!.messages).toEqual(messages)
    expect(win.subTopics[0]!.title).toBe('主话题')
    expect(win.activeSubTopicId).toBe(win.subTopics[0]!.id)
  })

  it('model 和 systemInstruction 迁移到 config', () => {
    const win = migrateConversationToChatWindow(
      makeLegacyConversation({ model: 'gemini-2.5-pro', systemInstruction: '你是助手' })
    )

    expect(win.config.model).toBe('gemini-2.5-pro')
    expect(win.config.systemInstruction).toBe('你是助手')
  })

  it('缺失 model 时使用默认模型', () => {
    const conv = makeLegacyConversation()
    // 模拟旧数据缺失 model 字段
    const win = migrateConversationToChatWindow({ ...conv, model: '' })

    expect(win.config.model).toBe(DEFAULT_CHAT_WINDOW_CONFIG.model)
  })

  it('defaultConfig 的 generationConfig 覆盖默认值', () => {
    const win = migrateConversationToChatWindow(makeLegacyConversation(), {
      generationConfig: { temperature: 0.5 },
    })

    expect(win.config.generationConfig.temperature).toBe(0.5)
    // 未覆盖的字段保留默认值
    expect(win.config.generationConfig.topP).toBe(
      DEFAULT_CHAT_WINDOW_CONFIG.generationConfig.topP
    )
  })

  it('messages 缺失时迁移为空数组', () => {
    const conv = makeLegacyConversation()
    const win = migrateConversationToChatWindow({
      ...conv,
      messages: undefined as unknown as Message[],
    })

    expect(win.subTopics[0]!.messages).toEqual([])
  })

  it('属性测试：任意合法旧数据迁移后都是合法的 ChatWindow 且消息不丢失', () => {
    const messageArb = fc.record({
      id: fc.string({ minLength: 1 }),
      role: fc.constantFrom('user' as const, 'model' as const),
      content: fc.string(),
      timestamp: fc.nat(),
    })
    const legacyArb = fc.record({
      id: fc.string({ minLength: 1 }),
      title: fc.string(),
      messages: fc.array(messageArb, { maxLength: 10 }),
      model: fc.string({ minLength: 1 }),
      createdAt: fc.nat(),
      updatedAt: fc.nat(),
    })

    fc.assert(
      fc.property(legacyArb, (conv) => {
        const win = migrateConversationToChatWindow(conv)
        expect(isChatWindow(win)).toBe(true)
        expect(win.subTopics[0]!.messages).toEqual(conv.messages)
      })
    )
  })
})

// ============ 批量迁移 ============

describe('migrateConversationsToChatWindows', () => {
  it('逐个迁移并保持顺序', () => {
    const convs = [
      makeLegacyConversation({ id: 'c1' }),
      makeLegacyConversation({ id: 'c2' }),
    ]
    const wins = migrateConversationsToChatWindows(convs)

    expect(wins.map((w) => w.id)).toEqual(['c1', 'c2'])
  })

  it('空列表返回空数组', () => {
    expect(migrateConversationsToChatWindows([])).toEqual([])
  })
})

// ============ 格式校验 ============

describe('isLegacyConversation / isChatWindow', () => {
  it('合法旧版数据：isLegacy 为 true，isChatWindow 为 false', () => {
    const conv = makeLegacyConversation()
    expect(isLegacyConversation(conv)).toBe(true)
    expect(isChatWindow(conv)).toBe(false)
  })

  it('合法新版数据：isChatWindow 为 true，isLegacy 为 false', () => {
    const win = migrateConversationToChatWindow(makeLegacyConversation())
    expect(isChatWindow(win)).toBe(true)
    expect(isLegacyConversation(win)).toBe(false)
  })

  it('包含 subTopics 或 config 字段的数据不是旧版格式', () => {
    expect(isLegacyConversation({ ...makeLegacyConversation(), subTopics: [] })).toBe(false)
    expect(isLegacyConversation({ ...makeLegacyConversation(), config: {} })).toBe(false)
  })

  it('null、原始类型、缺字段对象都不通过校验', () => {
    for (const bad of [null, undefined, 42, 'str', {}, { id: 'x' }]) {
      expect(isLegacyConversation(bad)).toBe(false)
      expect(isChatWindow(bad)).toBe(false)
    }
  })

  it('缺少必需字段的 ChatWindow 不通过校验', () => {
    const win = migrateConversationToChatWindow(makeLegacyConversation())
    const rest: Record<string, unknown> = { ...win }
    delete rest.activeSubTopicId
    expect(isChatWindow(rest)).toBe(false)
  })
})

// ============ 迁移执行 ============

describe('performMigrationIfNeeded', () => {
  it('版本已是最新时不执行迁移，也不读取旧数据', async () => {
    setStorageVersion(CURRENT_STORAGE_VERSION)
    const loadLegacy = vi.fn()
    const saveNew = vi.fn()

    const migrated = await performMigrationIfNeeded(loadLegacy, saveNew)

    expect(migrated).toBe(false)
    expect(loadLegacy).not.toHaveBeenCalled()
    expect(saveNew).not.toHaveBeenCalled()
  })

  it('无旧数据时只更新版本号，不写入新数据', async () => {
    const saveNew = vi.fn()
    const migrated = await performMigrationIfNeeded(async () => [], saveNew)

    expect(migrated).toBe(true)
    expect(saveNew).not.toHaveBeenCalled()
    expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION)
  })

  it('有旧数据时迁移并保存，然后更新版本号', async () => {
    const convs = [makeLegacyConversation({ id: 'c1' }), makeLegacyConversation({ id: 'c2' })]
    let saved: ChatWindow[] = []
    const saveNew = vi.fn(async (windows: ChatWindow[]) => {
      saved = windows
    })

    const migrated = await performMigrationIfNeeded(async () => convs, saveNew)

    expect(migrated).toBe(true)
    expect(saved.map((w) => w.id)).toEqual(['c1', 'c2'])
    expect(saved.every((w) => isChatWindow(w))).toBe(true)
    expect(getStorageVersion()).toBe(CURRENT_STORAGE_VERSION)
  })

  it('加载旧数据失败时抛出错误且不更新版本号', async () => {
    await expect(
      performMigrationIfNeeded(
        async () => {
          throw new Error('读取失败')
        },
        async () => {}
      )
    ).rejects.toThrow('数据迁移失败')

    expect(getStorageVersion()).toBe(LEGACY_STORAGE_VERSION)
  })

  it('保存新数据失败时抛出错误且不更新版本号', async () => {
    await expect(
      performMigrationIfNeeded(
        async () => [makeLegacyConversation()],
        async () => {
          throw new Error('写入失败')
        }
      )
    ).rejects.toThrow('数据迁移失败')

    expect(getStorageVersion()).toBe(LEGACY_STORAGE_VERSION)
  })
})
