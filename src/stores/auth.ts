/**
 * 鉴权状态管理
 * Requirements: 5.1, 5.7
 */

import { create } from 'zustand';
import type { AuthState } from '../types/auth';
import { isElectronEnvironment } from '../types/auth';
import {
  initAuthConfig,
  updatePassword,
  getAuthConfig,
  loginWithToken,
  restoreSession,
  logoutWithToken,
} from '../services/auth';
import { authLogger as logger } from '../services/logger';

// ============ Store 状态接口 ============

/**
 * 鉴权 Store 状态
 */
interface AuthStoreState extends AuthState {
  /** 是否已初始化 */
  initialized: boolean;
  /** 是否正在加载 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
}

// ============ Store 操作接口 ============

/**
 * 鉴权 Store 操作
 */
interface AuthStoreActions {
  /** 初始化鉴权状态 */
  initialize: () => Promise<void>;
  /** 登录 */
  login: (password: string) => Promise<boolean>;
  /** 登出 */
  logout: () => void;
  /** 重置密码 */
  resetPassword: (newPassword: string, confirmPassword: string) => Promise<boolean>;
  /** 清除错误 */
  clearError: () => void;
}

// ============ Store 类型 ============

export type AuthStore = AuthStoreState & AuthStoreActions;

// ============ Store 创建 ============

/**
 * 创建鉴权 Store
 */
export const useAuthStore = create<AuthStore>((set) => ({
  // 初始状态
  isAuthenticated: false,
  needsPasswordReset: false,
  initialized: false,
  isLoading: false,
  error: null,

  // 初始化鉴权状态
  // 需求: 1.1, 1.3 - 检查 Token 并恢复登录状态
  initialize: async () => {
    set({ isLoading: true, error: null });
    try {
      // Electron 环境下自动跳过密码验证
      if (isElectronEnvironment()) {
        set({
          initialized: true,
          isLoading: false,
          isAuthenticated: true,
          needsPasswordReset: false,
        });
        logger.info('Electron 环境检测到，自动跳过密码验证');
        return;
      }

      const config = await initAuthConfig();

      // 尝试从 Token 恢复登录状态
      const sessionRestored = await restoreSession();

      set({
        initialized: true,
        isLoading: false,
        isAuthenticated: sessionRestored,
        // 如果是默认密码，登录后需要重置
        needsPasswordReset: config.isDefaultPassword,
      });

      if (sessionRestored) {
        logger.info('鉴权系统初始化完成，已从 Token 恢复登录状态');
      } else {
        logger.info('鉴权系统初始化完成');
      }
    } catch (error) {
      logger.error('鉴权系统初始化失败', error);
      set({
        initialized: true,
        isLoading: false,
        error: '鉴权系统初始化失败',
      });
    }
  },

  // 登录
  // 需求: 1.1 - 调用 loginWithToken() 生成并存储 Token
  login: async (password: string) => {
    set({ isLoading: true, error: null });
    try {
      const config = getAuthConfig();
      if (!config) {
        set({ isLoading: false, error: '鉴权配置不存在' });
        return false;
      }

      // 使用 loginWithToken 进行登录，会自动生成并存储 Token
      const isValid = await loginWithToken(password);
      if (isValid) {
        set({
          isAuthenticated: true,
          isLoading: false,
          needsPasswordReset: config.isDefaultPassword,
        });
        logger.info('用户登录成功');
        return true;
      } else {
        set({
          isLoading: false,
          error: '密码错误',
        });
        logger.warn('登录失败：密码错误');
        return false;
      }
    } catch (error) {
      logger.error('登录过程发生错误', error);
      set({
        isLoading: false,
        error: '登录失败，请重试',
      });
      return false;
    }
  },

  // 登出
  // 需求: 1.5 - 调用 logoutWithToken() 清除 Token
  logout: () => {
    // 清除 JWT Token
    logoutWithToken();
    set({
      isAuthenticated: false,
      error: null,
    });
    logger.info('用户已登出');
  },

  // 重置密码
  resetPassword: async (newPassword: string, confirmPassword: string) => {
    set({ isLoading: true, error: null });

    // 验证密码匹配
    if (newPassword !== confirmPassword) {
      set({
        isLoading: false,
        error: '两次输入的密码不一致',
      });
      return false;
    }

    // 验证密码长度
    if (newPassword.length < 6) {
      set({
        isLoading: false,
        error: '密码长度至少为 6 位',
      });
      return false;
    }

    try {
      await updatePassword(newPassword);
      set({
        isLoading: false,
        needsPasswordReset: false,
      });
      logger.info('密码重置成功');
      return true;
    } catch (error) {
      logger.error('密码重置失败', error);
      set({
        isLoading: false,
        error: '密码重置失败，请重试',
      });
      return false;
    }
  },

  // 清除错误
  clearError: () => {
    set({ error: null });
  },
}));
