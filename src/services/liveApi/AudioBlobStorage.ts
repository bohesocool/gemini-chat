/**
 * 音频 Blob 存储服务
 * 使用 IndexedDB 存储 Live API 会话的音频数据
 * Requirements: 2.1, 2.2, 2.3, 8.2
 */

import { LiveApiError } from './errors';

/**
 * 存储错误类
 * 用于 IndexedDB 操作失败的情况
 */
export class StorageError extends LiveApiError {
  constructor(message: string, isRetryable: boolean = false) {
    super(message, 'STORAGE_ERROR', isRetryable);
    this.name = 'StorageError';
  }
}

/**
 * 存储空间不足错误类
 * Requirements: 2.5
 */
export class QuotaExceededError extends StorageError {
  constructor() {
    super('存储空间不足，请清理部分历史记录', false);
    this.name = 'QuotaExceededError';
  }
}

/**
 * 音频未找到错误类
 */
export class AudioNotFoundError extends StorageError {
  constructor(audioId: string) {
    super(`音频数据未找到: ${audioId}`, false);
    this.name = 'AudioNotFoundError';
  }
}

/**
 * 音频 Blob 存储记录
 */
export interface AudioBlobRecord {
  /** 音频唯一标识 */
  id: string;
  /** 音频数据 */
  data: ArrayBuffer;
  /** MIME 类型 */
  mimeType: string;
  /** 创建时间戳 */
  createdAt: number;
}

/** 数据库名称 */
const DB_NAME = 'gemini-chat-live-audio';
/** 数据库版本 */
const DB_VERSION = 1;
/** 存储对象名称 */
const STORE_NAME = 'audioBlobs';

/**
 * 音频 Blob 存储服务
 * 使用 IndexedDB 存储音频数据
 * Requirements: 2.1, 2.2, 2.3, 8.2
 */
export class AudioBlobStorage {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * 初始化数据库
   * 创建或打开 IndexedDB 数据库
   */
  async initialize(): Promise<void> {
    // 如果已经在初始化中，返回现有的 Promise
    if (this.initPromise) {
      return this.initPromise;
    }

    // 如果已经初始化完成，直接返回
    if (this.db) {
      return Promise.resolve();
    }

    this.initPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        this.initPromise = null;
        reject(new StorageError(`无法打开数据库: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建音频存储对象
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * 确保数据库已初始化
   */
  private async ensureInitialized(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initialize();
    }
    if (!this.db) {
      throw new StorageError('数据库未初始化');
    }
    return this.db;
  }

  /**
   * 存储音频 Blob
   * Requirements: 2.1, 2.2
   * 
   * @param audioId - 音频唯一标识
   * @param audioData - 音频数据
   * @param mimeType - MIME 类型
   */
  async storeAudio(audioId: string, audioData: ArrayBuffer, mimeType: string): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      const record: AudioBlobRecord = {
        id: audioId,
        data: audioData,
        mimeType,
        createdAt: Date.now(),
      };

      const request = store.put(record);

      request.onerror = () => {
        // 检查是否是存储空间不足错误
        const error = request.error;
        if (error?.name === 'QuotaExceededError') {
          reject(new QuotaExceededError());
        } else {
          reject(new StorageError(`存储音频失败: ${error?.message || '未知错误'}`));
        }
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 获取音频 Blob
   * Requirements: 2.1
   * 
   * @param audioId - 音频唯一标识
   * @returns 音频 Blob 或 null
   */
  async getAudio(audioId: string): Promise<Blob | null> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(audioId);

      request.onerror = () => {
        reject(new StorageError(`读取音频失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        const record = request.result as AudioBlobRecord | undefined;
        if (record) {
          resolve(new Blob([record.data], { type: record.mimeType }));
        } else {
          resolve(null);
        }
      };
    });
  }

  /**
   * 批量获取音频
   * Requirements: 2.1
   * 
   * @param audioIds - 音频 ID 数组
   * @returns 音频 ID 到 Blob 的映射
   */
  async getAudios(audioIds: string[]): Promise<Map<string, Blob>> {
    const db = await this.ensureInitialized();
    const result = new Map<string, Blob>();

    if (audioIds.length === 0) {
      return result;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      let completed = 0;

      for (const audioId of audioIds) {
        const request = store.get(audioId);

        request.onerror = () => {
          // 单个读取失败不影响其他
          completed++;
          if (completed === audioIds.length) {
            resolve(result);
          }
        };

        request.onsuccess = () => {
          const record = request.result as AudioBlobRecord | undefined;
          if (record) {
            result.set(audioId, new Blob([record.data], { type: record.mimeType }));
          }
          completed++;
          if (completed === audioIds.length) {
            resolve(result);
          }
        };
      }

      transaction.onerror = () => {
        reject(new StorageError(`批量读取音频失败: ${transaction.error?.message || '未知错误'}`));
      };
    });
  }

  /**
   * 删除音频
   * Requirements: 7.2
   * 
   * @param audioId - 音频唯一标识
   */
  async deleteAudio(audioId: string): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(audioId);

      request.onerror = () => {
        reject(new StorageError(`删除音频失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 批量删除音频
   * Requirements: 7.2
   * 
   * @param audioIds - 音频 ID 数组
   */
  async deleteAudios(audioIds: string[]): Promise<void> {
    const db = await this.ensureInitialized();

    if (audioIds.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      let completed = 0;

      for (const audioId of audioIds) {
        const request = store.delete(audioId);

        request.onerror = () => {
          // 单个删除失败不影响其他
          completed++;
          if (completed === audioIds.length) {
            resolve();
          }
        };

        request.onsuccess = () => {
          completed++;
          if (completed === audioIds.length) {
            resolve();
          }
        };
      }

      transaction.onerror = () => {
        reject(new StorageError(`批量删除音频失败: ${transaction.error?.message || '未知错误'}`));
      };
    });
  }

  /**
   * 获取存储使用量
   * Requirements: 2.5
   * 
   * @returns 已使用和配额信息
   */
  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    // 尝试使用 Storage API 获取配额信息
    if (navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        };
      } catch {
        // 如果 Storage API 不可用，返回默认值
        return { used: 0, quota: 0 };
      }
    }

    // 如果 Storage API 不可用，返回默认值
    return { used: 0, quota: 0 };
  }

  /**
   * 清空所有音频数据
   * Requirements: 7.3
   */
  async clearAll(): Promise<void> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => {
        reject(new StorageError(`清空音频数据失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 关闭数据库连接
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
}

// 导出单例实例
export const audioBlobStorage = new AudioBlobStorage();
