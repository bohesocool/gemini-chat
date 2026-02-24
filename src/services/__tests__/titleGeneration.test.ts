/**
 * cleanTitle 函数的单元测试
 *
 * 测试各种边界情况：空字符串、超长字符串、各类引号、空白字符组合等。
 *
 * Validates: Requirements 2.3, 2.4
 */

import { describe, it, expect } from 'vitest';
import { cleanTitle } from '../titleGeneration';

describe('cleanTitle', () => {
  // --- 空字符串和空白字符 ---

  it('空字符串输入应返回空字符串', () => {
    expect(cleanTitle('')).toBe('');
  });

  it('仅包含空白字符的字符串应返回空字符串', () => {
    expect(cleanTitle('   ')).toBe('');
    expect(cleanTitle('\t\n\r')).toBe('');
    expect(cleanTitle('  \t  \n  ')).toBe('');
  });

  it('仅包含引号的字符串应返回空字符串', () => {
    expect(cleanTitle('""')).toBe('');
    expect(cleanTitle("''")).toBe('');
    expect(cleanTitle('\u201c\u201d')).toBe(''); // ""
    expect(cleanTitle('\u2018\u2019')).toBe(''); // ''
    expect(cleanTitle('"\u201c\u2018')).toBe('');
  });

  // --- 正常字符串（无引号） ---

  it('正常字符串无引号应原样返回', () => {
    expect(cleanTitle('对话标题')).toBe('对话标题');
    expect(cleanTitle('Hello World')).toBe('Hello World');
  });

  // --- 首尾双引号 ---

  it('应去除首尾双引号', () => {
    expect(cleanTitle('"对话标题"')).toBe('对话标题');
    expect(cleanTitle('"Hello World"')).toBe('Hello World');
  });

  // --- 首尾单引号 ---

  it('应去除首尾单引号', () => {
    expect(cleanTitle("'对话标题'")).toBe('对话标题');
    expect(cleanTitle("'Hello World'")).toBe('Hello World');
  });

  // --- 中文引号 ---

  it('应去除首尾中文双引号（\u201c\u201d）', () => {
    expect(cleanTitle('\u201c对话标题\u201d')).toBe('对话标题');
  });

  it('应去除首尾中文单引号（\u2018\u2019）', () => {
    expect(cleanTitle('\u2018对话标题\u2019')).toBe('对话标题');
  });

  // --- 混合引号 ---

  it('应去除混合类型的首尾引号', () => {
    // 左边双引号，右边单引号
    expect(cleanTitle('"对话标题\'')).toBe('对话标题');
    // 左边中文引号，右边英文引号
    expect(cleanTitle('\u201c对话标题"')).toBe('对话标题');
  });

  // --- 嵌套引号 ---

  it('应去除多层嵌套的引号', () => {
    expect(cleanTitle('""对话标题""')).toBe('对话标题');
    expect(cleanTitle('\'"对话标题"\'')).toBe('对话标题');
    expect(cleanTitle('\u201c"对话标题"\u201d')).toBe('对话标题');
  });

  // --- 超长字符串截断 ---

  it('超过默认 maxLength (50) 的字符串应被截断', () => {
    const longStr = 'a'.repeat(60);
    const result = cleanTitle(longStr);
    expect(result.length).toBe(50);
    expect(result).toBe('a'.repeat(50));
  });

  it('恰好 50 个字符的字符串不应被截断', () => {
    const str50 = 'b'.repeat(50);
    expect(cleanTitle(str50)).toBe(str50);
  });

  // --- 自定义 maxLength ---

  it('应支持自定义 maxLength 参数', () => {
    const longStr = 'c'.repeat(30);
    expect(cleanTitle(longStr, 10)).toBe('c'.repeat(10));
    expect(cleanTitle(longStr, 30)).toBe(longStr);
    expect(cleanTitle(longStr, 100)).toBe(longStr);
  });

  // --- 引号和空白混合在边界 ---

  it('应去除引号和空白字符交替出现的边界', () => {
    expect(cleanTitle('  "对话标题"  ')).toBe('对话标题');
    expect(cleanTitle('" 对话标题 "')).toBe('对话标题');
    expect(cleanTitle('  " \t对话标题\t " \n')).toBe('对话标题');
  });

  it('应处理引号-空白-引号交替的复杂情况', () => {
    expect(cleanTitle('\' " 对话标题 " \'')).toBe('对话标题');
    expect(cleanTitle('  \u201c  对话标题  \u201d  ')).toBe('对话标题');
  });

  // --- 中间的引号应保留 ---

  it('字符串中间的引号应被保留', () => {
    expect(cleanTitle('他说"你好"世界')).toBe('他说"你好"世界');
    expect(cleanTitle("it's a test")).toBe("it's a test");
    expect(cleanTitle('引用\u201c内容\u201d结束')).toBe('引用\u201c内容\u201d结束');
  });

  // --- 首尾空白与截断的组合 ---

  it('先清理引号和空白，再截断', () => {
    // 引号和空白被去除后，内容仍超过 maxLength
    const content = 'x'.repeat(60);
    const input = `"${content}"`;
    const result = cleanTitle(input);
    expect(result.length).toBe(50);
    expect(result).toBe('x'.repeat(50));
  });

  it('清理引号后内容不超过 maxLength 则不截断', () => {
    const content = 'y'.repeat(10);
    const input = `"${content}"`;
    expect(cleanTitle(input)).toBe(content);
  });
});


import { shouldGenerateTitle } from '../titleGeneration';

describe('shouldGenerateTitle', () => {
  // --- 所有条件满足时应返回 true ---

  it('所有条件满足时应返回 true', () => {
    expect(shouldGenerateTitle(true, undefined, true)).toBe(true);
  });

  it('titleGenerated 为 false 时，其他条件满足应返回 true', () => {
    expect(shouldGenerateTitle(true, false as unknown as boolean | undefined, true)).toBe(true);
  });

  // --- autoTitleEnabled 为 false 时应返回 false ---

  it('autoTitleEnabled 为 false 时应返回 false', () => {
    expect(shouldGenerateTitle(false, undefined, true)).toBe(false);
  });

  // --- titleGenerated 为 true 时应返回 false ---

  it('titleGenerated 为 true 时应返回 false', () => {
    expect(shouldGenerateTitle(true, true, true)).toBe(false);
  });

  // --- isFirstAiReply 为 false 时应返回 false ---

  it('isFirstAiReply 为 false 时应返回 false', () => {
    expect(shouldGenerateTitle(true, undefined, false)).toBe(false);
  });

  // --- 多个条件不满足时应返回 false ---

  it('所有条件都不满足时应返回 false', () => {
    expect(shouldGenerateTitle(false, true, false)).toBe(false);
  });

  it('autoTitleEnabled 为 false 且 titleGenerated 为 true 时应返回 false', () => {
    expect(shouldGenerateTitle(false, true, true)).toBe(false);
  });

  it('autoTitleEnabled 为 false 且 isFirstAiReply 为 false 时应返回 false', () => {
    expect(shouldGenerateTitle(false, undefined, false)).toBe(false);
  });
});
