/**
 * Live API 会话存储服务
 * 使用 IndexedDB 持久化会话数据
 * Requirements: 1.2, 7.1, 7.3, 8.1, 8.3
 */

import type {
  LiveSessionRecord,
  LiveMessageRecord,
  LiveSessionSummary,
  LiveSessionConfig,
} from '../../types/liveApi';
import { StorageError } from './AudioBlobStorage';

/** 数据库名称 */
const DB_NAME = 'gemini-chat-live-sessions';
/** 数据库版本 */
const DB_VERSION = 1;
/** 存储对象名称 */
const STORE_NAME = 'sessions';

/**
 * Live API 会话存储服务
 * 使用 IndexedDB 持久化会话数据
 * Requirements: 1.2, 7.1, 7.3, 8.1, 8.3
 */
export class LiveSessionStorage {
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

        // 创建会话存储对象
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
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
   * 生成唯一 ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  /**
   * 创建新会话
   * Requirements: 1.5
   *
   * @param config - 会话配置
   * @returns 创建的会话记录
   */
  async createSession(config: LiveSessionConfig): Promise<LiveSessionRecord> {
    const db = await this.ensureInitialized();
    const now = Date.now();

    const session: LiveSessionRecord = {
      id: this.generateId(),
      createdAt: now,
      updatedAt: now,
      messages: [],
      config,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(session);

      request.onerror = () => {
        reject(new StorageError(`创建会话失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve(session);
      };
    });
  }

  /**
   * 获取会话
   * Requirements: 1.4
   *
   * @param sessionId - 会话 ID
   * @returns 会话记录或 null
   */
  async getSession(sessionId: string): Promise<LiveSessionRecord | null> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(sessionId);

      request.onerror = () => {
        reject(new StorageError(`获取会话失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve(request.result || null);
      };
    });
  }

  /**
   * 获取所有会话摘要（按时间倒序）
   * Requirements: 1.2
   *
   * @returns 会话摘要列表
   */
  async getAllSessionSummaries(): Promise<LiveSessionSummary[]> {
    const db = await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('createdAt');
      // 使用 prev 方向获取倒序结果
      const request = index.openCursor(null, 'prev');
      const summaries: LiveSessionSummary[] = [];

      request.onerror = () => {
        reject(new StorageError(`获取会话列表失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const session = cursor.value as LiveSessionRecord;
          // 获取首条消息的转录作为摘要
          const firstMessage = session.messages[0];
          const summary = firstMessage?.transcript || '（无消息）';

          summaries.push({
            id: session.id,
            createdAt: session.createdAt,
            summary: summary.length > 50 ? summary.substring(0, 50) + '...' : summary,
            messageCount: session.messages.length,
          });

          cursor.continue();
        } else {
          resolve(summaries);
        }
      };
    });
  }

  /**
   * 添加消息到会话
   * Requirements: 2.1, 2.2
   *
   * @param sessionId - 会话 ID
   * @param message - 消息记录
   */
  async addMessage(sessionId: string, message: LiveMessageRecord): Promise<void> {
    const db = await this.ensureInitialized();

    // 先获取会话
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new StorageError(`会话不存在: ${sessionId}`);
    }

    // 添加消息并更新时间
    session.messages.push(message);
    session.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onerror = () => {
        reject(new StorageError(`添加消息失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 更新消息转录
   * Requirements: 4.1
   *
   * @param sessionId - 会话 ID
   * @param messageId - 消息 ID
   * @param transcript - 新的转录文字
   */
  async updateMessageTranscript(
    sessionId: string,
    messageId: string,
    transcript: string
  ): Promise<void> {
    const db = await this.ensureInitialized();

    // 先获取会话
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new StorageError(`会话不存在: ${sessionId}`);
    }

    // 查找并更新消息
    const message = session.messages.find((m) => m.id === messageId);
    if (!message) {
      throw new StorageError(`消息不存在: ${messageId}`);
    }

    message.transcript = transcript;
    session.updatedAt = Date.now();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(session);

      request.onerror = () => {
        reject(new StorageError(`更新转录失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve();
      };
    });
  }

  /**
   * 删除会话
   * Requirements: 7.1
   *
   * @param sessionId - 会话 ID
   * @returns 被删除会话中的所有音频 ID（用于清理音频数据）
   */
  async deleteSession(sessionId: string): Promise<string[]> {
    const db = await this.ensureInitialized();

    // 先获取会话以获取音频 ID 列表
    const session = await this.getSession(sessionId);
    const audioIds: string[] = [];

    if (session) {
      for (const message of session.messages) {
        if (message.audioId) {
          audioIds.push(message.audioId);
        }
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(sessionId);

      request.onerror = () => {
        reject(new StorageError(`删除会话失败: ${request.error?.message || '未知错误'}`));
      };

      request.onsuccess = () => {
        resolve(audioIds);
      };
    });
  }

  /**
   * 清空所有会话
   * Requirements: 7.3
   *
   * @returns 所有被删除会话中的音频 ID 列表
   */
  async clearAllSessions(): Promise<string[]> {
    const db = await this.ensureInitialized();

    // 先获取所有会话以收集音频 ID
    const allAudioIds: string[] = [];

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // 先遍历收集所有音频 ID
      const cursorRequest = store.openCursor();

      cursorRequest.onsuccess = () => {
        const cursor = cursorRequest.result;
        if (cursor) {
          const session = cursor.value as LiveSessionRecord;
          for (const message of session.messages) {
            if (message.audioId) {
              allAudioIds.push(message.audioId);
            }
          }
          cursor.continue();
        } else {
          // 遍历完成后清空存储
          const clearRequest = store.clear();

          clearRequest.onerror = () => {
            reject(new StorageError(`清空会话失败: ${clearRequest.error?.message || '未知错误'}`));
          };

          clearRequest.onsuccess = () => {
            resolve(allAudioIds);
          };
        }
      };

      cursorRequest.onerror = () => {
        reject(new StorageError(`获取会话列表失败: ${cursorRequest.error?.message || '未知错误'}`));
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
export const liveSessionStorage = new LiveSessionStorage();
