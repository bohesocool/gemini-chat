/**
 * Markdown 渲染缓存服务
 * 需求: 2.1 - 使用缓存避免重复解析
 */

import type { ReactNode } from 'react';
import { TIMEOUTS, UI_LIMITS } from '../constants';

// ============ 类型定义 ============

/**
 * Markdown 缓存条目
 */
export interface MarkdownCacheEntry {
  /** 原始 Markdown 内容 */
  content: string;
  /** 渲染后的 React 节点 */
  rendered: ReactNode;
  /** 缓存时间戳 */
  timestamp: number;
}

/**
 * Markdown 缓存配置
 */
export interface MarkdownCacheConfig {
  /** 最大缓存条目数 */
  maxEntries: number;
  /** 缓存过期时间（毫秒） */
  ttl: number;
}

// ============ 默认配置 ============

const DEFAULT_CONFIG: MarkdownCacheConfig = {
  maxEntries: UI_LIMITS.MAX_CACHE_ENTRIES,
  ttl: TIMEOUTS.CACHE_TTL,
};

// ============ LRU 缓存实现 ============

/**
 * LRU 缓存类
 * 实现最近最少使用淘汰策略
 */
class LRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(maxSize: number) {
    this.cache = new Map();
    this.maxSize = maxSize;
  }

  /**
   * 获取缓存值
   * 访问后将条目移到最近使用位置
   */
  get(key: K): V | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }
    
    // 移到最近使用位置（Map 保持插入顺序）
    const value = this.cache.get(key)!;
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存值
   * 如果超过最大容量，淘汰最久未使用的条目
   */
  set(key: K, value: V): void {
    // 如果已存在，先删除
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    
    // 如果达到最大容量，删除最久未使用的条目
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    
    this.cache.set(key, value);
  }

  /**
   * 检查是否存在
   */
  has(key: K): boolean {
    return this.cache.has(key);
  }

  /**
   * 删除条目
   */
  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存大小
   */
  get size(): number {
    return this.cache.size;
  }

  /**
   * 获取所有条目（用于清理过期条目）
   */
  entries(): IterableIterator<[K, V]> {
    return this.cache.entries();
  }
}

// ============ Markdown 缓存服务 ============

/**
 * Markdown 缓存服务类
 */
class MarkdownCacheService {
  private cache: LRUCache<string, MarkdownCacheEntry>;
  private config: MarkdownCacheConfig;
  private cleanupTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: Partial<MarkdownCacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new LRUCache(this.config.maxEntries);
    
    // 启动定期清理
    this.startCleanup();
  }

  /**
   * 生成缓存键
   * 使用内容的哈希值作为键
   */
  private generateKey(content: string): string {
    // 简单的字符串哈希
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为 32 位整数
    }
    return `md_${hash}_${content.length}`;
  }

  /**
   * 获取缓存的渲染结果
   * 如果缓存命中且未过期，返回缓存的 ReactNode
   */
  get(content: string): ReactNode | null {
    const key = this.generateKey(content);
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }
    
    // 检查是否过期
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    // 验证内容是否匹配（防止哈希冲突）
    if (entry.content !== content) {
      return null;
    }
    
    return entry.rendered;
  }

  /**
   * 设置缓存
   */
  set(content: string, rendered: ReactNode): void {
    const key = this.generateKey(content);
    const entry: MarkdownCacheEntry = {
      content,
      rendered,
      timestamp: Date.now(),
    };
    this.cache.set(key, entry);
  }

  /**
   * 检查是否有缓存
   */
  has(content: string): boolean {
    const cached = this.get(content);
    return cached !== null;
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxEntries,
    };
  }

  /**
   * 启动定期清理过期条目
   */
  private startCleanup(): void {
    // 每分钟清理一次
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired();
    }, TIMEOUTS.CLEANUP_INTERVAL);
  }

  /**
   * 清理过期条目
   */
  private cleanupExpired(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * 销毁服务（清理定时器）
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// ============ 单例导出 ============

/** 全局 Markdown 缓存实例 */
export const markdownCache = new MarkdownCacheService();

/** 创建新的缓存实例（用于测试） */
export function createMarkdownCache(config?: Partial<MarkdownCacheConfig>): MarkdownCacheService {
  return new MarkdownCacheService(config);
}

export default markdownCache;
