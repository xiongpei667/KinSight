import { useState } from 'react';
import { Siren } from 'lucide-react';

/**
 * 一键求助按钮：始终可见，面向独居老人/女性等弱势场景。
 * 点击后由 App 的 onSos 处理（确认 → 抓拍 → 推送 webhook → 本地通知/语音）。
 * 渲染两处：顶栏内联按钮 + 移动端浮动按钮。
 */
export default function SosButton({ onSos, t, variant = 'inline', disabled = false }) {
  const [sending, setSending] = useState(false);

  async function handleClick() {
    if (disabled || sending) return;
    setSending(true);
    try {
      await onSos?.();
    } finally {
      // 短暂保持按下态，给出反馈
      setTimeout(() => setSending(false), 800);
    }
  }

  if (variant === 'fab') {
    return (
      <button
        className="sos-fab"
        onClick={handleClick}
        disabled={disabled || sending}
        aria-label={t('sos')}
        title={t('sos')}
      >
        <Siren size={26} />
        <span>{sending ? '…' : t('sos')}</span>
      </button>
    );
  }

  return (
    <button
      className="sos-btn"
      onClick={handleClick}
      disabled={disabled || sending}
      title={t('sos')}
    >
      <Siren size={16} />
      <span>{sending ? t('sosSent') : t('sos')}</span>
    </button>
  );
}
