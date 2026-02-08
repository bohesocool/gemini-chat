/**
 * 应用入口组件
 * 需求: 4.1, 5.1, 6.1, 11.1, 12.4
 * 
 * 集成所有组件和状态管理，实现应用初始化逻辑
 * - 使用 ChatWindow store 替代旧的 Conversation store
 * - 集成新的 Layout、Sidebar、ChatArea 组件
 * - 设置已集成到侧边栏中，无需单独的设置面板模态窗口
 * - 实现数据迁移和加载动画
 */

import { useEffect, useState, useCallback } from 'react';
import { Layout } from './components/Layout';
import { Sidebar } from './components/Sidebar/index';
import { ChatArea } from './components/ChatArea/ChatArea';
import { AppLoader } from './components/Loading';
import { ErrorBoundary, ErrorMessage } from './components/Error';
import { AuthGuard } from './components/Auth';
import { useChatWindowStore } from './stores/chatWindow';
import { useSettingsStore } from './stores/settings';
import { useModelStore } from './stores/model';
import { performMigrationIfNeeded, needsMigration } from './services/migration';
import { getAllConversations, saveAllChatWindows } from './services/storage';
import { appLogger } from './services/logger';

// ============ 应用主组件 ============

/**
 * 应用主组件
 * 
 * Requirements:
 * - 4.1: 聊天窗口独立配置（侧边栏集成设置面板）
 * - 5.1: 子话题对话管理
 * - 6.1: 聊天窗口内置配置面板
 * - 11.1: 应用初始化加载动画
 * - 12.4: 数据迁移
 */
function App() {
  // 初始化状态
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // ChatWindow 状态
  const {
    initialized: windowsInitialized,
    loadWindows,
  } = useChatWindowStore();

  // 设置状态
  const {
    initialized: settingsInitialized,
    loadSettings,
  } = useSettingsStore();

  // 模型状态
  const {
    initialized: modelsInitialized,
    loadModels,
  } = useModelStore();

  // 应用初始化 - 执行数据迁移和加载数据
  // Requirements: 11.1, 12.4
  useEffect(() => {
    const initializeApp = async () => {
      setIsInitializing(true);
      setInitError(null);

      try {
        // 1. 首先加载设置
        await loadSettings();

        // 2. 检查并执行数据迁移
        if (needsMigration()) {
          await performMigrationIfNeeded(
            // 加载旧版数据
            async () => {
              const conversations = await getAllConversations();
              return conversations;
            },
            // 保存新版数据
            async (windows) => {
              await saveAllChatWindows(windows);
            },
            // 默认配置
            {
              model: useSettingsStore.getState().currentModel,
              generationConfig: useSettingsStore.getState().generationConfig,
              systemInstruction: useSettingsStore.getState().systemInstruction,
            }
          );
        }

        // 3. 并行加载聊天窗口和模型配置
        await Promise.all([
          loadWindows(),
          loadModels(),
        ]);

      } catch (error) {
        appLogger.error('应用初始化失败:', error);
        setInitError(error instanceof Error ? error.message : '初始化失败');
      } finally {
        setIsInitializing(false);
      }
    };

    initializeApp();
  }, [loadSettings, loadWindows, loadModels]);

  // 处理重试初始化
  const handleRetryInit = useCallback(() => {
    setInitError(null);
    setIsInitializing(true);
    
    // 重新触发初始化
    Promise.all([
      loadSettings(),
      loadWindows(),
      loadModels(),
    ]).catch((error) => {
      setInitError(error instanceof Error ? error.message : '初始化失败');
    }).finally(() => {
      setIsInitializing(false);
    });
  }, [loadSettings, loadWindows, loadModels]);

  // 计算加载状态
  const isLoading = isInitializing || !windowsInitialized || !settingsInitialized || !modelsInitialized;

  // 显示初始化错误
  if (initError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <ErrorMessage
          title="初始化失败"
          message={initError}
          onRetry={handleRetryInit}
          size="lg"
        />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGuard>
        <AppLoader isLoading={isLoading} minLoadTime={500}>
          <Layout
            sidebar={<Sidebar />}
          >
            {/* 聊天区域 - 直接使用 ChatArea，不需要额外包装 */}
            <ChatArea />
          </Layout>
        </AppLoader>
      </AuthGuard>
    </ErrorBoundary>
  );
}

export default App;
