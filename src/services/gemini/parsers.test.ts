/**
 * parsers.ts 单元测试
 * 覆盖：SSE 行解析、响应解包、文本/思维链/图片/Token/URL 上下文提取
 */

import { describe, it, expect } from 'vitest'
import {
  unwrapResponseData,
  parseSSELine,
  extractTextFromChunk,
  extractThoughtSummary,
  extractImagesFromChunk,
  extractTokenUsage,
  extractUrlContextMetadata,
} from './parsers'
import type { StreamChunk } from '../../types'

// ============ 测试数据工厂 ============

/** 构造包含指定 parts 的 StreamChunk */
function chunkWithParts(parts: unknown[]): StreamChunk {
  return {
    candidates: [{ content: { role: 'model', parts } }],
  } as StreamChunk
}

// ============ unwrapResponseData ============

describe('unwrapResponseData', () => {
  it('解包 {response: {...}} 包装格式', () => {
    const inner = { candidates: [] }
    expect(unwrapResponseData({ response: inner, traceId: 'abc' })).toBe(inner)
  })

  it('未包装的数据原样返回', () => {
    const chunk = { candidates: [] }
    expect(unwrapResponseData(chunk)).toBe(chunk)
  })

  it('response 字段不是对象时原样返回', () => {
    const data = { response: 'oops' }
    expect(unwrapResponseData(data)).toBe(data)
  })

  it('null 原样返回', () => {
    expect(unwrapResponseData(null)).toBe(null)
  })
})

// ============ parseSSELine ============

describe('parseSSELine', () => {
  it('解析合法的 data 行', () => {
    const line = 'data: {"candidates":[{"content":{"parts":[{"text":"hi"}]}}]}'
    const chunk = parseSSELine(line)
    expect(chunk).not.toBeNull()
    expect(extractTextFromChunk(chunk!)).toBe('hi')
  })

  it('自动解包被包装的响应', () => {
    const line = 'data: {"response":{"candidates":[{"content":{"parts":[{"text":"hi"}]}}]},"traceId":"t1"}'
    const chunk = parseSSELine(line)
    expect(extractTextFromChunk(chunk!)).toBe('hi')
  })

  it('非 data 开头的行返回 null', () => {
    expect(parseSSELine('event: ping')).toBeNull()
    expect(parseSSELine(': comment')).toBeNull()
    expect(parseSSELine('')).toBeNull()
  })

  it('[DONE] 标记返回 null', () => {
    expect(parseSSELine('data: [DONE]')).toBeNull()
  })

  it('空数据返回 null', () => {
    expect(parseSSELine('data: ')).toBeNull()
    expect(parseSSELine('data:  ')).toBeNull()
  })

  it('非法 JSON 返回 null 而不抛异常', () => {
    expect(parseSSELine('data: {broken')).toBeNull()
  })
})

// ============ extractTextFromChunk ============

describe('extractTextFromChunk', () => {
  it('拼接多个文本 part', () => {
    const chunk = chunkWithParts([{ text: '你好' }, { text: '世界' }])
    expect(extractTextFromChunk(chunk)).toBe('你好世界')
  })

  it('跳过非文本 part', () => {
    const chunk = chunkWithParts([
      { inlineData: { mimeType: 'image/png', data: 'xxx' } },
      { text: 'hi' },
    ])
    expect(extractTextFromChunk(chunk)).toBe('hi')
  })

  it('无 candidates 或无 parts 时返回空字符串', () => {
    expect(extractTextFromChunk({} as StreamChunk)).toBe('')
    expect(extractTextFromChunk({ candidates: [] } as StreamChunk)).toBe('')
    expect(extractTextFromChunk({ candidates: [{}] } as StreamChunk)).toBe('')
  })
})

// ============ extractThoughtSummary ============

describe('extractThoughtSummary', () => {
  it('分离思维链文本和普通文本', () => {
    const chunk = chunkWithParts([
      { text: '思考中...', thought: true },
      { text: '最终答案' },
    ])
    const result = extractThoughtSummary(chunk)

    expect(result).not.toBeNull()
    expect(result!.thought).toBe('思考中...')
    expect(result!.text).toBe('最终答案')
  })

  it('累加多个同类 part', () => {
    const chunk = chunkWithParts([
      { text: 'a', thought: true },
      { text: 'b', thought: true },
      { text: 'c' },
      { text: 'd' },
    ])
    const result = extractThoughtSummary(chunk)

    expect(result!.thought).toBe('ab')
    expect(result!.text).toBe('cd')
  })

  it('提取 thoughtSignature', () => {
    const chunk = chunkWithParts([{ text: 'hi', thoughtSignature: 'sig-123' }])
    expect(extractThoughtSummary(chunk)!.thoughtSignature).toBe('sig-123')
  })

  it('思维链图片与正式回复图片分开存储', () => {
    const chunk = chunkWithParts([
      { thought: true, inlineData: { mimeType: 'image/png', data: 'thought-img' } },
      { inlineData: { mimeType: 'image/jpeg', data: 'final-img' } },
    ])
    const result = extractThoughtSummary(chunk)

    expect(result!.thoughtImages).toEqual([{ mimeType: 'image/png', data: 'thought-img' }])
    expect(result!.images).toEqual([{ mimeType: 'image/jpeg', data: 'final-img' }])
  })

  it('忽略非图片类型的 inlineData', () => {
    const chunk = chunkWithParts([
      { text: 'hi' },
      { inlineData: { mimeType: 'audio/mp3', data: 'audio' } },
    ])
    const result = extractThoughtSummary(chunk)

    expect(result!.images).toBeUndefined()
    expect(result!.thoughtImages).toBeUndefined()
  })

  it('没有任何内容时返回 null', () => {
    expect(extractThoughtSummary({} as StreamChunk)).toBeNull()
    expect(extractThoughtSummary({ candidates: [] } as StreamChunk)).toBeNull()
    expect(extractThoughtSummary(chunkWithParts([]))).toBeNull()
  })
})

