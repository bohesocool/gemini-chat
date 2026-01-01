/**
 * 书签类型定义
 * 需求: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6
 */

/**
 * 书签接口
 */
export interface Bookmark {
  /** 唯一标识 */
  id: string;
  /** 关联的消息 ID */
  messageId: string;
  /** 关联的窗口 ID */
  windowId: string;
  /** 关联的子话题 ID */
  subTopicId: string;
  /** 消息预览（前 100 字符） */
  messagePreview: string;
  /** 消息角色 */
  messageRole: 'user' | 'model';
  /** 窗口标题（用于显示） */
  windowTitle: string;
  /** 创建时间戳 */
  createdAt: number;
}

/**
 * 创建书签时的输入类型
 */
export type CreateBookmarkInput = Omit<Bookmark, 'id' | 'createdAt'>;

/**
 * 书签 Store 状态接口
 */
export interface BookmarkState {
  /** 书签列表 */
  bookmarks: Bookmark[];
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
}

/**
 * 书签 Store 操作接口
 */
export interface BookmarkActions {
  /** 从存储加载书签 */
  loadBookmarks: () => Promise<void>;
  /** 添加书签 */
  addBookmark: (input: CreateBookmarkInput) => Promise<Bookmark>;
  /** 移除书签 */
  removeBookmark: (messageId: string) => Promise<boolean>;
  /** 检查消息是否已收藏 */
  isBookmarked: (messageId: string) => boolean;
  /** 根据消息 ID 获取书签 */
  getBookmarkByMessageId: (messageId: string) => Bookmark | undefined;
  /** 切换书签状态 */
  toggleBookmark: (input: CreateBookmarkInput) => Promise<boolean>;
}

/**
 * 完整的书签 Store 类型
 */
export type BookmarkStore = BookmarkState & BookmarkActions;
