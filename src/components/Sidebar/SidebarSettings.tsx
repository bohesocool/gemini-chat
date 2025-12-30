/**
 * 侧边栏设置组件
 * 实现可折叠的设置分组，包含 API 配置、模型选择、生成参数、系统指令分组
 * 需求: 4.3, 4.4, 4.5, 1.3（登出功能）
 */

import React, { useState, useCallback } from 'react';
import { useSettingsStore } from '../../stores/settings';
import { useChatWindowStore } from '../../stores/chatWindow';
import { useModelStore } from '../../stores/model';
import { useAuthStore } from '../../stores/auth';
import { getEnabledModels } from '../../services/model';
import { durations, easings, touchTargets } from '../../design/tokens';
import { ThinkingLevelSelector } from '../ModelParams/ThinkingLevelSelector';
import { ThinkingBudgetSlider } from '../ModelParams/ThinkingBudgetSlider';
import { ImageConfigPanel } from '../ModelParams/ImageConfigPanel';
import type { ThinkingLevel, ImageGenerationConfig, ModelAdvancedConfig } from '../../types/models';

// ============ 类型定义 ============

/** 设置分组 ID */
export type SettingsGroupId = 'api' | 'model' | 'generation' | 'system' | 'advanced';

/** SidebarSettings 组件属性 */
export interface SidebarSettingsProps {
  /** 是否展开（用于响应式布局） */
  isExpanded?: boolean;
}

// ============ 主组件 ============

/**
 * 侧边栏设置组件
 * 使用可折叠分组展示各类设置，修改后实时保存
 */
export function SidebarSettings({ isExpanded = true }: SidebarSettingsProps) {
  // 展开状态管理
  const [expandedGroups, setExpandedGroups] = useState<Set<SettingsGroupId>>(
    new Set(['model', 'advanced'])
  );

  const toggleGroup = useCallback((groupId: SettingsGroupId) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }, []);

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
      <div className="p-3 space-y-2">
        {/* API 配置分组 */}
        <SettingsGroup
          id="api"
          title="API 配置"
          icon={<KeyIcon />}
          isExpanded={expandedGroups.has('api')}
          onToggle={() => toggleGroup('api')}
        >
          <ApiConfigGroup />
        </SettingsGroup>

        {/* 模型选择分组 */}
        <SettingsGroup
          id="model"
          title="模型选择"
          icon={<CpuIcon />}
          isExpanded={expandedGroups.has('model')}
          onToggle={() => toggleGroup('model')}
        >
          <ModelSelectGroup />
        </SettingsGroup>

        {/* 高级参数分组（思考程度、图片配置等） */}
        <SettingsGroup
          id="advanced"
          title="高级参数"
          icon={<SlidersIcon />}
          isExpanded={expandedGroups.has('advanced')}
          onToggle={() => toggleGroup('advanced')}
        >
          <AdvancedConfigGroup />
        </SettingsGroup>

        {/* 生成参数分组 */}
        <SettingsGroup
          id="generation"
          title="生成参数"
          icon={<TuneIcon />}
          isExpanded={expandedGroups.has('generation')}
          onToggle={() => toggleGroup('generation')}
        >
          <GenerationConfigGroup />
        </SettingsGroup>

        {/* 系统指令分组 */}
        <SettingsGroup
          id="system"
          title="系统指令"
          icon={<MessageIcon />}
          isExpanded={expandedGroups.has('system')}
          onToggle={() => toggleGroup('system')}
        >
          <SystemInstructionGroup />
        </SettingsGroup>

        {/* 登出按钮 - 需求: 1.3 */}
        <LogoutButton />
      </div>
    </div>
  );
}

// ============ 设置分组容器组件 ============

