/**
 * 模型列表组件
 * 需求: 1.4, 2.1
 * 
 * 功能：
 * - 显示所有可用模型
 * - 支持搜索/筛选
 * - 显示模型来源（预设/自定义/远程）
 */

import { useState, useMemo } from 'react';
import type { ModelConfig } from '../types/models';
import { sortModels } from '../services/model';
import { useTranslation } from '@/i18n';

// ============ 类型定义 ============

interface ModelListProps {
  /** 模型列表 */
  models: ModelConfig[];
  /** 当前选中的模型 ID */
  selectedModelId?: string;
  /** 选择模型回调 */
  onSelectModel?: (model: ModelConfig) => void;
  /** 编辑模型回调 */
  onEditModel?: (model: ModelConfig) => void;
  /** 删除模型回调 */
  onDeleteModel?: (modelId: string) => void;
  /** 切换模型启用状态回调 - 需求: 4.1, 4.5 */
  onToggleEnabled?: (modelId: string, enabled: boolean) => void;
}

// ============ 辅助函数 ============

/**
 * 获取模型来源标签 - 需求: 3.4, 3.6
 * 为预设模型和自定义模型提供不同的视觉标识
 */
function getModelSourceLabel(model: ModelConfig, t: (key: string) => string): { text: string; color: string; icon: 'preset' | 'custom' | 'openai' } {
  if (model.isCustom) {
    return { 
      text: t('modelList.custom'), 
      color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
      icon: 'custom'
    };
  }
  if (model.provider === 'openai') {
    return { 
      text: 'OpenAI', 
      color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
      icon: 'openai'
    };
  }
  return { 
    text: t('modelList.preset'), 
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    icon: 'preset'
  };
}

/**
 * 获取模型能力标签
 */
function getCapabilityTags(model: ModelConfig, t: (key: string) => string): string[] {
  const tags: string[] = [];
  if (model.capabilities?.supportsThinking) {
    tags.push(t('modelList.thinking'));
  }
  if (model.capabilities?.supportsImageGeneration) {
    tags.push(t('modelList.imageGeneration'));
  }
  if (model.redirectTo) {
    tags.push(t('modelList.redirect'));
  }
  return tags;
}

// ============ 主组件 ============

