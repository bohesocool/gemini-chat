/**
 * 设置面板组件
 * 需求: 1.1, 2.1, 3.1, 12.1
 */

import React, { useState, useRef } from 'react';
import { useSettingsStore } from '../stores/settings';
import { useChatWindowStore } from '../stores/chatWindow';
import { exportAllData, importData } from '../services/storage';

import { HARM_CATEGORIES, HARM_BLOCK_THRESHOLDS, type HarmCategory, type HarmBlockThreshold, type SafetySetting } from '../types/gemini';

interface SettingsProps {
  /** 是否显示设置面板 */
  isOpen: boolean;
  /** 关闭设置面板回调 */
  onClose: () => void;
}

/**
 * 设置面板主组件
 */
export function Settings({ isOpen, onClose }: SettingsProps) {
  // 当前激活的设置分组
  const [activeTab, setActiveTab] = useState<'api' | 'model' | 'generation' | 'system' | 'safety' | 'data'>('api');
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 遮罩层 */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* 设置面板 - 移动端全屏，桌面端居中弹窗 */}
      <div className="relative w-full h-full sm:h-auto sm:max-w-3xl sm:max-h-[90vh] bg-white dark:bg-slate-800 sm:rounded-xl shadow-2xl overflow-hidden flex flex-col sm:mx-4">
        {/* 头部 */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900 dark:text-slate-100">设置</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="关闭设置"
          >
            <CloseIcon className="h-5 w-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* 内容区域 - 移动端垂直布局，桌面端水平布局 */}
        <div className="flex flex-col sm:flex-row flex-1 overflow-hidden">
          {/* 标签栏 - 移动端水平滚动，桌面端垂直列表 */}
          <nav className="flex sm:flex-col sm:w-48 border-b sm:border-b-0 sm:border-r border-slate-200 dark:border-slate-700 p-2 sm:p-4 gap-1 sm:space-y-1 overflow-x-auto sm:overflow-x-visible flex-shrink-0">
            <TabButton 
              active={activeTab === 'api'} 
              onClick={() => setActiveTab('api')}
              icon={<KeyIcon className="h-4 w-4" />}
            >
              API 配置
            </TabButton>
            <TabButton 
              active={activeTab === 'model'} 
              onClick={() => setActiveTab('model')}
              icon={<CpuIcon className="h-4 w-4" />}
            >
              模型选择
            </TabButton>
            <TabButton 
              active={activeTab === 'generation'} 
              onClick={() => setActiveTab('generation')}
              icon={<SlidersIcon className="h-4 w-4" />}
            >
              生成参数
            </TabButton>
            <TabButton 
              active={activeTab === 'system'} 
              onClick={() => setActiveTab('system')}
              icon={<MessageIcon className="h-4 w-4" />}
            >
              系统指令
            </TabButton>
            <TabButton 
              active={activeTab === 'safety'} 
              onClick={() => setActiveTab('safety')}
              icon={<ShieldIcon className="h-4 w-4" />}
            >
              安全设置
            </TabButton>
            <TabButton 
              active={activeTab === 'data'} 
              onClick={() => setActiveTab('data')}
              icon={<DatabaseIcon className="h-4 w-4" />}
            >
              数据管理
            </TabButton>
          </nav>

          {/* 右侧内容区 */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {activeTab === 'api' && <ApiConfigSection />}
            {activeTab === 'model' && <ModelSelectSection />}
            {activeTab === 'generation' && <GenerationConfigSection />}
            {activeTab === 'system' && <SystemInstructionSection />}
            {activeTab === 'safety' && <SafetySettingsSection />}
            {activeTab === 'data' && <DataManagementSection />}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============ 标签按钮组件 ============

interface TabButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function TabButton({ active, onClick, icon, children }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex items-center gap-2 sm:gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
        sm:w-full
        ${active 
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' 
          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
        }
      `}
    >
      {icon}
      <span className="hidden sm:inline">{children}</span>
      <span className="sm:hidden text-xs">{children}</span>
    </button>
  );
}

// ============ API 配置设置 ============
// 需求: 1.1, 1.2, 1.3, 1.4, 1.5

function ApiConfigSection() {
  const { 
    apiEndpoint, 
    apiKey, 
    setApiEndpoint, 
    setApiKey, 
    testConnection,
    connectionStatus,
    connectionError 
  } = useSettingsStore();

  const handleTestConnection = async () => {
    await testConnection();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">API 配置</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          配置 Gemini API 的连接信息，支持官方 API 和第三方代理服务。
        </p>
      </div>

      {/* API 端点 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          API 端点地址
        </label>
        <input
          type="url"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://generativelanguage.googleapis.com/v1beta"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          默认为 Google 官方 API 地址，也可以使用自定义代理地址
        </p>
      </div>

      {/* API 密钥 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          API 密钥
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入您的 API 密钥"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          API 密钥将安全存储在本地，不会上传到任何服务器
        </p>
      </div>

      {/* 测试连接按钮 - 需求: 1.5 允许端点为空时测试（使用官方地址） */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleTestConnection}
          disabled={connectionStatus === 'testing' || !apiKey}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-600
            text-white rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {connectionStatus === 'testing' ? '测试中...' : '测试连接'}
        </button>
        
        {/* 连接状态显示 */}
        {connectionStatus === 'success' && (
          <span className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
            <CheckIcon className="h-4 w-4" />
            连接成功
          </span>
        )}
        {connectionStatus === 'error' && (
          <span className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <XIcon className="h-4 w-4" />
            {connectionError || '连接失败'}
          </span>
        )}
      </div>
    </div>
  );
}


// ============ 模型选择设置 ============
// 需求: 1.1, 2.1, 5.4, 8.1, 8.2, 8.4

import { useModelStore } from '../stores/model';
import { ModelList } from './ModelList';
import { ModelEditor } from './ModelEditor';
import type { ModelConfig } from '../types/models';

function ModelSelectSection() {
  const { currentModel, setCurrentModel, apiEndpoint, apiKey } = useSettingsStore();
  const { 
    models, 
    isLoading, 
    error, 
    fetchModels, 
    addModel, 
    updateModel, 
    deleteModel, 
    resetModels,
    clearError 
  } = useModelStore();

  // 编辑器状态
  const [editorMode, setEditorMode] = useState<'closed' | 'new' | 'edit'>('closed');
  const [editingModel, setEditingModel] = useState<ModelConfig | undefined>(undefined);
  // 确认对话框状态
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  // 处理选择模型
  const handleSelectModel = (model: ModelConfig) => {
    setCurrentModel(model.id);
  };

  // 处理编辑模型
  const handleEditModel = (model: ModelConfig) => {
    setEditingModel(model);
    setEditorMode('edit');
  };

  // 处理删除模型
  const handleDeleteModel = async (modelId: string) => {
    setShowDeleteConfirm(modelId);
  };

  // 确认删除
  const confirmDelete = async () => {
    if (showDeleteConfirm) {
      await deleteModel(showDeleteConfirm);
      setShowDeleteConfirm(null);
    }
  };

  // 处理保存模型
  const handleSaveModel = async (model: ModelConfig) => {
    if (editorMode === 'new') {
      await addModel(model);
    } else {
      await updateModel(model.id, model);
    }
    setEditorMode('closed');
    setEditingModel(undefined);
  };

  // 处理获取模型
  const handleFetchModels = async () => {
    if (!apiEndpoint || !apiKey) {
      return;
    }
    await fetchModels(apiEndpoint, apiKey);
  };

  // 处理重置模型
  const handleResetModels = async () => {
    await resetModels();
    setShowResetConfirm(false);
  };

  // 打开新建模型编辑器
  const openNewModelEditor = () => {
    setEditingModel(undefined);
    setEditorMode('new');
  };

  // 关闭编辑器
  const closeEditor = () => {
    setEditorMode('closed');
    setEditingModel(undefined);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">模型管理</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          管理可用的 AI 模型，支持从 API 获取、添加自定义模型和配置高级参数。
        </p>
      </div>

      {/* 操作按钮栏 */}
      <div className="flex flex-wrap gap-2">
        {/* 获取模型按钮 */}
        <button
          onClick={handleFetchModels}
          disabled={isLoading || !apiEndpoint || !apiKey}
          className="flex items-center gap-2 px-3 py-2 bg-blue-500 hover:bg-blue-600 
            disabled:bg-slate-300 dark:disabled:bg-slate-600
            text-white text-sm rounded-lg font-medium transition-colors disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <LoadingSpinner className="h-4 w-4" />
          ) : (
            <RefreshIcon className="h-4 w-4" />
          )}
          获取模型
        </button>

        {/* 添加自定义模型按钮 */}
        <button
          onClick={openNewModelEditor}
          className="flex items-center gap-2 px-3 py-2 bg-green-500 hover:bg-green-600 
            text-white text-sm rounded-lg font-medium transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          添加自定义模型
        </button>

        {/* 重置模型按钮 */}
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-200 dark:bg-slate-600 
            hover:bg-slate-300 dark:hover:bg-slate-500
            text-slate-700 dark:text-slate-200 text-sm rounded-lg font-medium transition-colors"
        >
          <ResetIcon className="h-4 w-4" />
          重置模型
        </button>
      </div>

      {/* API 配置提示 */}
      {(!apiEndpoint || !apiKey) && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <p className="text-sm text-amber-700 dark:text-amber-300">
            请先在"API 配置"中设置 API 端点和密钥，才能获取远程模型列表。
          </p>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 flex items-center justify-between">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          <button
            onClick={clearError}
            className="text-red-500 hover:text-red-600 p-1"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 模型编辑器 */}
      {editorMode !== 'closed' && (
        <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
          <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-4">
            {editorMode === 'new' ? '添加自定义模型' : '编辑模型'}
          </h4>
          <ModelEditor
            model={editingModel}
            allModels={models}
            isNew={editorMode === 'new'}
            onSave={handleSaveModel}
            onCancel={closeEditor}
          />
        </div>
      )}

      {/* 模型列表 */}
      {editorMode === 'closed' && (
        <ModelList
          models={models}
          selectedModelId={currentModel}
          onSelectModel={handleSelectModel}
          onEditModel={handleEditModel}
          onDeleteModel={handleDeleteModel}
        />
      )}

      {/* 当前模型显示 */}
      <CurrentModelInfo currentModel={currentModel} models={models} />

      {/* 重置确认对话框 */}
      {showResetConfirm && (
        <ConfirmDialog
          title="重置模型配置"
          message="确定要重置所有模型配置吗？这将删除所有自定义模型并恢复默认设置。"
          confirmText="重置"
          cancelText="取消"
          onConfirm={handleResetModels}
          onCancel={() => setShowResetConfirm(false)}
          variant="danger"
        />
      )}

      {/* 删除确认对话框 */}
      {showDeleteConfirm && (
        <ConfirmDialog
          title="删除模型"
          message={`确定要删除模型 "${showDeleteConfirm}" 吗？此操作无法撤销。`}
          confirmText="删除"
          cancelText="取消"
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(null)}
          variant="danger"
        />
      )}
    </div>
  );
}

// ============ 当前模型信息组件 ============
// 需求: 3.2, 3.3 - 显示当前模型的有效配置（处理重定向）

interface CurrentModelInfoProps {
  currentModel: string;
  models: ModelConfig[];
}

function CurrentModelInfo({ currentModel, models }: CurrentModelInfoProps) {
  const { getEffectiveConfig } = useModelStore();
  
  // 获取当前模型配置
  const currentModelConfig = models.find(m => m.id === currentModel);
  
  // 获取有效配置（处理重定向）
  const effectiveConfig = getEffectiveConfig(currentModel);
  
  // 检查是否有重定向
  const hasRedirect = currentModelConfig?.redirectTo;
  
  // 获取重定向目标模型
  const targetModel = hasRedirect 
    ? models.find(m => m.id === currentModelConfig.redirectTo)
    : null;

  return (
    <div className="p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg space-y-3">
      {/* 需求 2.3: 显示模型的原始 ID */}
      <div>
        <div className="text-sm text-slate-500 dark:text-slate-400">当前使用模型</div>
        <div className="font-medium text-slate-900 dark:text-slate-100 mt-1 font-mono">
          {currentModel}
        </div>
        {currentModelConfig?.description && (
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {currentModelConfig.description}
          </div>
        )}
      </div>

      {/* 重定向信息 */}
      {hasRedirect && targetModel && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
            <ArrowRightIcon className="h-4 w-4" />
            <span>参数重定向到: <span className="font-mono">{targetModel.id}</span></span>
          </div>
        </div>
      )}

      {/* 有效高级参数配置 */}
      {(effectiveConfig.thinkingLevel || effectiveConfig.mediaResolution) && (
        <div className="pt-2 border-t border-slate-200 dark:border-slate-600">
          <div className="text-sm text-slate-500 dark:text-slate-400 mb-2">
            {hasRedirect ? '生效的高级参数（来自目标模型）' : '高级参数配置'}
          </div>
          <div className="space-y-1">
            {effectiveConfig.thinkingLevel && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">思考深度:</span>
                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded text-xs">
                  {effectiveConfig.thinkingLevel === 'high' ? '高' : '低'}
                </span>
              </div>
            )}
            {effectiveConfig.mediaResolution && (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-slate-600 dark:text-slate-300">媒体分辨率:</span>
                <span className="px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs">
                  {getMediaResolutionLabel(effectiveConfig.mediaResolution)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// 获取媒体分辨率的显示标签
function getMediaResolutionLabel(resolution: string): string {
  const labels: Record<string, string> = {
    'MEDIA_RESOLUTION_LOW': '低',
    'MEDIA_RESOLUTION_MEDIUM': '中',
    'MEDIA_RESOLUTION_HIGH': '高',
  };
  return labels[resolution] || resolution;
}

// 箭头图标（用于重定向显示）
function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

// ============ 确认对话框组件 ============

interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'default' | 'danger';
}

function ConfirmDialog({
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'default',
}: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onCancel} />
      <div className="relative bg-white dark:bg-slate-800 rounded-lg shadow-xl p-6 max-w-sm mx-4">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">{title}</h4>
        <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300
              hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors
              ${variant === 'danger' 
                ? 'bg-red-500 hover:bg-red-600' 
                : 'bg-blue-500 hover:bg-blue-600'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============ 额外图标组件 ============

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

function ResetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 4v5h.582m0 0a8.001 8.001 0 0115.356 2M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  );
}

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" 
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}


// ============ 生成参数设置 ============
// 需求: 2.1, 2.2, 2.3, 2.4, 2.5

function GenerationConfigSection() {
  const { generationConfig, updateGenerationConfig } = useSettingsStore();
  const [stopSequencesInput, setStopSequencesInput] = useState(
    generationConfig.stopSequences?.join(', ') || ''
  );

  const handleStopSequencesChange = (value: string) => {
    setStopSequencesInput(value);
    const sequences = value.split(',').map(s => s.trim()).filter(s => s.length > 0);
    updateGenerationConfig({ stopSequences: sequences.length > 0 ? sequences : undefined });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">生成参数</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          调整 AI 生成内容的参数，控制输出的随机性和长度。
        </p>
      </div>

      {/* Temperature 滑块 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Temperature（温度）
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {generationConfig.temperature ?? 1}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={generationConfig.temperature ?? 1}
          onChange={(e) => updateGenerationConfig({ temperature: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>精确 (0)</span>
          <span>平衡 (1)</span>
          <span>创意 (2)</span>
        </div>
      </div>

      {/* Top P 滑块 */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Top P
          </label>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {generationConfig.topP ?? 0.95}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={generationConfig.topP ?? 0.95}
          onChange={(e) => updateGenerationConfig({ topP: parseFloat(e.target.value) })}
          className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
        />
        <div className="flex justify-between text-xs text-slate-400 mt-1">
          <span>0</span>
          <span>1</span>
        </div>
      </div>

      {/* Top K 输入框 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          Top K
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={generationConfig.topK ?? 40}
          onChange={(e) => updateGenerationConfig({ topK: parseInt(e.target.value) || 40 })}
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          控制每次采样考虑的候选词数量，默认 40
        </p>
      </div>

      {/* Max Output Tokens 输入框 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          最大输出 Token 数
        </label>
        <input
          type="number"
          min="1"
          max="8192"
          value={generationConfig.maxOutputTokens ?? ''}
          onChange={(e) => updateGenerationConfig({ 
            maxOutputTokens: e.target.value ? parseInt(e.target.value) : undefined 
          })}
          placeholder="留空使用默认值"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          限制 AI 回复的最大长度，留空使用模型默认值
        </p>
      </div>

      {/* Stop Sequences 输入 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          停止序列
        </label>
        <input
          type="text"
          value={stopSequencesInput}
          onChange={(e) => handleStopSequencesChange(e.target.value)}
          placeholder="用逗号分隔多个序列"
          className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          当 AI 生成这些序列时会停止输出，用逗号分隔多个序列
        </p>
      </div>
    </div>
  );
}

// ============ 系统指令设置 ============
// 需求: 3.1, 3.2, 3.3, 3.4

function SystemInstructionSection() {
  const { systemInstruction, updateSystemInstruction } = useSettingsStore();
  const { activeWindowId, windows, updateWindowConfig } = useChatWindowStore();
  
  const currentWindow = windows.find(w => w.id === activeWindowId);
  const [windowInstruction, setWindowInstruction] = useState(
    currentWindow?.config.systemInstruction || ''
  );

  const handleWindowInstructionSave = () => {
    if (activeWindowId) {
      updateWindowConfig(activeWindowId, { systemInstruction: windowInstruction || undefined });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">系统指令</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          设置 AI 的角色和行为方式，系统指令会在每次对话开始时发送给 AI。
        </p>
      </div>

      {/* 全局系统指令 */}
      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          全局系统指令
        </label>
        <textarea
          value={systemInstruction}
          onChange={(e) => updateSystemInstruction(e.target.value)}
          placeholder="例如：你是一个专业的编程助手，擅长解答技术问题..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
        />
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          全局系统指令会应用于所有新对话
        </p>
      </div>

      {/* 当前聊天窗口系统指令 */}
      {currentWindow && (
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            当前聊天窗口系统指令
            <span className="ml-2 text-xs text-slate-400 font-normal">
              （仅对当前窗口生效）
            </span>
          </label>
          <textarea
            value={windowInstruction}
            onChange={(e) => setWindowInstruction(e.target.value)}
            placeholder="为当前聊天窗口设置独立的系统指令..."
            rows={4}
            className="w-full px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
          />
          <div className="flex justify-between items-center mt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              窗口级别的系统指令会覆盖全局设置
            </p>
            <button
              onClick={handleWindowInstructionSave}
              className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ 安全设置 ============
// 需求: 12.1, 12.2, 12.3, 12.4

const HARM_CATEGORY_LABELS: Record<HarmCategory, string> = {
  'HARM_CATEGORY_HARASSMENT': '骚扰内容',
  'HARM_CATEGORY_HATE_SPEECH': '仇恨言论',
  'HARM_CATEGORY_SEXUALLY_EXPLICIT': '色情内容',
  'HARM_CATEGORY_DANGEROUS_CONTENT': '危险内容',
};

const THRESHOLD_LABELS: Record<HarmBlockThreshold, string> = {
  'BLOCK_NONE': '不阻止',
  'BLOCK_LOW_AND_ABOVE': '阻止低及以上',
  'BLOCK_MEDIUM_AND_ABOVE': '阻止中及以上',
  'BLOCK_ONLY_HIGH': '仅阻止高风险',
};

function SafetySettingsSection() {
  const { safetySettings, updateSafetySettings } = useSettingsStore();

  const getThresholdForCategory = (category: HarmCategory): HarmBlockThreshold | '' => {
    const setting = safetySettings.find(s => s.category === category);
    return setting?.threshold || '';
  };

  const handleThresholdChange = (category: HarmCategory, threshold: HarmBlockThreshold | '') => {
    let newSettings: SafetySetting[];
    
    if (threshold === '') {
      // 移除该类别的设置
      newSettings = safetySettings.filter(s => s.category !== category);
    } else {
      // 更新或添加设置
      const existingIndex = safetySettings.findIndex(s => s.category === category);
      if (existingIndex >= 0) {
        newSettings = [...safetySettings];
        newSettings[existingIndex] = { category, threshold };
      } else {
        newSettings = [...safetySettings, { category, threshold }];
      }
    }
    
    updateSafetySettings(newSettings);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">安全设置</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          配置内容过滤级别，控制 AI 对不同类型内容的处理方式。
        </p>
      </div>

      <div className="space-y-4">
        {HARM_CATEGORIES.map((category) => (
          <div key={category} className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              {HARM_CATEGORY_LABELS[category]}
            </label>
            <select
              value={getThresholdForCategory(category)}
              onChange={(e) => handleThresholdChange(category, e.target.value as HarmBlockThreshold | '')}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 
                bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">使用默认设置</option>
              {HARM_BLOCK_THRESHOLDS.map((threshold) => (
                <option key={threshold} value={threshold}>
                  {THRESHOLD_LABELS[threshold]}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>注意：</strong>降低安全过滤级别可能导致 AI 生成不适当的内容。请谨慎调整。
        </p>
      </div>
    </div>
  );
}


// ============ 数据管理设置 ============
// 需求: 10.1, 10.2, 10.3

function DataManagementSection() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [importMessage, setImportMessage] = useState('');
  const { loadWindows } = useChatWindowStore();
  const { loadSettings } = useSettingsStore();

  // 导出数据
  const handleExport = async () => {
    try {
      const data = await exportAllData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gemini-chat-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  // 导入数据
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      await importData(text);
      // 重新加载数据
      await loadWindows();
      await loadSettings();
      setImportStatus('success');
      setImportMessage('数据导入成功！');
    } catch (error) {
      setImportStatus('error');
      setImportMessage(error instanceof Error ? error.message : '导入失败');
    }

    // 清空文件输入
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    // 3秒后清除状态
    setTimeout(() => {
      setImportStatus('idle');
      setImportMessage('');
    }, 3000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">数据管理</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          导出或导入您的对话数据和设置，方便备份和迁移。
        </p>
      </div>

      {/* 导出 */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">导出数据</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          将所有对话和设置导出为 JSON 文件
        </p>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
        >
          <DownloadIcon className="h-4 w-4" />
          导出数据
        </button>
      </div>

      {/* 导入 */}
      <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
        <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">导入数据</h4>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
          从 JSON 文件恢复对话和设置（将覆盖现有数据）
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleImport}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-4 py-2 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 rounded-lg font-medium transition-colors"
        >
          <UploadIcon className="h-4 w-4" />
          选择文件导入
        </button>

        {/* 导入状态提示 */}
        {importStatus !== 'idle' && (
          <div className={`mt-4 p-3 rounded-lg ${
            importStatus === 'success' 
              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          }`}>
            {importMessage}
          </div>
        )}
      </div>

      {/* 警告 */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <p className="text-sm text-amber-700 dark:text-amber-300">
          <strong>注意：</strong>导入数据会覆盖现有的所有对话和设置，请先导出备份。
        </p>
      </div>
    </div>
  );
}


// ============ 图标组件 ============

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function KeyIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function CpuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function SlidersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function MessageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}


function DatabaseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DownloadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function UploadIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}

export default Settings;
