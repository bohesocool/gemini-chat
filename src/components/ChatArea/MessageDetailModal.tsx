/**
 * 消息详情弹窗组件
 * 需求: 7.2, 8.4
 * 
 * 显示消息的 Token 使用量、耗时、请求 ID 等详细信息
 */

import { Modal } from '../motion/Modal';
import { TokenUsageDisplay } from '../Debug/TokenUsageDisplay';
import { TimingDisplay } from '../Debug/TimingDisplay';
import { CopyIcon, NoDataIcon } from '../icons';
import type { Message } from '../../types/models';
import { createLogger } from '../../services/logger';

// 模块日志记录器
const logger = createLogger('MessageDetail');

// ============ 类型定义 ============

export interface MessageDetailModalProps {
  /** 消息对象 */
  message: Message | null;
  /** 是否打开 */
  isOpen: boolean;
  /** 关闭回调 */
  onClose: () => void;
}

// ============ 主组件 ============

/**
 * 消息详情弹窗
 * 
 * 需求:
 * - 7.2: 显示消息的 Token 使用量
 * - 8.4: 显示请求耗时信息
 */
export function MessageDetailModal({
  message,
  isOpen,
  onClose,
}: MessageDetailModalProps) {
  if (!message) {
    return null;
  }

  const hasTokenUsage = message.tokenUsage !== undefined;
  const hasTiming = message.duration !== undefined || message.ttfb !== undefined;
  const hasAnyData = hasTokenUsage || hasTiming;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="消息详情"
      size="md"
    >
      <div className="space-y-6">
        {/* 消息基本信息 */}
        <section>
          <SectionTitle>基本信息</SectionTitle>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <InfoItem
              label="消息 ID"
              value={message.id}
              copyable
            />
            <InfoItem
              label="角色"
              value={message.role === 'user' ? '用户' : 'AI'}
            />
            <InfoItem
              label="时间"
              value={formatTimestamp(message.timestamp)}
            />
            <InfoItem
              label="内容长度"
              value={`${message.content.length} 字符`}
            />
          </div>
        </section>

        {/* Token 使用量 - 需求: 7.2 */}
        <section>
          <SectionTitle>Token 使用量</SectionTitle>
          <div className="mt-3">
            <TokenUsageDisplay
              tokenUsage={message.tokenUsage}
              compact={false}
            />
          </div>
        </section>

        {/* 请求耗时 - 需求: 8.4 */}
        <section>
          <SectionTitle>请求耗时</SectionTitle>
          <div className="mt-3">
            {hasTiming ? (
              <TimingDisplay
                duration={message.duration}
                ttfb={message.ttfb}
                compact={false}
              />
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">
                耗时数据不可用
              </p>
            )}
          </div>
        </section>

        {/* 无数据提示 */}
        {!hasAnyData && (
          <div className="text-center py-8">
            <NoDataIcon className="w-12 h-12 mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              该消息没有可用的详细数据
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ============ 子组件 ============

/**
 * 区块标题
 */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-medium text-neutral-700 dark:text-neutral-300 border-b border-neutral-200 dark:border-neutral-700 pb-2">
      {children}
    </h3>
  );
}

/**
 * 信息项
 */
interface InfoItemProps {
  label: string;
  value: string;
  copyable?: boolean;
}

function InfoItem({ label, value, copyable = false }: InfoItemProps) {
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch (err) {
      logger.error('复制失败:', err);
    }
  };

  return (
    <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-3">
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">
        {label}
      </p>
      <div className="flex items-center gap-2">
        <p className="text-sm text-neutral-700 dark:text-neutral-300 font-mono truncate flex-1">
          {value}
        </p>
        {copyable && (
          <button
            onClick={handleCopy}
            className="p-1 rounded hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 transition-colors"
            title="复制"
          >
            <CopyIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============ 工具函数 ============

/**
 * 格式化时间戳
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export default MessageDetailModal;