export function ModelList({
  models,
  selectedModelId,
  onSelectModel,
  onEditModel,
  onDeleteModel,
  onToggleEnabled,
}: ModelListProps) {
  const { t } = useTranslation();
  
  // 搜索关键词
  const [searchQuery, setSearchQuery] = useState('');
  // 筛选条件
  const [filterSource, setFilterSource] = useState<'all' | 'preset' | 'custom'>('all');

  // 过滤并排序后的模型列表 - 需求: 4.6
  const filteredModels = useMemo(() => {
    const filtered = models.filter(model => {
      // 搜索过滤
      const query = searchQuery.toLowerCase().trim();
      if (query) {
        const matchesId = model.id.toLowerCase().includes(query);
        const matchesName = model.name.toLowerCase().includes(query);
        // 对于预设模型，描述是翻译键，需要翻译后再搜索
        const translatedDesc = model.description?.startsWith('models.') 
          ? t(model.description) 
          : model.description;
        const matchesDesc = translatedDesc?.toLowerCase().includes(query);
        if (!matchesId && !matchesName && !matchesDesc) {
          return false;
        }
      }

      // 来源过滤
      if (filterSource === 'preset' && model.isCustom) {
        return false;
      }
      if (filterSource === 'custom' && !model.isCustom) {
        return false;
      }

      return true;
    });
    
    // 排序：启用的模型在前，禁用的在后
    return sortModels(filtered);
  }, [models, searchQuery, filterSource, t]);

  return (
    <div className="space-y-4">
      {/* 搜索和筛选栏 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 搜索框 */}
        <div className="flex-1 relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('modelList.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
              bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              text-sm"
          />
        </div>

        {/* 筛选下拉 */}
        <select
          value={filterSource}
          onChange={(e) => setFilterSource(e.target.value as 'all' | 'preset' | 'custom')}
          className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 
            bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
            text-sm"
        >
          <option value="all">{t('modelList.allSources')}</option>
          <option value="preset">{t('modelList.presetModels')}</option>
          <option value="custom">{t('modelList.customModels')}</option>
        </select>
      </div>

      {/* 模型数量统计 */}
      <div className="text-sm text-slate-500 dark:text-slate-400">
        {t('modelList.totalModels', { count: filteredModels.length })}
        {searchQuery && ` (${t('modelList.search')}: "${searchQuery}")`}
      </div>

      {/* 模型列表 */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredModels.length === 0 ? (
          <div className="text-center py-8 text-slate-500 dark:text-slate-400">
            {searchQuery ? t('modelList.noMatchingModels') : t('modelList.noModels')}
          </div>
        ) : (
          filteredModels.map((model) => (
            <ModelListItem
              key={model.id}
              model={model}
              isSelected={model.id === selectedModelId}
              onSelect={onSelectModel}
              onEdit={onEditModel}
              onDelete={onDeleteModel}
              onToggleEnabled={onToggleEnabled}
              t={t}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ============ 模型列表项组件 ============

interface ModelListItemProps {
  model: ModelConfig;
  isSelected: boolean;
  onSelect?: (model: ModelConfig) => void;
  onEdit?: (model: ModelConfig) => void;
  onDelete?: (modelId: string) => void;
  /** 切换模型启用状态回调 - 需求: 4.1, 4.5 */
  onToggleEnabled?: (modelId: string, enabled: boolean) => void;
  /** 翻译函数 */
  t: (key: string, params?: Record<string, unknown>) => string;
}

function ModelListItem({
  model,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onToggleEnabled,
  t,
}: ModelListItemProps) {
  const sourceLabel = getModelSourceLabel(model, t);
  const capabilityTags = getCapabilityTags(model, t);
  const isEnabled = model.enabled !== false;
  
  // 获取翻译后的描述
  const translatedDescription = model.description?.startsWith('models.') 
    ? t(model.description) 
    : model.description;

  return (
    <div
      className={`
        p-3 rounded-lg border transition-colors cursor-pointer
        ${isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
        }
        ${!isEnabled ? 'opacity-60' : ''}
      `}
      onClick={() => onSelect?.(model)}
    >
      <div className="flex items-start justify-between gap-3">
        {/* 模型信息 - 需求: 2.1, 2.2, 3.4, 3.6 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* 模型来源图标 - 需求: 3.4, 3.6 */}
            {sourceLabel.icon === 'custom' ? (
              <CustomModelIcon className="h-4 w-4 text-purple-500 dark:text-purple-400 flex-shrink-0" />
            ) : sourceLabel.icon === 'preset' ? (
              <PresetModelIcon className="h-4 w-4 text-blue-500 dark:text-blue-400 flex-shrink-0" />
            ) : null}
            {/* 主显示名称使用 model.id - 需求: 2.1 */}
            <span className="font-medium text-slate-900 dark:text-slate-100 truncate font-mono">
              {model.id}
            </span>
            {/* 来源标签 - 需求: 3.4, 3.6 */}
            <span className={`px-2 py-0.5 text-xs rounded-full ${sourceLabel.color}`}>
              {sourceLabel.text}
            </span>
          </div>
          
          {/* 描述信息 - 需求: 2.2 */}
          {translatedDescription && (
            <div className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
              {translatedDescription}
            </div>
          )}

          {/* 能力标签 */}
          {capabilityTags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {capabilityTags.map((tag) => (
                <span
                  key={tag}
                  className="px-1.5 py-0.5 text-xs bg-slate-100 dark:bg-slate-600 
                    text-slate-600 dark:text-slate-300 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* 重定向信息 */}
          {model.redirectTo && (
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-1 flex items-center gap-1">
              <ArrowRightIcon className="h-3 w-3" />
              {t('modelList.redirectTo')}: {model.redirectTo}
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 启用/禁用开关 - 需求: 4.1, 4.5 */}
          {onToggleEnabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleEnabled(model.id, !isEnabled);
              }}
              className={`
                relative inline-flex h-5 w-9 items-center rounded-full transition-colors
                ${isEnabled 
                  ? 'bg-green-500' 
                  : 'bg-slate-300 dark:bg-slate-600'}
              `}
              role="switch"
              aria-checked={isEnabled}
              aria-label={isEnabled ? t('modelList.disableModel') : t('modelList.enableModel')}
              title={isEnabled ? t('modelList.clickToDisable') : t('modelList.clickToEnable')}
            >
              <span
                className={`
                  inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform shadow-sm
                  ${isEnabled ? 'translate-x-5' : 'translate-x-1'}
                `}
              />
            </button>
          )}
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(model);
              }}
              className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
              title={t('modelList.editModel')}
            >
              <EditIcon className="h-4 w-4 text-slate-500 dark:text-slate-400" />
            </button>
          )}
          {onDelete && model.isCustom && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(model.id);
              }}
              className="p-1.5 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              title={t('modelList.deleteModel')}
            >
              <TrashIcon className="h-4 w-4 text-red-500 dark:text-red-400" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============ 图标组件 ============

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}

function EditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}

/**
 * 预设模型图标 - 需求: 3.4, 3.6
 * 使用盾牌图标表示系统内置的预设模型
 */
function PresetModelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

/**
 * 自定义模型图标 - 需求: 3.4, 3.6
 * 使用用户图标表示从 API 获取的自定义模型
 */
function CustomModelIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
        d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default ModelList;
