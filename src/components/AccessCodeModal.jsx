import { Copy, Share2, RefreshCw, X, ExternalLink, Users } from 'lucide-react';
import { useState } from 'react';
import { getLocalIpAddress, REMOTE_STREAM_SERVER_PORT } from '../utils/stream-utils';

/**
 * 访问码弹窗
 * 显示远程监控访问码和分享链接
 */
export default function AccessCodeModal({ isOpen, onClose, accessCode, viewerCount, onGenerateNew, t }) {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('');

  if (!isOpen) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(accessCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyUrl = async () => {
    const ip = await getLocalIpAddress();
    const url = `http://${ip}:${REMOTE_STREAM_SERVER_PORT}/view?code=${accessCode}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    const ip = await getLocalIpAddress();
    const url = `http://${ip}:${REMOTE_STREAM_SERVER_PORT}/view?code=${accessCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'KinSight 远程监控',
          text: `访问码：${accessCode}`,
          url: url
        });
      } catch (e) {
        console.error('Share failed:', e);
      }
    } else {
      setShareUrl(url);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">
            <Share2 size={20} className="modal-icon" />
            {t?.('shareMonitor') || '远程监控'}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="viewer-info">
            <Users size={16} className="viewer-icon" />
            <span className="viewer-count">{viewerCount}</span>
            <span className="viewer-label">{t?.('viewers') || '人正在查看'}</span>
          </div>

          <div className="access-code-section">
            <label className="access-label">{t?.('accessCode') || '访问码'}</label>
            <div className="access-code-display">
              <span className="access-code-text">{accessCode}</span>
              <button className="copy-btn" onClick={handleCopyCode} title={copied ? '已复制' : '复制'}>
                <Copy size={16} />
              </button>
            </div>
          </div>

          <div className="share-actions">
            <button className="share-btn primary" onClick={handleShare}>
              <Share2 size={16} />
              {t?.('share') || '分享'}
            </button>
            <button className="share-btn secondary" onClick={onGenerateNew}>
              <RefreshCw size={16} />
              {t?.('generateNew') || '生成新码'}
            </button>
          </div>

          {shareUrl && (
            <div className="share-url-section">
              <label className="share-url-label">{t?.('shareUrl') || '分享链接'}</label>
              <div className="share-url-display">
                <span className="share-url-text">{shareUrl}</span>
                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="external-link"
                  title="在新窗口打开"
                >
                  <ExternalLink size={16} />
                </a>
              </div>
            </div>
          )}

          <div className="access-note">
            <p>{t?.('accessNote') || '访问码 24 小时内有效。局域网内的设备可以使用此访问码查看监控画面。'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}