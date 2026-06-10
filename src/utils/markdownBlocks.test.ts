/**
 * Markdown 顶层块切分器测试
 * 重点：增量切分（splitMarkdownBlocksIncremental）的结果
 * 必须与全量切分（splitMarkdownBlocks）逐字一致。
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  splitMarkdownBlocks,
  splitMarkdownBlocksIncremental,
  type MarkdownBlocksCache,
} from './markdownBlocks';

/** 模拟流式输出：按片段逐步追加文本，每步做增量切分并与全量切分对比 */
function assertIncrementalMatchesFull(fragments: string[]): void {
  let text = '';
  let cache: MarkdownBlocksCache | null = null;
  for (const fragment of fragments) {
    text += fragment;
    cache = splitMarkdownBlocksIncremental(text, cache);
    expect(cache.blocks).toEqual(splitMarkdownBlocks(text));
    expect(cache.text).toBe(text);
  }
}

describe('splitMarkdownBlocks', () => {
  it('空文本返回空数组', () => {
    expect(splitMarkdownBlocks('')).toEqual([]);
  });

  it('按空行切分段落', () => {
    expect(splitMarkdownBlocks('a\n\nb')).toEqual(['a', 'b']);
  });

  it('代码围栏内的空行不切分', () => {
    const text = '```js\na\n\nb\n```';
    expect(splitMarkdownBlocks(text)).toEqual([text]);
  });

  it('连续列表项合并为一块（保持编号连续）', () => {
    const text = '1. a\n\n2. b';
    expect(splitMarkdownBlocks(text)).toEqual([text]);
  });
});

describe('splitMarkdownBlocksIncremental', () => {
  it('文本未变化时直接复用缓存对象', () => {
    const cache = splitMarkdownBlocksIncremental('a\n\nb', null);
    expect(splitMarkdownBlocksIncremental('a\n\nb', cache)).toBe(cache);
  });

  it('非前缀更新（如重新生成）回退到全量切分', () => {
    const cache = splitMarkdownBlocksIncremental('aaa\n\nbbb', null);
    const next = splitMarkdownBlocksIncremental('xxx\n\nyyy', cache);
    expect(next.blocks).toEqual(['xxx', 'yyy']);
  });

  it('最后一块首行未完成时不复用（合并判定可能改变）', () => {
    // "1" 单独不是列表项；补全为 "1. b" 后应与前面的列表项合并为一块
    assertIncrementalMatchesFull(['1. a\n\n1', '. b']);
  });

  it('追加内容打开代码围栏时结果仍与全量一致', () => {
    assertIncrementalMatchesFull(['para\n\nsecond\n', '\n```\ncode', '\nmore\n```\n']);
  });

  it('属性测试：任意片段序列下增量结果与全量切分一致', () => {
    // 覆盖各种边界结构的片段池：围栏/公式/列表/缩进/引用/不完整行
    const fragmentPool = [
      'plain text\n',
      'word',
      ' tail',
      '\n',
      '\n\n',
      '- item\n',
      '* item\n',
      '1. item\n',
      '2) item\n',
      '  indented\n',
      '\tindented\n',
      '> quote\n',
      '## heading\n',
      '```\n',
      '```js\n',
      'code line\n',
      '~~~\n',
      '$$\n',
      'x = y\n',
      '$$ inline $$\n',
      '1',
      '. partial list\n',
      '`',
    ];
    fc.assert(
      fc.property(
        fc.array(fc.constantFrom(...fragmentPool), { minLength: 1, maxLength: 40 }),
        (fragments) => {
          assertIncrementalMatchesFull(fragments);
        }
      ),
      { numRuns: 300 }
    );
  });

  it('属性测试：任意字符串按随机位置流式追加', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 0, maxLength: 200, unit: fc.constantFrom('a', ' ', '\n', '-', '`', '$', '>', '1', '.', '\t') }),
        fc.array(fc.nat(200), { maxLength: 8 }),
        (text, cutsRaw) => {
          const cuts = [...new Set(cutsRaw.map((c) => c % (text.length + 1)))].sort((a, b) => a - b);
          const fragments: string[] = [];
          let prev = 0;
          for (const cut of cuts) {
            if (cut > prev) {
              fragments.push(text.slice(prev, cut));
              prev = cut;
            }
          }
          fragments.push(text.slice(prev));
          assertIncrementalMatchesFull(fragments.filter((f) => f !== ''));
        }
      ),
      { numRuns: 300 }
    );
  });
});
