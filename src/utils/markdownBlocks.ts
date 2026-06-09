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
  if (!text) return [];

  const lines = text.split('\n');
  const segments = collectSegments(lines);

  // 全是空行 / 无有效段：作为单块返回，保持原样
  if (segments.length <= 1) return [text];

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
  return groups.map((group) => {
    const first = group[0]!;
    const last = group[group.length - 1]!;
    return lines.slice(first.start, last.end).join('\n');
  });
}
