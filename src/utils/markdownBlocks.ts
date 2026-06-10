/**
 * Markdown 顶层块切分器
 *
 * 用于流式渲染性能优化：把整段 Markdown 切成若干顶层块，
 * 每块独立渲染并按内容记忆化。流式输出时只有最后一块在变、
 * 需要重新解析，前面已稳定的块字符串不变 → 复用渲染结果。
 *
 * 设计原则：**宁可合并，不可错切**。错误的切分会破坏渲染
 * （切坏代码块、公式、有序列表编号）；过度合并只是少一点性能，
 * 渲染结果始终正确。因此在任何不确定的边界都选择合并。
 */

/** 列表项起始：-, *, +, 或 1. / 1) （允许 0-3 空格缩进） */
const LIST_ITEM_RE = /^ {0,3}([-*+]|\d{1,9}[.)])\s+/;
/** 缩进行（tab 或 >=2 个空格）：列表续行 / 缩进代码块 / 嵌套内容 */
const INDENTED_RE = /^(\t| {2,})/;
/** 引用块 */
const BLOCKQUOTE_RE = /^ {0,3}>/;
/** 围栏代码块起始：``` 或 ~~~（允许 0-3 空格缩进） */
const FENCE_OPEN_RE = /^ {0,3}(`{3,}|~{3,})/;
/** 围栏代码块结束（整行仅含围栏符号） */
const FENCE_CLOSE_RE = /^ {0,3}(`{3,}|~{3,})\s*$/;

function isBlank(line: string): boolean {
  return line.trim() === '';
}

interface Segment {
  /** 起始行索引（含） */
  start: number;
  /** 结束行索引（不含） */
  end: number;
}

/**
 * 第一遍：把文本按空行切成「段」，但代码围栏 / 数学块内部的空行不切分。
 */
function collectSegments(lines: string[]): Segment[] {
  const segments: Segment[] = [];
  let segStart = -1;

  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  let inMath = false; // 跨行的 $$ 显示公式块

  const openSeg = (i: number) => {
    if (segStart === -1) segStart = i;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';

    // --- 代码围栏内部：整块归属当前段，空行不切 ---
    if (inFence) {
      openSeg(i);
      const close = line.match(FENCE_CLOSE_RE);
      const fence = close?.[1];
      if (fence && fence[0] === fenceChar && fence.length >= fenceLen) {
        inFence = false;
        fenceChar = '';
        fenceLen = 0;
      }
      continue;
    }

    // --- 围栏起始 ---
    const fenceOpen = line.match(FENCE_OPEN_RE);
    const opening = fenceOpen?.[1];
    if (opening) {
      openSeg(i);
      inFence = true;
      fenceChar = opening[0] ?? '';
      fenceLen = opening.length;
      continue;
    }

    // --- 数学块（$$）：本行含奇数个 $$ 则切换块内/块外状态 ---
    const dollarPairs = (line.match(/\$\$/g) || []).length;
    if (dollarPairs % 2 === 1) {
      openSeg(i);
      inMath = !inMath;
      continue;
    }
    if (inMath) {
      openSeg(i);
      continue;
    }

    // --- 普通行：空行作为段分隔 ---
    if (isBlank(line)) {
      if (segStart !== -1) {
        segments.push({ start: segStart, end: i });
        segStart = -1;
      }
    } else {
      openSeg(i);
    }
  }

  if (segStart !== -1) {
    segments.push({ start: segStart, end: lines.length });
  }

  return segments;
}

/**
 * 判断段 B 是否应并入前一组（前一组末段为 A）。
 * 任何可能破坏渲染的边界都返回 true（合并）。
 */
function shouldMerge(lines: string[], a: Segment, b: Segment): boolean {
  const bFirst = lines[b.start] ?? '';
  const aLast = lines[a.end - 1] ?? '';

  // 缩进行：列表续行 / 缩进代码块 / 嵌套结构
  if (INDENTED_RE.test(bFirst)) return true;

  // 连续的列表项（含松散列表，需保持编号连续）
  if (LIST_ITEM_RE.test(bFirst) && (LIST_ITEM_RE.test(aLast) || INDENTED_RE.test(aLast))) {
    return true;
  }

  // 含空行的引用块
  if (BLOCKQUOTE_RE.test(bFirst) && BLOCKQUOTE_RE.test(aLast)) return true;

  return false;
}

