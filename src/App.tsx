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
import { MigrationPrompt } from './components/MigrationPrompt';
import { useChatWindowStore } from './stores/chatWindow';
import { useSettingsStore } from './stores/settings';
import { useModelStore } from './stores/model';
import { useAuthStore } from './stores/auth';
import { performMigrationIfNeeded, needsMigration } from './services/migration';
import { getAllConversations, saveAllChatWindows } from './services/storageProxy';
import { detectStorageMode, isApiMode, hasApiModeConfig } from './services/storageAdapter';
import { appLogger } from './services/logger';
import { isElectronEnvironment } from './types/auth';
import { startBrowserScheduler, stopBrowserScheduler } from './services/webdav/browserScheduler';

function AppContent() {
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  const isAuthenticated = useAuthStore(s => s.isAuthenticated);

  const {
    initialized: windowsInitialized,
    loadWindows,
  } = useChatWindowStore();

  const {
    initialized: settingsInitialized,
    loadSettings,
  } = useSettingsStore();

  const {
    initialized: modelsInitialized,
    loadModels,
  } = useModelStore();

  const loadAllData = useCallback(async () => {
    setIsInitializing(true);
    setInitError(null);
    try {
      await loadSettings();

      if (needsMigration()) {
        await performMigrationIfNeeded(
          async () => {
            const conversations = await getAllConversations();
            return conversations;
          },
          async (windows) => {
            await saveAllChatWindows(windows);
          },
          {
            model: useSettingsStore.getState().currentModel,
            generationConfig: useSettingsStore.getState().generationConfig,
            systemInstruction: useSettingsStore.getState().systemInstruction,
          }
        );
      }

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
  }, [loadSettings, loadWindows, loadModels]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (hasApiModeConfig() && !isApiMode()) return;
    void loadAllData();
  }, [isAuthenticated, loadAllData]);

  // 浏览器存储模式下启动 WebDAV 自动备份调度器
  useEffect(() => {
    if (!isAuthenticated) return;
    if (isApiMode()) return;
    void startBrowserScheduler();
    return () => {
      stopBrowserScheduler();
    };
  }, [isAuthenticated]);

  const handleRetryInit = useCallback(() => {
    void loadAllData();
  }, [loadAllData]);

  const isLoading = isAuthenticated && (isInitializing || !windowsInitialized || !settingsInitialized || !modelsInitialized);

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
    <AppLoader isLoading={isLoading} minLoadTime={500}>
      <Layout
        sidebar={<Sidebar />}
      >
        <ChatArea />
      </Layout>
      <MigrationPrompt />
    </AppLoader>
  );
}

function App() {
  const [storageModeReady, setStorageModeReady] = useState(false);
  const [storageModeError, setStorageModeError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await detectStorageMode();
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : String(err);
        appLogger.error('存储模式检测失败', err);
        if (isElectronEnvironment()) {
          setStorageModeReady(true);
          return;
        }
        setStorageModeError(message);
      } finally {
        if (!cancelled) setStorageModeReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (storageModeError) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <ErrorMessage
          title="无法连接服务端"
          message={`${storageModeError}（已启用数据库模式但后端不可用，请检查服务是否运行或联系管理员）`}
          onRetry={() => window.location.reload()}
          size="lg"
        />
      </div>
    );
  }

  if (!storageModeReady) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900">
        <AppLoader isLoading minLoadTime={0}><div /></AppLoader>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <AuthGuard>
        <AppContent />
      </AuthGuard>
    </ErrorBoundary>
  );
}

export default App;