interface SettingsGroupProps {
  id: SettingsGroupId;
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

/**
 * 可折叠的设置分组容器
 */
function SettingsGroup({ title, icon, isExpanded, onToggle, children }: SettingsGroupProps) {
  return (
    <div className="bg-white dark:bg-neutral-800 rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden">
      {/* 分组标题 */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2.5 
          hover:bg-neutral-50 dark:hover:bg-neutral-700/50 
          transition-colors touch-manipulation"
        style={{ 
          minHeight: touchTargets.minimum,
          transitionDuration: durations.fast,
        }}
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-2">
          <span className="h-4 w-4 text-neutral-500 dark:text-neutral-400">
            {icon}
          </span>
          <span className="text-sm font-medium text-neutral-700 dark:text-neutral-200">
            {title}
          </span>
        </div>
        <ChevronIcon 
          className={`h-4 w-4 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          style={{ 
            transitionDuration: durations.fast,
            transitionTimingFunction: easings.easeOut,
          }}
        />
      </button>

      {/* 分组内容 */}
      <div 
        className={`
          overflow-hidden transition-all
          ${isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}
        `}
        style={{ 
          transitionDuration: durations.normal,
          transitionTimingFunction: easings.easeOut,
        }}
      >
        <div className="px-3 pb-3 pt-1 border-t border-neutral-100 dark:border-neutral-700">
          {children}
        </div>
      </div>
    </div>
  );
}

// ============ API 配置分组 ============

function ApiConfigGroup() {
  const { apiEndpoint, apiKey, setApiEndpoint, setApiKey, testConnection, connectionStatus } = useSettingsStore();

  return (
    <div className="space-y-3">
      {/* API 端点 */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          API 端点
        </label>
        <input
          type="url"
          value={apiEndpoint}
          onChange={(e) => setApiEndpoint(e.target.value)}
          placeholder="https://generativelanguage.googleapis.com/v1beta"
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 
            bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
            focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* API 密钥 */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          API 密钥
        </label>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="输入 API 密钥"
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 
            bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
            focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>

      {/* 测试连接按钮 - 需求: 1.5 允许端点为空时测试（使用官方地址） */}
      <button
        onClick={() => testConnection()}
        disabled={connectionStatus === 'testing' || !apiKey}
        className="w-full px-3 py-1.5 text-xs font-medium rounded-md
          bg-primary-500 hover:bg-primary-600 disabled:bg-neutral-300 dark:disabled:bg-neutral-600
          text-white transition-colors disabled:cursor-not-allowed"
      >
        {connectionStatus === 'testing' ? '测试中...' : 
         connectionStatus === 'success' ? '✓ 连接成功' :
         connectionStatus === 'error' ? '✗ 连接失败' : '测试连接'}
      </button>
    </div>
  );
}

// ============ 模型选择分组 ============

function ModelSelectGroup() {
  const { currentModel, setCurrentModel } = useSettingsStore();
  const { models } = useModelStore();
  
  // 需求: 4.2 只显示启用的模型
  const enabledModels = getEnabledModels(models);

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
        当前模型
      </label>
      <select
        value={currentModel}
        onChange={(e) => setCurrentModel(e.target.value)}
        className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 
          bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
      >
        {enabledModels.map((model) => (
          <option key={model.id} value={model.id}>
            {model.id}
          </option>
        ))}
      </select>
      
      {/* 当前模型信息 */}
      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
        {currentModel}
      </div>
    </div>
  );
}

// ============ 高级参数分组（思考程度、图片配置） ============

function AdvancedConfigGroup() {
  const { currentModel } = useSettingsStore();
  const { activeWindowId, windows, updateAdvancedConfig } = useChatWindowStore();
  const { getModelById } = useModelStore();

  // 获取当前窗口
  const currentWindow = windows.find(w => w.id === activeWindowId);
  const advancedConfig = currentWindow?.config.advancedConfig;

  // 获取模型能力
  const modelConfig = getModelById(currentModel);
  const capabilities = modelConfig?.capabilities;
  const supportsImageGeneration = capabilities?.supportsImageGeneration ?? false;
  const supportsImageSize = capabilities?.supportsImageSize !== false;  // 需求: 3.1, 3.4
  
  // 获取思考配置类型 - Requirements: 2.1, 2.2, 3.1
  const thinkingConfigType = capabilities?.thinkingConfigType || 'none';
  const thinkingBudgetConfig = capabilities?.thinkingBudgetConfig;
  
  // 获取思维链支持状态 - Requirements: 4.1, 5.2, 5.3
  const supportsThoughtSummary = capabilities?.supportsThoughtSummary === true;

  // 获取当前思考预算（使用模型默认值）
  const currentThinkingBudget = advancedConfig?.thinkingBudget ?? 
    (thinkingBudgetConfig?.defaultValue ?? -1);

  // 处理思考程度变更
  const handleThinkingLevelChange = useCallback((level: ThinkingLevel) => {
    if (activeWindowId) {
      updateAdvancedConfig(activeWindowId, { thinkingLevel: level });
    }
  }, [activeWindowId, updateAdvancedConfig]);

  // 处理思考预算变更 - Requirements: 3.1, 3.2, 3.3
  const handleThinkingBudgetChange = useCallback((budget: number) => {
    if (activeWindowId) {
      updateAdvancedConfig(activeWindowId, { thinkingBudget: budget });
    }
  }, [activeWindowId, updateAdvancedConfig]);

  // 处理高级配置变更
  const handleAdvancedConfigChange = useCallback((updates: Partial<ModelAdvancedConfig>) => {
    if (activeWindowId) {
      updateAdvancedConfig(activeWindowId, updates);
    }
  }, [activeWindowId, updateAdvancedConfig]);

  // 处理图片配置变更
  const handleImageConfigChange = useCallback((config: Partial<ImageGenerationConfig>) => {
    if (activeWindowId && advancedConfig?.imageConfig) {
      updateAdvancedConfig(activeWindowId, {
        imageConfig: { ...advancedConfig.imageConfig, ...config },
      });
    } else if (activeWindowId) {
      updateAdvancedConfig(activeWindowId, {
        imageConfig: { aspectRatio: '1:1', imageSize: '1K', ...config },
      });
    }
  }, [activeWindowId, advancedConfig, updateAdvancedConfig]);

  // 如果没有活动窗口或模型不支持任何高级参数
  const hasAdvancedParams = thinkingConfigType !== 'none' || supportsImageGeneration || supportsThoughtSummary;
  if (!activeWindowId || !hasAdvancedParams) {
    return (
      <div className="text-xs text-neutral-500 dark:text-neutral-400 text-center py-2">
        {!activeWindowId ? '请先选择一个对话' : '当前模型不支持高级参数'}
      </div>
    );
  }

  const includeThoughts = advancedConfig?.includeThoughts ?? false;

  return (
    <div className="space-y-4">
      {/* 思考等级选择器 - Requirements: 2.1 */}
      {thinkingConfigType === 'level' && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            思考程度
          </label>
          <ThinkingLevelSelector
            value={advancedConfig?.thinkingLevel ?? 'high'}
            onChange={handleThinkingLevelChange}
            variant="compact"
            modelId={currentModel}
          />
        </div>
      )}

      {/* 思考预算滑块 - Requirements: 3.1, 3.2, 3.3 */}
      {thinkingConfigType === 'budget' && thinkingBudgetConfig && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            思考预算
          </label>
          <ThinkingBudgetSlider
            value={currentThinkingBudget}
            config={thinkingBudgetConfig}
            onChange={handleThinkingBudgetChange}
            variant="compact"
          />
        </div>
      )}

      {/* 思维链显示开关 - Requirements: 4.1, 5.2, 5.3 */}
      {supportsThoughtSummary && (
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400">
              显示思维链
            </label>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              显示模型推理过程
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={includeThoughts}
            onClick={() => handleAdvancedConfigChange({ includeThoughts: !includeThoughts })}
            className={`
              relative inline-flex h-5 w-9 items-center rounded-full transition-colors
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              ${includeThoughts 
                ? 'bg-primary-500' 
                : 'bg-neutral-300 dark:bg-neutral-600'
              }
            `}
          >
            <span
              className={`
                inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform
                ${includeThoughts ? 'translate-x-5' : 'translate-x-0.5'}
              `}
            />
          </button>
        </div>
      )}

      {/* 图片配置面板 */}
      {supportsImageGeneration && (
        <div>
          <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-2">
            图片参数
          </label>
          <ImageConfigPanel
            config={advancedConfig?.imageConfig ?? { aspectRatio: '1:1', imageSize: '1K' }}
            onChange={handleImageConfigChange}
            variant="compact"
            supportsImageSize={supportsImageSize}
          />
        </div>
      )}
    </div>
  );
}

// ============ 生成参数分组 ============

function GenerationConfigGroup() {
  const { generationConfig, updateGenerationConfig } = useSettingsStore();

  return (
    <div className="space-y-3">
      {/* Temperature */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Temperature
          </label>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
          className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
      </div>

      {/* Top P */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
            Top P
          </label>
          <span className="text-xs text-neutral-500 dark:text-neutral-400">
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
          className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
        />
      </div>

      {/* Max Output Tokens */}
      <div>
        <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
          最大输出 Token
        </label>
        <input
          type="number"
          min="1"
          max="65536"
          value={generationConfig.maxOutputTokens ?? ''}
          onChange={(e) => updateGenerationConfig({ 
            maxOutputTokens: e.target.value ? parseInt(e.target.value) : undefined 
          })}
          placeholder="默认"
          className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 
            bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
            focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
        />
      </div>
    </div>
  );
}

// ============ 系统指令分组 ============

function SystemInstructionGroup() {
  const { systemInstruction, updateSystemInstruction } = useSettingsStore();

  return (
    <div>
      <label className="block text-xs font-medium text-neutral-600 dark:text-neutral-400 mb-1">
        全局系统指令
      </label>
      <textarea
        value={systemInstruction}
        onChange={(e) => updateSystemInstruction(e.target.value)}
        placeholder="设置 AI 的角色和行为方式..."
        rows={3}
        className="w-full px-2.5 py-1.5 text-sm rounded-md border border-neutral-300 dark:border-neutral-600 
          bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100
          focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 resize-none"
      />
      <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
        应用于所有新对话
      </p>
    </div>
  );
}

// ============ 图标组件 ============

function KeyIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
    </svg>
  );
}

function CpuIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
    </svg>
  );
}

function SlidersIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
    </svg>
  );
}

function TuneIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  );
}

function ChevronIcon({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg className={className} style={style} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

// ============ 登出按钮组件 ============

/**
 * 登出按钮组件
 * 需求: 1.3 - 在侧边栏设置中提供登出功能
 */
function LogoutButton() {
  const { logout } = useAuthStore();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <div className="mt-4 pt-4 border-t border-neutral-200 dark:border-neutral-700">
      {showConfirm ? (
        <div className="space-y-2">
          <p className="text-xs text-neutral-600 dark:text-neutral-400 text-center">
            确定要登出吗？
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleLogout}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md
                bg-red-500 hover:bg-red-600 text-white transition-colors"
            >
              确定
            </button>
            <button
              onClick={() => setShowConfirm(false)}
              className="flex-1 px-3 py-1.5 text-xs font-medium rounded-md
                bg-neutral-200 dark:bg-neutral-600 hover:bg-neutral-300 dark:hover:bg-neutral-500
                text-neutral-700 dark:text-neutral-200 transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-md
            bg-neutral-100 dark:bg-neutral-700 hover:bg-neutral-200 dark:hover:bg-neutral-600
            text-neutral-700 dark:text-neutral-200 transition-colors"
        >
          <LogoutIcon />
          <span>登出</span>
        </button>
      )}
    </div>
  );
}

export default SidebarSettings;