// ============ extractImagesFromChunk ============

describe('extractImagesFromChunk', () => {
  it('提取所有 image/* 类型的内联数据', () => {
    const chunk = chunkWithParts([
      { inlineData: { mimeType: 'image/png', data: 'img1' } },
      { text: 'hi' },
      { inlineData: { mimeType: 'image/webp', data: 'img2' } },
    ])
    expect(extractImagesFromChunk(chunk)).toEqual([
      { mimeType: 'image/png', data: 'img1' },
      { mimeType: 'image/webp', data: 'img2' },
    ])
  })

  it('过滤非图片类型', () => {
    const chunk = chunkWithParts([
      { inlineData: { mimeType: 'application/pdf', data: 'pdf' } },
    ])
    expect(extractImagesFromChunk(chunk)).toEqual([])
  })

  it('无 candidates 时返回空数组', () => {
    expect(extractImagesFromChunk({} as StreamChunk)).toEqual([])
  })
})

// ============ extractTokenUsage ============

describe('extractTokenUsage', () => {
  it('映射完整的 usageMetadata', () => {
    const chunk: StreamChunk = {
      usageMetadata: {
        promptTokenCount: 10,
        candidatesTokenCount: 20,
        thoughtsTokenCount: 5,
        totalTokenCount: 35,
      },
    }
    expect(extractTokenUsage(chunk)).toEqual({
      promptTokens: 10,
      completionTokens: 20,
      thoughtsTokens: 5,
      totalTokens: 35,
    })
  })

  it('缺失的计数字段默认为 0', () => {
    const chunk = { usageMetadata: { promptTokenCount: 10 } } as StreamChunk
    expect(extractTokenUsage(chunk)).toEqual({
      promptTokens: 10,
      completionTokens: 0,
      thoughtsTokens: 0,
      totalTokens: 0,
    })
  })

  it('无 usageMetadata 时返回 null', () => {
    expect(extractTokenUsage({} as StreamChunk)).toBeNull()
  })
})

// ============ extractUrlContextMetadata ============

describe('extractUrlContextMetadata', () => {
  it('提取合法的 URL 元数据', () => {
    const result = extractUrlContextMetadata({
      urlContextMetadata: {
        urlMetadata: [
          { retrievedUrl: 'https://a.com', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' },
          { retrievedUrl: 'https://b.com', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_ERROR' },
        ],
      },
    })
    expect(result).toEqual({
      urlMetadata: [
        { retrievedUrl: 'https://a.com', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' },
        { retrievedUrl: 'https://b.com', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_ERROR' },
      ],
    })
  })

  it('跳过非法条目，保留合法条目', () => {
    const result = extractUrlContextMetadata({
      urlContextMetadata: {
        urlMetadata: [
          null,
          'str',
          { retrievedUrl: 123, urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' },
          { retrievedUrl: 'https://a.com', urlRetrievalStatus: 'INVALID_STATUS' },
          { retrievedUrl: 'https://ok.com', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' },
        ],
      },
    })
    expect(result).toEqual({
      urlMetadata: [
        { retrievedUrl: 'https://ok.com', urlRetrievalStatus: 'URL_RETRIEVAL_STATUS_SUCCESS' },
      ],
    })
  })

  it('全部条目非法时返回 undefined', () => {
    const result = extractUrlContextMetadata({
      urlContextMetadata: { urlMetadata: [{ retrievedUrl: 1 }] },
    })
    expect(result).toBeUndefined()
  })

  it('缺失或非法结构返回 undefined', () => {
    expect(extractUrlContextMetadata(null)).toBeUndefined()
    expect(extractUrlContextMetadata('str')).toBeUndefined()
    expect(extractUrlContextMetadata({})).toBeUndefined()
    expect(extractUrlContextMetadata({ urlContextMetadata: 'x' })).toBeUndefined()
    expect(extractUrlContextMetadata({ urlContextMetadata: { urlMetadata: 'x' } })).toBeUndefined()
    expect(extractUrlContextMetadata({ urlContextMetadata: { urlMetadata: [] } })).toBeUndefined()
  })
})
