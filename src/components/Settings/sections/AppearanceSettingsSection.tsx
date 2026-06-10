/**
 * 外观设置 (新增)
 *
 * Requirements: 3.5, 3.6
 */

import { memo } from 'react';
import { useSettingsStore } from '../../../stores/settings';
import { useTranslation } from '../../../i18n/useTranslation';

export const AppearanceSettingsSection = memo(function AppearanceSettingsSection() {
  const { t } = useTranslation();
  const { theme, setTheme } = useSettingsStore();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-4">{t('settings.appearance')}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          {t('settings.appearanceDesc')}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* 浅色主题 */}
        <button
          onClick={() => setTheme('light')}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'light'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-white shadow-sm border border-slate-100">
              <SunIcon className="w-5 h-5 text-amber-500" />
            </div>
            {theme === 'light' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.lightMode')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.lightModeDesc')}</div>
        </button>

        {/* 深色主题 */}
        <button
          onClick={() => setTheme('dark')}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'dark'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-slate-800 shadow-sm border border-slate-700">
              <MoonIcon className="w-5 h-5 text-slate-200" />
            </div>
            {theme === 'dark' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.darkMode')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.darkModeDesc')}</div>
        </button>

        {/* 雪白主题 (Snow White) */}
        <button
          onClick={() => {
            setTheme('snow-white');
            // 切换回浅色/深色时保留用户的自定义颜色偏好
          }}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'snow-white'
              ? 'border-neutral-900 bg-neutral-50 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`p-2 rounded-lg shadow-sm border ${theme === 'snow-white' ? 'bg-white border-neutral-200' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
              <div className="w-5 h-5 rounded-full bg-neutral-900" />
            </div>
            {theme === 'snow-white' && <div className="w-2.5 h-2.5 rounded-full bg-neutral-900 ring-2 ring-white" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.snowWhite')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.snowWhiteDesc')}</div>
        </button>

        {/* 跟随系统 */}
        <button
          onClick={() => setTheme('system')}
          className={`
            relative p-4 rounded-xl border-2 transition-all duration-200 text-left cursor-pointer
            ${theme === 'system'
              ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-sm'
              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
          `}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shadow-sm border border-slate-200 dark:border-slate-700">
              <ComputerDesktopIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
            </div>
            {theme === 'system' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-white dark:ring-slate-900" />}
          </div>
          <div className="font-medium text-slate-900 dark:text-slate-100">{t('settings.followSystem')}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t('settings.followSystemDesc')}</div>
        </button>

        {/* 自定义颜色 */}
        <CustomColorSelector />
      </div>
    </div>
  );
});

function CustomColorSelector() {
  const { t } = useTranslation();
  const { customThemeColor, setCustomThemeColor } = useSettingsStore();

  return (
    <div className={`
      relative p-4 rounded-xl border-2 transition-all duration-200 text-left
      ${customThemeColor
        ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-sm'
        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'}
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700">
          <div
            className="w-5 h-5 rounded-full border border-slate-200 dark:border-slate-600"
            style={{ backgroundColor: customThemeColor || 'transparent', backgroundImage: !customThemeColor ? 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)' : 'none' }}
          />
        </div>
        {customThemeColor && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setCustomThemeColor(''); // 清除
            }}
            className="text-xs text-slate-500 hover:text-red-500 underline z-10"
          >
            {t('settings.resetColor')}
          </button>
        )}
      </div>

      <div className="font-medium text-slate-900 dark:text-slate-100">
        {customThemeColor ? t('settings.customColor') : t('settings.selectColor')}
      </div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        {customThemeColor ? customThemeColor : t('settings.selectCustomColor')}
      </div>

      <input
        type="color"
        value={customThemeColor || '#22c55e'}
        onChange={(e) => setCustomThemeColor(e.target.value)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-0"
        title={t('settings.selectCustomThemeColor')}
      />
    </div>
  );
}

// Icons
function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

function ComputerDesktopIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}
