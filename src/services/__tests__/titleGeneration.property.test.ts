/**
 * cleanTitle 函数的属性测试
 *
 * 使用 fast-check 库对 cleanTitle 函数进行属性测试，
 * 验证其在任意输入下的长度约束和清理行为。
 *
 * Validates: Requirements 2.3, 2.4
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { cleanTitle, shouldGenerateTitle } from '../titleGeneration';

// 定义引号字符集合，与 cleanTitle 实现一致
const QUOTE_CHARS = ['"', "'", '\u201c', '\u201d', '\u2018', '\u2019'];

describe('Feature: auto-title-generation, Property 2: cleanTitle 长度约束', () => {
  /**
   * **Validates: Requirements 2.3**
   *
   * 对于任意字符串输入，cleanTitle 函数的输出长度应不超过 50 个字符（默认 maxLength）。
   */
  it('Feature: auto-title-generation, Property 2: 对于任意字符串输入，输出长度不超过默认 maxLength (50)', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = cleanTitle(input);
        expect(result.length).toBeLessThanOrEqual(50);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.3**
   *
   * 对于任意字符串输入和任意正整数 maxLength，cleanTitle 函数的输出长度应不超过指定的 maxLength。
   */
  it('Feature: auto-title-generation, Property 2: 对于任意字符串和任意正整数 maxLength，输出长度不超过 maxLength', () => {
    fc.assert(
      fc.property(
        fc.string(),
        fc.integer({ min: 1, max: 200 }),
        (input, maxLength) => {
          const result = cleanTitle(input, maxLength);
          expect(result.length).toBeLessThanOrEqual(maxLength);
        }
      ),
      { numRuns: 100 }
    );
  });
});

describe('Feature: auto-title-generation, Property 3: cleanTitle 清理行为', () => {
  /**
   * 生成包含首尾引号或空白字符的字符串的生成器
   */
  const stringWithQuotesOrWhitespace = fc.tuple(
    // 前缀：引号和空白的组合
    fc.array(fc.oneof(
      fc.constantFrom(...QUOTE_CHARS),
      fc.constantFrom(' ', '\t', '\n', '\r')
    ), { minLength: 1, maxLength: 5 }),
    // 中间内容
    fc.string({ minLength: 1 }),
    // 后缀：引号和空白的组合
    fc.array(fc.oneof(
      fc.constantFrom(...QUOTE_CHARS),
      fc.constantFrom(' ', '\t', '\n', '\r')
    ), { minLength: 1, maxLength: 5 })
  ).map(([prefix, content, suffix]) => prefix.join('') + content + suffix.join(''));

  /**
   * **Validates: Requirements 2.4**
   *
   * 对于任意包含首尾引号或首尾空白字符的字符串，
   * cleanTitle 函数的输出不应以引号开头或结尾，且不应包含首尾空白字符。
   */
  it('Feature: auto-title-generation, Property 3: 输出不应以引号开头或结尾，且不应包含首尾空白字符', () => {
    fc.assert(
      fc.property(stringWithQuotesOrWhitespace, (input) => {
        const result = cleanTitle(input);

        // 如果结果为空字符串，则无需检查首尾字符
        if (result.length === 0) {
          return;
        }

        // 输出不应以引号开头
        expect(QUOTE_CHARS).not.toContain(result[0]);

        // 输出不应以引号结尾
        expect(QUOTE_CHARS).not.toContain(result[result.length - 1]);

        // 输出不应包含首尾空白字符
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 }
    );
  });

  /**
   * **Validates: Requirements 2.4**
   *
   * 对于任意字符串输入（不仅限于包含引号的字符串），
   * cleanTitle 的输出也不应以引号开头或结尾，且不应包含首尾空白。
   */
  it('Feature: auto-title-generation, Property 3: 对于任意字符串输入，输出也不应以引号开头或结尾', () => {
    fc.assert(
      fc.property(fc.string(), (input) => {
        const result = cleanTitle(input);

        if (result.length === 0) {
          return;
        }

        // 输出不应以引号开头
        expect(QUOTE_CHARS).not.toContain(result[0]);

        // 输出不应以引号结尾
        expect(QUOTE_CHARS).not.toContain(result[result.length - 1]);

        // 输出不应包含首尾空白字符
        expect(result).toBe(result.trim());
      }),
      { numRuns: 100 }
    );
  });
});


describe('Feature: auto-title-generation, Property 1: 标题生成触发条件守卫', () => {
  /**
   * **Validates: Requirements 1.5, 3.4**
   *
   * 对于任意聊天窗口状态和设置状态的组合，当 `titleGenerated` 为 `true` 或
   * `autoTitleEnabled` 为 `false` 时，标题生成函数应返回 false（跳过信号）。
   */
  it('Feature: auto-title-generation, Property 1: 标题生成触发条件守卫', () => {
    // titleGenerated 可能为 true、false 或 undefined
    const titleGeneratedArb = fc.oneof(
      fc.constant(true),
      fc.constant(false),
      fc.constant(undefined)
    );

    fc.assert(
      fc.property(
        fc.boolean(), // autoTitleEnabled
        titleGeneratedArb, // titleGenerated
        fc.boolean(), // isFirstAiReply
        (autoTitleEnabled, titleGenerated, isFirstAiReply) => {
          const result = shouldGenerateTitle(autoTitleEnabled, titleGenerated, isFirstAiReply);

          // 守卫条件：当 autoTitleEnabled 为 false 时，必须返回 false（需求 3.4）
          if (!autoTitleEnabled) {
            expect(result).toBe(false);
          }

          // 守卫条件：当 titleGenerated 为 true 时，必须返回 false（需求 1.5）
          if (titleGenerated === true) {
            expect(result).toBe(false);
          }

          // 正向条件：当所有条件都满足时，应返回 true
          if (autoTitleEnabled && titleGenerated !== true && isFirstAiReply) {
            expect(result).toBe(true);
          }

          // 非第一条 AI 回复时，也应返回 false
          if (!isFirstAiReply) {
            expect(result).toBe(false);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