/** 切分结果（含最后一块的起始偏移，用于增量切分） */
interface SplitResult {
  blocks: string[];
  /** 最后一块在原文本中的起始字符偏移（blocks 为空时为 0） */
  lastBlockStart: number;
}

/**
 * 全量切分（内部实现），同时计算最后一块的起始字符偏移。
 *
 * @param asTail 作为增量切分的尾部调用时为 true：此时即使只有一个段
 *   也按组格式化（去掉段外空行），保证拼接结果与全量切分逐字一致。
 */
function splitWithOffset(text: string, asTail = false): SplitResult {
  if (!text) return { blocks: [], lastBlockStart: 0 };

  const lines = text.split('\n');
  const segments = collectSegments(lines);

  // 全是空行 / 无有效段：作为单块返回，保持原样
  if (segments.length === 0) return { blocks: [text], lastBlockStart: 0 };
  if (segments.length === 1 && !asTail) return { blocks: [text], lastBlockStart: 0 };

  // 第二遍：按合并规则把段聚合成最终块
  const groups: Segment[][] = [];
  for (const seg of segments) {
    const lastGroup = groups[groups.length - 1];
    const lastSeg = lastGroup?.[lastGroup.length - 1];
    if (lastGroup && lastSeg && shouldMerge(lines, lastSeg, seg)) {
      lastGroup.push(seg);
    } else {
      groups.push([seg]);
    }
  }

  // 每个最终块取原始行范围（含内部空行，保留松散列表等原始间距）
  const blocks = groups.map((group) => {
    const first = group[0]!;
    const last = group[group.length - 1]!;
    return lines.slice(first.start, last.end).join('\n');
  });

  // 计算最后一块起始行对应的字符偏移（行长 + 换行符）
  const lastStartLine = groups[groups.length - 1]![0]!.start;
  let lastBlockStart = 0;
  for (let i = 0; i < lastStartLine; i++) {
    lastBlockStart += (lines[i]?.length ?? 0) + 1;
  }

  return { blocks, lastBlockStart };
}

/**
 * 把 Markdown 文本切分为可独立渲染的顶层块。
 *
 * 保证：blocks 顺序渲染的结果与整段渲染一致（块间空行为分隔符，
 * 在 Markdown 中不影响渲染）。无内容时返回单元素数组。
 *
 * @param text 原始 Markdown 文本
 * @returns 顶层块文本数组
 */
export function splitMarkdownBlocks(text: string): string[] {
  return splitWithOffset(text).blocks;
}

/** 增量切分缓存（保存上一次的输入与结果） */
export interface MarkdownBlocksCache {
  text: string;
  blocks: string[];
  /** 最后一块在 text 中的起始字符偏移 */
  lastBlockStart: number;
}

/**
 * 增量切分：流式输出时新文本通常只是在旧文本末尾追加。
 * 此时除最后一块外的所有块都已稳定（段边界只依赖其之前的行，
 * 未闭合的围栏/公式只会出现在最后一块），只需重切最后一块起点
 * 之后的尾部文本，避免每个流式更新都全量重扫。
 *
 * 安全条件：旧文本在最后一块起点之后必须已出现过换行——
 * 否则最后一块的首行还可能被追加内容改写，而首行参与
 * 与前一块的合并判定（如列表编号连续性），此时回退全量切分。
 *
 * @param text 当前完整 Markdown 文本
 * @param cache 上一次的切分缓存（首次传 null）
 * @returns 新的缓存（blocks 与全量切分结果一致）
 */
export function splitMarkdownBlocksIncremental(
  text: string,
  cache: MarkdownBlocksCache | null
): MarkdownBlocksCache {
  if (cache && text === cache.text) return cache;

  if (
    cache &&
    cache.blocks.length > 1 &&
    text.startsWith(cache.text) &&
    cache.text.indexOf('\n', cache.lastBlockStart) !== -1
  ) {
    const tail = text.slice(cache.lastBlockStart);
    const tailResult = splitWithOffset(tail, true);
    return {
      text,
      blocks: [...cache.blocks.slice(0, -1), ...tailResult.blocks],
      lastBlockStart: cache.lastBlockStart + tailResult.lastBlockStart,
    };
  }

  const { blocks, lastBlockStart } = splitWithOffset(text);
  return { text, blocks, lastBlockStart };
}
