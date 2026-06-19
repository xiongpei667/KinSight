import { useEffect, useState, useRef } from 'react';
import { Lock, VideoOff, Wifi, WifiOff } from 'lucide-react';
import { REMOTE_STREAM_SERVER_PORT } from './utils/constants';
import { io } from 'socket.io-client';
import './App.css';

/**
 * 远程监控查看端
 * 使用访问码查看实时监控画面
 */
export default function Viewer() {
  const [accessCode, setAccessCode] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState('');
  const socketRef = useRef(null);
  const imgRef = useRef(null);

  useEffect(() => {
    // 从 URL 获取访问码
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    if (code) {
      setAccessCode(code);
      connectToStream(code);
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const connectToStream = (code) => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(`http://localhost:${REMOTE_STREAM_SERVER_PORT}`);

    socketRef.current.on('connect', () => {
      setIsConnected(true);
      setError('');
      socketRef.current.emit('view-stream', code);
    });

    socketRef.current.on('video-frame', (frameData) => {
      if (imgRef.current) {
        imgRef.current.src = frameData;
      }
      setIsStreaming(true);
    });

    socketRef.current.on('stream-status', (status) => {
      setIsStreaming(status);
    });

    socketRef.current.on('stream-ended', () => {
      setIsStreaming(false);
      setError('直播已结束');
    });

    socketRef.current.on('error', (err) => {
      setError(err || '连接失败');
      setIsConnected(false);
    });

    socketRef.current.on('disconnect', () => {
      setIsConnected(false);
      setIsStreaming(false);
    });
  };

  const handleManualConnect = () => {
    if (!accessCode) {
      setError('请输入访问码');
      return;
    }
    setError('');
    connectToStream(accessCode);
  };

  return (
    <div className="viewer-container">
      <div className="viewer-header">
        <h1 className="viewer-title">
          <VideoOff size={24} />
          KinSight 远程监控
        </h1>
        <div className="viewer-status">
          {isConnected ? (
            <>
              <Wifi size={16} className="status-icon live" />
              <span className="status-text live">已连接</span>
            </>
          ) : (
            <>
              <WifiOff size={16} className="status-icon offline" />
              <span className="status-text offline">未连接</span>
            </>
          )}
        </div>
      </div>

      <div className="viewer-content">
        {error && (
          <div className="viewer-error">
            <Lock size={20} />
            {error}
          </div>
        )}

        {!accessCode && (
          <div className="viewer-login">
            <label htmlFor="access-code" className="login-label">输入访问码</label>
            <input
              id="access-code"
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="例如：123456"
              className="login-input"
              maxLength={6}
            />
            <button onClick={handleManualConnect} className="login-btn">
              连接监控
            </button>
          </div>
        )}

        {isConnected && (
          <div className="viewer-display">
            {isStreaming ? (
              <img
                ref={imgRef}
                alt="监控画面"
                className="viewer-image"
              />
            ) : (
              <div className="viewer-placeholder">
                <VideoOff size={48} />
                <p>等待直播开始...</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}