/**
 * 浏览器端 WebDAV 自动备份调度器
 *
 * 只在页面打开时运行（使用 setInterval）。
 * 关键写操作触发时（可从外部调 markDirty）会标记脏数据，下一次定时点上传。
 * 为避免空跑，无 dirty 标记时跳过。
 */

import { runBrowserSyncOnce } from './browserSync';
import { getFullConfig } from './configStorage';

let timer: number | null = null;
let currentInterval = 300;
let isDirty = false;
let running = false;

function log(msg: string, ...args: unknown[]): void {
  // eslint-disable-next-line no-console
  console.log(`[WebDAV/browser] ${msg}`, ...args);
}

export function markBrowserSyncDirty(): void {
  isDirty = true;
}

async function tick(): Promise<void> {
  if (!isDirty || running) return;
  running = true;
  try {
    const res = await runBrowserSyncOnce();
    if (res.success) {
      isDirty = false;
      log('scheduled sync ok', res.path);
    } else {
      log('scheduled sync failed', res.error);
    }
  } finally {
    running = false;
  }
}

export async function startBrowserScheduler(): Promise<void> {
  stopBrowserScheduler();
  const cfg = await getFullConfig();
  if (!cfg.enabled || !cfg.url) {
    log('not starting: disabled or URL missing');
    return;
  }
  currentInterval = cfg.syncInterval;
  isDirty = true;
  timer = window.setInterval(
    () => {
      tick().catch((e) => log('tick error', e));
    },
    currentInterval * 1000
  );
  // 立即尝试一次
  tick().catch((e) => log('initial sync error', e));
  log(`started (interval: ${currentInterval}s)`);
}

export function stopBrowserScheduler(): void {
  if (timer !== null) {
    window.clearInterval(timer);
    timer = null;
    log('stopped');
  }
}

export function isBrowserSchedulerRunning(): boolean {
  return timer !== null;
}

export async function reloadBrowserScheduler(): Promise<void> {
  stopBrowserScheduler();
  await startBrowserScheduler();
}
