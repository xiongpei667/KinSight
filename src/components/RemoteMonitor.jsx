import { Video, VideoOff, Share2, Wifi, WifiOff } from 'lucide-react';
import useRemoteStream from '../hooks/useRemoteStream';
import AccessCodeModal from './AccessCodeModal';
import { useState } from 'react';

/**
 * 远程监控控制组件
 * 提供开启/关闭远程监控、生成访问码等功能
 */
export default function RemoteMonitor({ videoRef, canvasRef, t }) {
  const [showAccessCode, setShowAccessCode] = useState(false);
  const {
    isStreaming,
    viewerCount,
    accessCode,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    generateNewAccessCode
  } = useRemoteStream({
    videoRef,
    canvasRef,
    onViewerConnected: (count) => {
      console.log('Viewer connected, total:', count);
    },
    onViewerDisconnected: (count) => {
      console.log('Viewer disconnected, total:', count);
    }
  });

  const handleToggleStream = () => {
    if (isStreaming) {
      stopStreaming();
    } else {
      startStreaming();
    }
  };

  const handleShowAccessCode = () => {
    if (!accessCode) {
      connect();
      // 等待连接后自动生成访问码
      setTimeout(() => {
        if (!accessCode) {
          generateNewAccessCode();
        }
      }, 500);
    }
    setShowAccessCode(true);
  };

  const handleGenerateNew = () => {
    generateNewAccessCode();
  };

  return (
    <div className="remote-monitor">
      <div className="monitor-header">
        <h3 className="monitor-title">
          <Video size={18} />
          {t?.('remoteMonitor') || '远程监控'}
        </h3>
        <div className="monitor-status">
          {isStreaming ? (
            <>
              <Wifi size={14} className="status-icon live" />
              <span className="status-text live">{t?.('live') || '直播中'}</span>
            </>
          ) : (
            <>
              <WifiOff size={14} className="status-icon offline" />
              <span className="status-text offline">{t?.('offline') || '未开启'}</span>
            </>
          )}
        </div>
      </div>

      <div className="monitor-controls">
        <button
          className={`monitor-btn ${isStreaming ? 'active' : 'primary'}`}
          onClick={handleToggleStream}
          disabled={!accessCode && !isStreaming}
        >
          {isStreaming ? <VideoOff size={16} /> : <Video size={16} />}
          {isStreaming ? t?.('stopStream') || '停止直播' : t?.('startStream') || '开始直播'}
        </button>

        <button
          className="monitor-btn secondary"
          onClick={handleShowAccessCode}
        >
          <Share2 size={16} />
          {t?.('shareAccess') || '分享访问'}
        </button>
      </div>

      {showAccessCode && (
        <AccessCodeModal
          isOpen={showAccessCode}
          onClose={() => setShowAccessCode(false)}
          accessCode={accessCode}
          viewerCount={viewerCount}
          onGenerateNew={handleGenerateNew}
          t={t}
        />
      )}
    </div>
  );
}