import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { REMOTE_STREAM_SERVER_PORT } from '../utils/constants';

export default function useRemoteStream({ videoRef, canvasRef, onViewerConnected, onViewerDisconnected }) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [accessCode, setAccessCode] = useState('');
  const socketRef = useRef(null);
  const streamIntervalRef = useRef(null);

  // 连接到 WebSocket 服务器
  const connect = useCallback(() => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(`http://localhost:${REMOTE_STREAM_SERVER_PORT}`);

    socketRef.current.on('connect', () => {
      console.log('Connected to stream server');
    });

    socketRef.current.on('access-code', (code) => {
      setAccessCode(code);
    });

    socketRef.current.on('viewer-joined', (count) => {
      setViewerCount(count);
      onViewerConnected?.(count);
    });

    socketRef.current.on('viewer-left', (count) => {
      setViewerCount(count);
      onViewerDisconnected?.(count);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from stream server');
      stopStreaming();
    });

    socketRef.current.on('error', (error) => {
      console.error('Stream server error:', error);
    });
  }, [onViewerConnected, onViewerDisconnected]);

  // 断开连接
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    stopStreaming();
    setIsStreaming(false);
    setAccessCode('');
    setViewerCount(0);
  }, []);

  // 开始流式传输
  const startStreaming = useCallback(() => {
    if (!socketRef.current?.connected) {
      console.warn('Not connected to stream server');
      return;
    }

    setIsStreaming(true);
    socketRef.current.emit('start-stream');

    // 每 100ms 发送一帧
    streamIntervalRef.current = setInterval(() => {
      const canvas = canvasRef.current;
      if (canvas && socketRef.current?.connected) {
        const frame = canvas.toDataURL('image/jpeg', 0.8);
        socketRef.current.emit('video-frame', frame);
      }
    }, 100);
  }, [canvasRef]);

  // 停止流式传输
  const stopStreaming = useCallback(() => {
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
      streamIntervalRef.current = null;
    }
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop-stream');
    }
    setIsStreaming(false);
  }, []);

  // 生成新的访问码
  const generateNewAccessCode = useCallback(() => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('generate-access-code');
    }
  }, []);

  // 清理
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isStreaming,
    viewerCount,
    accessCode,
    connect,
    disconnect,
    startStreaming,
    stopStreaming,
    generateNewAccessCode
  };
}