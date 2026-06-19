# KinSight 人脸识别优化与远程监控实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 提高人脸识别准确性和灵敏度，实现智能头像抓取、多重状态提醒系统，以及局域网内远程监控功能

**Architecture:**
1. 优化人脸识别参数（扫描频率、检测精度、匹配阈值）
2. 实现智能头像抓取（边距扩展、居中、高质量）
3. 实现多重状态系统（到达/在场/持续提醒/离开）
4. 搭建 WebSocket 服务器用于远程视频流传输
5. 实现访问码系统和查看端界面

**Tech Stack:** React, face-api.js, Socket.IO, Node.js, MJPEG

---

## 文件结构概览

```
KinSight/
├── src/
│   ├── components/
│   │   ├── RemoteMonitor.jsx        [新建] 远程监控控制组件
│   │   ├── AccessCodeModal.jsx      [新建] 访问码生成/显示弹窗
│   │   └── PresenceIndicator.jsx    [新建] 在场状态指示器
│   ├── hooks/
│   │   ├── useSmartCapture.js       [新建] 智能头像抓取
│   │   └── useRemoteStream.js       [新建] 远程流管理
│   ├── server/
│   │   └── index.js                 [新建] WebSocket 服务器
│   ├── utils/
│   │   ├── constants.js             [修改] 添加新常量
│   │   └── stream-utils.js          [新建] 流处理工具
│   ├── hooks/
│   │   └── useFaceRecognition.js    [修改] 优化识别逻辑
│   └── App.jsx                      [修改] 集成新功能
├── package.json                     [修改] 添加依赖
└── docs/superpowers/plans/...       [此文件]
```

---

## 任务分解

### Task 1: 更新 package.json 依赖

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 添加 socket.io 和 socket.io-client 依赖**

```json
{
  "dependencies": {
    "socket.io": "^4.7.2",
    "socket.io-client": "^4.7.2"
  }
}
```

- [ ] **Step 2: 运行 npm install 安装依赖**

Run: `npm install`
Expected: 依赖安装成功，无错误

- [ ] **Step 3: 提交更改**

```bash
git add package.json package-lock.json
git commit -m "chore: add socket.io dependencies for remote monitoring"
```

---

### Task 2: 更新 constants.js 添加新常量

**Files:**
- Modify: `src/utils/constants.js`

- [ ] **Step 1: 在文件顶部添加优化后的常量**

```javascript
// 扫描优化
export const OPTIMIZED_SCAN_INTERVAL_MS = 1000;
export const OPTIMIZED_MATCH_THRESHOLD = 0.45;
export const OPTIMIZED_LEARN_THRESHOLD = 0.52;
export const FACE_DETECTION_INPUT_SIZE = 416;
export const FACE_DETECTION_SCORE_THRESHOLD = 0.4;

// 头像抓取
export const FACE_CAPTURE_PADDING_RATIO = 0.2; // 20% 边距
export const FACE_CAPTURE_QUALITY = 0.9;

// 持续提醒
export const PRESENCE_REMINDER_INTERVAL_MS = 5000; // 5秒
export const PRESENCE_REMINDER_TYPE = 'visual';

// 远程监控
export const REMOTE_STREAM_SERVER_PORT = 3001;
export const ACCESS_CODE_LENGTH = 6;
export const ACCESS_CODE_EXPIRY_HOURS = 24;
```

- [ ] **Step 2: 提交更改**

```bash
git add src/utils/constants.js
git commit -m "feat: add optimized constants for face recognition"
```

---

### Task 3: 创建 useSmartCapture.js hook

**Files:**
- Create: `src/hooks/useSmartCapture.js`

- [ ] **Step 1: 创建文件并实现智能头像抓取逻辑**

```javascript
import { FACE_CAPTURE_PADDING_RATIO, FACE_CAPTURE_QUALITY } from '../utils/constants';

/**
 * 智能头像抓取 Hook
 * 在人脸检测框基础上增加边距，确保完整抓取人脸
 */
export default function useSmartCapture() {
  /**
   * 智能抓取人脸图像
   * @param {HTMLVideoElement} video - 视频元素
   * @param {Object} box - 人脸检测框 {x, y, width, height}
   * @returns {string} base64 编码的图像
   */
  function captureSmartFace(video, box) {
    if (!video || !box) return null;

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;
    const paddingX = box.width * FACE_CAPTURE_PADDING_RATIO;
    const paddingY = box.height * FACE_CAPTURE_PADDING_RATIO;

    // 计算扩展后的区域
    let captureX = Math.max(0, box.x - paddingX);
    let captureY = Math.max(0, box.y - paddingY);
    let captureWidth = Math.min(videoWidth - captureX, box.width + 2 * paddingX);
    let captureHeight = Math.min(videoHeight - captureY, box.height + 2 * paddingY);

    // 确保不会超出画面边界
    if (captureX + captureWidth > videoWidth) {
      captureX = Math.max(0, videoWidth - captureWidth);
    }
    if (captureY + captureHeight > videoHeight) {
      captureY = Math.max(0, videoHeight - captureHeight);
    }

    const offscreen = document.createElement('canvas');
    offscreen.width = captureWidth;
    offscreen.height = captureHeight;
    const ctx = offscreen.getContext('2d');

    // 使用更好的图像质量设置
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(
      video,
      captureX, captureY, captureWidth, captureHeight,
      0, 0, captureWidth, captureHeight
    );

    return offscreen.toDataURL('image/jpeg', FACE_CAPTURE_QUALITY);
  }

  return { captureSmartFace };
}
```

- [ ] **Step 2: 提交更改**

```bash
git add src/hooks/useSmartCapture.js
git commit -m "feat: add smart face capture hook with padding"
```

---

### Task 4: 创建 stream-utils.js 工具函数

**Files:**
- Create: `src/utils/stream-utils.js`

- [ ] **Step 1: 创建流处理工具函数**

```javascript
/**
 * 将 canvas 转换为 MJPEG 帧数据
 * @param {HTMLCanvasElement} canvas - 视频画面 canvas
 * @returns {string} base64 编码的 JPEG 帧
 */
export function captureFrameToJpeg(canvas) {
  if (!canvas) return null;
  return canvas.toDataURL('image/jpeg', 0.8);
}

/**
 * 生成随机访问码
 * @param {number} length - 访问码长度
 * @returns {string} 随机数字访问码
 */
export function generateAccessCode(length = 6) {
  const chars = '0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 检查访问码是否过期
 * @param {string} createdAt - 创建时间戳
 * @param {number} expiryHours - 有效期（小时）
 * @returns {boolean} 是否过期
 */
export function isAccessCodeExpired(createdAt, expiryHours = 24) {
  const now = Date.now();
  const expiryTime = createdAt + (expiryHours * 60 * 60 * 1000);
  return now > expiryTime;
}

/**
 * 获取局域网 IP 地址
 * @returns {Promise<string>} 局域网 IP 地址
 */
export async function getLocalIpAddress() {
  try {
    const response = await fetch('https://api.ipify.org?format=json');
    const data = await response.json();
    return data.ip;
  } catch (e) {
    console.error('Failed to get local IP:', e);
    return 'localhost';
  }
}
```

- [ ] **Step 2: 提交更改**

```bash
git add src/utils/stream-utils.js
git commit -m "feat: add stream utility functions"
```

---

### Task 5: 更新 useFaceRecognition.js 应用优化参数

**Files:**
- Modify: `src/hooks/useFaceRecognition.js`

- [ ] **Step 1: 更新导入语句，添加新常量**

```javascript
import {
  FACE_API_URL, MODEL_URL, MATCH_THRESHOLD, LEARN_THRESHOLD,
  MAX_DESCRIPTORS_PER_PERSON, SCAN_INTERVAL_MS, NOTIFICATION_COOLDOWN_MS,
  STRANGER_COOLDOWN_MS, PRESENCE_TIMEOUT_MS,
  OPTIMIZED_SCAN_INTERVAL_MS, OPTIMIZED_MATCH_THRESHOLD, OPTIMIZED_LEARN_THRESHOLD,
  FACE_DETECTION_INPUT_SIZE, FACE_DETECTION_SCORE_THRESHOLD,
  PRESENCE_REMINDER_INTERVAL_MS
} from '../utils/constants';
```

- [ ] **Step 2: 更新 useEffect 中的扫描间隔**

找到第 87 行，修改为：

```javascript
const timer = setInterval(scanFrame, OPTIMIZED_SCAN_INTERVAL_MS);
```

- [ ] **Step 3: 更新 scanFrame 函数中的检测参数**

找到第 124-127 行，修改为：

```javascript
const detection = await window.faceapi
  .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({
    inputSize: FACE_DETECTION_INPUT_SIZE,
    scoreThreshold: FACE_DETECTION_SCORE_THRESHOLD
  }))
  .withFaceLandmarks()
  .withFaceDescriptors();
```

- [ ] **Step 4: 更新匹配阈值判断逻辑**

找到第 165 行，修改为：

```javascript
if (bestMatch && bestDistance < OPTIMIZED_MATCH_THRESHOLD) {
```

- [ ] **Step 5: 更新学习阈值逻辑**

找到第 193 行，修改为：

```javascript
} else if (bestMatch && bestDistance < OPTIMIZED_LEARN_THRESHOLD) {
```

- [ ] **Step 6: 添加持续提醒逻辑**

在 presenceRef 定义后添加：

```javascript
const reminderTimerRef = useRef({});
```

在状态显示逻辑中添加持续提醒：

找到第 180-183 行，修改为：

```javascript
if (wasPresent) {
  // 此人一直在镜头前，持续轻量提醒
  setStatus(`${bestMatch.relation} ${bestMatch.name} 在场`);
  // 每 5 秒触发一次视觉提醒
  if (!reminderTimerRef.current[visitorId]) {
    reminderTimerRef.current[visitorId] = setTimeout(() => {
      onRecognized?.(bestMatch, bestDistance, now, 'reminder');
      reminderTimerRef.current[visitorId] = null;
    }, PRESENCE_REMINDER_INTERVAL_MS);
  }
}
```

- [ ] **Step 7: 清理定时器**

在清理超时在场记录的代码后添加：

```javascript
// 清理提醒定时器
for (const id of Object.keys(reminderTimerRef.current)) {
  if (reminderTimerRef.current[id]) {
    clearTimeout(reminderTimerRef.current[id]);
    delete reminderTimerRef.current[id];
  }
}
```

- [ ] **Step 8: 提交更改**

```bash
git add src/hooks/useFaceRecognition.js
git commit -m "feat: optimize face recognition parameters and add continuous reminders"
```

---

### Task 6: 创建 useRemoteStream.js hook

**Files:**
- Create: `src/hooks/useRemoteStream.js`

- [ ] **Step 1: 创建远程流管理 Hook**

```javascript
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
```

- [ ] **Step 2: 提交更改**

```bash
git add src/hooks/useRemoteStream.js
git commit -m "feat: add remote stream management hook"
```

---

### Task 7: 创建 PresenceIndicator.jsx 组件

**Files:**
- Create: `src/components/PresenceIndicator.jsx`

- [ ] **Step 1: 创建在场状态指示器组件**

```javascript
import { useEffect, useState } from 'react';
import { Users, UserCheck, Clock } from 'lucide-react';

/**
 * 在场状态指示器
 * 显示当前在场的人员列表和状态
 */
export default function PresenceIndicator({ presentPeople, onDeparture }) {
  const [departures, setDepartures] = useState([]);

  useEffect(() => {
    // 检测离开的人员
    const currentIds = new Set(presentPeople.map(p => p.id));
    const previousIds = new Set(departures.map(d => d.id));

    // 之前在场但现在不在的 = 离开
    presentPeople.forEach(person => {
      previousIds.add(person.id);
    });

    const newDepartures = Array.from(previousIds).filter(id => !currentIds.has(id));
    if (newDepartures.length > 0) {
      newDepartures.forEach(id => {
        const person = departures.find(d => d.id === id);
        if (person) {
          onDeparture?.(person);
        }
      });
    }

    setDepartures(presentPeople);
  }, [presentPeople, onDeparture]);

  if (presentPeople.length === 0) {
    return null;
  }

  return (
    <div className="presence-indicator">
      <div className="presence-header">
        <Users size={16} />
        <span className="presence-count">{presentPeople.length}</span>
        <span className="presence-label">人在场</span>
      </div>
      <div className="presence-list">
        {presentPeople.map(person => (
          <div key={person.id} className="presence-item">
            <UserCheck size={14} className="presence-icon" />
            <span className="presence-name">{person.relation} {person.name}</span>
            <Clock size={12} className="presence-time" />
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: 添加样式到 App.css**

打开 `src/App.css`，在文件末尾添加：

```css
/* 在场状态指示器 */
.presence-indicator {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.presence-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #22c55e;
  margin-bottom: 8px;
}

.presence-count {
  background: #22c55e;
  color: white;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
}

.presence-label {
  font-size: 14px;
}

.presence-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.presence-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 6px;
  font-size: 13px;
}

.presence-icon {
  color: #22c55e;
}

.presence-time {
  margin-left: auto;
  color: #9ca3af;
}

/* 持续提醒动画 */
@keyframes pulse-reminder {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.reminder-pulse {
  animation: pulse-reminder 2s ease-in-out infinite;
}
```

- [ ] **Step 3: 提交更改**

```bash
git add src/components/PresenceIndicator.jsx src/App.css
git commit -m "feat: add presence indicator component"
```

---

### Task 8: 创建 AccessCodeModal.jsx 组件

**Files:**
- Create: `src/components/AccessCodeModal.jsx`

- [ ] **Step 1: 创建访问码弹窗组件**

```javascript
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
              <button className="copy-btn" onClick={handleCopyCode}>
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
```

- [ ] **Step 2: 添加样式到 App.css**

打开 `src/App.css`，在文件末尾添加：

```css
/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.modal-content {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 480px;
  animation: slideUp 0.3s ease-out;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.modal-icon {
  color: #3b82f6;
}

.modal-close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-close:hover {
  background: #f3f4f6;
  color: #1f2937;
}

.modal-body {
  padding: 24px;
}

/* 查看者信息 */
.viewer-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #eff6ff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.viewer-icon {
  color: #3b82f6;
}

.viewer-count {
  font-weight: 700;
  color: #1e40af;
}

.viewer-label {
  color: #6b7280;
  font-size: 14px;
}

/* 访问码显示 */
.access-code-section {
  margin-bottom: 20px;
}

.access-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.access-code-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f9fafb;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
}

.access-code-text {
  flex: 1;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 8px;
  color: #1f2937;
  text-align: center;
  font-family: 'Courier New', monospace;
}

.copy-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: none;
  background: white;
  color: #6b7280;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.copy-btn:hover {
  background: #f3f4f6;
  color: #1f2937;
}

/* 分享操作 */
.share-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.share-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.share-btn.primary {
  background: #3b82f6;
  color: white;
}

.share-btn.primary:hover {
  background: #2563eb;
}

.share-btn.secondary {
  background: white;
  color: #374151;
  border: 1px solid #d1d5db;
}

.share-btn.secondary:hover {
  background: #f9fafb;
  border-color: #9ca3af;
}

/* 分享链接 */
.share-url-section {
  margin-bottom: 20px;
}

.share-url-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 8px;
}

.share-url-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.share-url-text {
  flex: 1;
  font-size: 13px;
  color: #6b7280;
  word-break: break-all;
}

.external-link {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #3b82f6;
  transition: color 0.2s;
}

.external-link:hover {
  color: #2563eb;
}

/* 提示信息 */
.access-note {
  padding: 12px;
  background: #fef3c7;
  border-radius: 8px;
  font-size: 13px;
  color: #92400e;
  line-height: 1.5;
}

.access-note p {
  margin: 0;
}
```

- [ ] **Step 3: 提交更改**

```bash
git add src/components/AccessCodeModal.jsx src/App.css
git commit -m "feat: add access code modal component"
```

---

### Task 9: 创建 RemoteMonitor.jsx 组件

**Files:**
- Create: `src/components/RemoteMonitor.jsx`

- [ ] **Step 1: 创建远程监控控制组件**

```javascript
import { useState } from 'react';
import { Video, VideoOff, Share2, Wifi, WifiOff } from 'lucide-react';
import useRemoteStream from '../hooks/useRemoteStream';

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
    }
    setShowAccessCode(true);
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
          className={`monitor-btn ${isStreaming ? 'active' : ''}`}
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
          onGenerateNew={() => {
            generateNewAccessCode();
          }}
          t={t}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: 在 RemoteMonitor.jsx 顶部添加 AccessCodeModal 导入**

```javascript
import AccessCodeModal from './AccessCodeModal';
```

- [ ] **Step 3: 添加样式到 App.css**

打开 `src/App.css`，在文件末尾添加：

```css
/* 远程监控控制 */
.remote-monitor {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.monitor-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.monitor-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.monitor-status {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-icon {
  display: flex;
  align-items: center;
}

.status-icon.live {
  color: #22c55e;
}

.status-icon.offline {
  color: #9ca3af;
}

.status-text {
  font-size: 13px;
  font-weight: 500;
}

.status-text.live {
  color: #22c55e;
}

.status-text.offline {
  color: #9ca3af;
}

.monitor-controls {
  display: flex;
  gap: 8px;
}

.monitor-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.monitor-btn.primary {
  background: #3b82f6;
  color: white;
}

.monitor-btn.primary:hover:not(:disabled) {
  background: #2563eb;
}

.monitor-btn.primary:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.monitor-btn.secondary {
  background: #f3f4f6;
  color: #374151;
}

.monitor-btn.secondary:hover:not(:disabled) {
  background: #e5e7eb;
}

.monitor-btn.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.monitor-btn.active {
  background: #ef4444;
  color: white;
}

.monitor-btn.active:hover {
  background: #dc2626;
}
```

- [ ] **Step 4: 提交更改**

```bash
git add src/components/RemoteMonitor.jsx src/App.css
git commit -m "feat: add remote monitor control component"
```

---

### Task 10: 创建 WebSocket 服务器

**Files:**
- Create: `src/server/index.js`

- [ ] **Step 1: 创建 WebSocket 服务器**

```javascript
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const { generateAccessCode, isAccessCodeExpired } = '../utils/stream-utils';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 存储访问码和会话信息
const accessCodes = new Map();
const streamSessions = new Map();
const viewers = new Map();

// 生成访问码
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // 生成新的访问码
  socket.on('generate-access-code', () => {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const session = {
      code,
      createdAt: Date.now(),
      streamerSocket: socket.id,
      viewers: new Set()
    };
    accessCodes.set(code, session);
    streamSessions.set(socket.id, code);
    socket.emit('access-code', code);
    console.log('Generated access code:', code);
  });

  // 开始流式传输
  socket.on('start-stream', () => {
    const code = streamSessions.get(socket.id);
    if (!code) {
      console.warn('No access code found for socket:', socket.id);
      return;
    }

    const session = accessCodes.get(code);
    if (session) {
      session.isStreaming = true;
      session.streamerSocket = socket.id;
      console.log('Stream started for code:', code);
    }
  });

  // 停止流式传输
  socket.on('stop-stream', () => {
    const code = streamSessions.get(socket.id);
    if (!code) return;

    const session = accessCodes.get(code);
    if (session) {
      session.isStreaming = false;
      console.log('Stream stopped for code:', code);
    }
  });

  // 接收视频帧
  socket.on('video-frame', (frameData) => {
    const code = streamSessions.get(socket.id);
    if (!code) return;

    const session = accessCodes.get(code);
    if (!session || !session.isStreaming) return;

    // 转发给所有查看者
    session.viewers.forEach(viewerSocket => {
      io.to(viewerSocket).emit('video-frame', frameData);
    });
  });

  // 断开连接
  socket.on('disconnect', () => {
    const code = streamSessions.get(socket.id);
    if (code) {
      const session = accessCodes.get(code);
      if (session) {
        if (session.streamerSocket === socket.id) {
          // 流式传输者断开连接
          session.isStreaming = false;
          // 通知所有查看者
          session.viewers.forEach(viewerSocket => {
            io.to(viewerSocket).emit('stream-ended');
          });
          session.viewers.clear();
        } else {
          // 查看者断开连接
          session.viewers.delete(socket.id);
          if (session.streamerSocket) {
            io.to(session.streamerSocket).emit('viewer-left', session.viewers.size);
          }
        }
      }
    }
    streamSessions.delete(socket.id);
    viewers.delete(socket.id);
    console.log('Client disconnected:', socket.id);
  });
});

// 查看者连接
io.on('connection', (socket) => {
  socket.on('view-stream', (code) => {
    const session = accessCodes.get(code);
    if (!session) {
      socket.emit('error', 'Invalid access code');
      return;
    }

    // 检查访问码是否过期
    if (isAccessCodeExpired(session.createdAt)) {
      socket.emit('error', 'Access code expired');
      accessCodes.delete(code);
      return;
    }

    session.viewers.add(socket.id);
    viewers.set(socket.id, code);

    // 通知流式传输者
    if (session.streamerSocket) {
      io.to(session.streamerSocket).emit('viewer-joined', session.viewers.size);
      // 发送当前流状态
      socket.emit('stream-status', session.isStreaming);
    }

    console.log('Viewer joined for code:', code, 'Total viewers:', session.viewers.size);
  });
});

// 提供静态文件
app.use(express.static(path.join(__dirname, '../../dist')));

// 查看端页面
app.get('/view', (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('Access code required');
  }
  res.sendFile(path.join(__dirname, '../../dist/viewer.html'));
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', sessions: accessCodes.size });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Stream server running on port ${PORT}`);
});

// 清理过期的访问码
setInterval(() => {
  const now = Date.now();
  for (const [code, session] of accessCodes.entries()) {
    if (isAccessCodeExpired(session.createdAt)) {
      accessCodes.delete(code);
      console.log('Expired access code removed:', code);
    }
  }
}, 60 * 60 * 1000); // 每小时检查一次
```

- [ ] **Step 2: 更新 package.json 添加服务器启动脚本**

打开 `package.json`，在 `scripts` 中添加：

```json
{
  "scripts": {
    "server": "node src/server/index.js",
    "dev:server": "concurrently \"npm run dev\" \"npm run server\""
  }
}
```

- [ ] **Step 3: 添加 concurrently 依赖**

Run: `npm install --save-dev concurrently`

- [ ] **Step 4: 提交更改**

```bash
git add src/server/index.js package.json package-lock.json
git commit -m "feat: add WebSocket server for remote streaming"
```

---

### Task 11: 创建查看端页面

**Files:**
- Create: `dist/viewer.html` (构建后会自动生成，先创建模板)
- Create: `src/Viewer.jsx`

- [ ] **Step 1: 创建查看端 React 组件**

```javascript
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
import { Lock, VideoOff, Wifi, WifiOff } from 'lucide-react';
import { REMOTE_STREAM_SERVER_PORT } from './utils/constants';

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
  const canvasRef = useRef(null);
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
```

- [ ] **Step 2: 添加查看端样式到 App.css**

```css
/* 查看端样式 */
.viewer-container {
  min-height: 100vh;
  background: #111827;
  color: white;
}

.viewer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 24px;
  background: rgba(0, 0, 0, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.viewer-title {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.viewer-status {
  display: flex;
  align-items: center;
  gap: 8px;
}

.viewer-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 72px);
  padding: 24px;
}

.viewer-error {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  border-radius: 8px;
  color: #fca5a5;
  margin-bottom: 24px;
}

.viewer-login {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 320px;
}

.login-label {
  font-size: 14px;
  font-weight: 500;
  color: #9ca3af;
}

.login-input {
  padding: 12px 16px;
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 4px;
  text-align: center;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: white;
  font-family: 'Courier New', monospace;
}

.login-input:focus {
  outline: none;
  border-color: #3b82f6;
}

.login-input::placeholder {
  letter-spacing: 0;
  font-size: 16px;
  font-weight: 400;
  opacity: 0.5;
}

.login-btn {
  padding: 12px 24px;
  font-size: 16px;
  font-weight: 600;
  border: none;
  border-radius: 8px;
  background: #3b82f6;
  color: white;
  cursor: pointer;
  transition: background 0.2s;
}

.login-btn:hover {
  background: #2563eb;
}

.viewer-display {
  width: 100%;
  max-width: 1280px;
  aspect-ratio: 16 / 9;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 12px;
  overflow: hidden;
}

.viewer-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.viewer-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  width: 100%;
  height: 100%;
  color: #6b7280;
}

.viewer-placeholder p {
  margin: 0;
  font-size: 16px;
}
```

- [ ] **Step 3: 提交更改**

```bash
git add src/Viewer.jsx src/App.css
git commit -m "feat: add remote viewer component"
```

---

### Task 12: 集成所有功能到 App.jsx

**Files:**
- Modify: `src/App.jsx`

- [ ] **Step 1: 添加新组件导入**

在 `src/App.jsx` 顶部导入区域添加：

```javascript
import RemoteMonitor from './components/RemoteMonitor';
import PresenceIndicator from './components/PresenceIndicator';
import AccessCodeModal from './components/AccessCodeModal';
```

- [ ] **Step 2: 更新 App 组件状态**

在 App 组件中添加状态：

```javascript
const [presentPeople, setPresentPeople] = useState([]);
const [showAccessCode, setShowAccessCode] = useState(false);
```

- [ ] **Step 3: 更新 onRecognized 回调处理**

修改 `onRecognized` 函数以支持持续提醒：

```javascript
const onRecognized = useCallback((person, distance, timestamp, type = 'arrival') => {
  if (type === 'arrival') {
    // 首次到达
    setPresentPeople(prev => {
      const exists = prev.find(p => p.id === person.id);
      if (!exists) {
        return [...prev, { ...person, lastSeen: timestamp }];
      }
      return prev;
    });
    // 语音提醒
    playVoice(`欢迎，${person.relation}${person.name}来了`);
  } else if (type === 'reminder') {
    // 持续提醒
    playVoice(`当前在场，${person.relation}${person.name}`);
  }
}, []);
```

- [ ] **Step 4: 添加人员离开处理**

添加 `handleDeparture` 函数：

```javascript
const handleDeparture = useCallback((person) => {
  setPresentPeople(prev => prev.filter(p => p.id !== person.id));
  playVoice(`再见，${person.relation}${person.name}`);
}, []);
```

- [ ] **Step 5: 在渲染中添加新组件**

在适当位置添加：

```jsx
{/* 在场状态指示器 */}
<PresenceIndicator
  presentPeople={presentPeople}
  onDeparture={handleDeparture}
/>

{/* 远程监控控制 */}
{cameraReady && (
  <RemoteMonitor
    videoRef={videoRef}
    canvasRef={canvasRef}
    t={t}
  />
)}
```

- [ ] **Step 6: 提交更改**

```bash
git add src/App.jsx
git commit -m "feat: integrate remote monitor and presence indicator into App"
```

---

### Task 13: 修复和优化

**Files:**
- Modify: `src/hooks/useFaceRecognition.js`
- Modify: `src/hooks/useSmartCapture.js`

- [ ] **Step 1: 集成智能抓取到识别 Hook**

在 `src/hooks/useFaceRecognition.js` 中导入并使用智能抓取：

在文件顶部添加导入：

```javascript
import useSmartCapture from './useSmartCapture';
```

在 hook 内部使用：

```javascript
const { captureSmartFace } = useSmartCapture();
```

修改 `captureUnknownFace` 函数：

```javascript
function captureUnknownFace(detection) {
  const video = videoRef.current;
  const image = captureSmartFace(video, detection.detection.box);
  onUnknownFace?.({ image, descriptor: detection.descriptor, seenAt: Date.now() });
}
```

- [ ] **Step 2: 提交更改**

```bash
git add src/hooks/useFaceRecognition.js
git commit -m "fix: integrate smart face capture into recognition hook"
```

---

### Task 14: 测试和验证

**Files:**
- None

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev:server`
Expected: Vite 开发服务器和 WebSocket 服务器同时启动

- [ ] **Step 2: 测试人脸识别优化**

1. 打开浏览器访问 http://localhost:5173
2. 启动摄像头
3. 测试识别准确性
4. 验证头像抓取完整性
5. 检查持续在场状态显示

- [ ] **Step 3: 测试远程监控**

1. 点击"分享访问"按钮
2. 获取访问码
3. 在另一个浏览器窗口输入访问码
4. 验证视频流传输
5. 检查查看者数量更新

- [ ] **Step 4: 测试访问码功能**

1. 生成新访问码
2. 验证旧访问码失效
3. 测试访问码复制功能

- [ ] **Step 5: 构建生产版本**

Run: `npm run build`
Expected: 构建成功，无错误

- [ ] **Step 6: 提交最终更改**

```bash
git add -A
git commit -m "chore: final testing and validation complete"
```

---

## 验收标准

- [ ] 人脸识别准确率提升（通过实际测试验证）
- [ ] 头像抓取完整（无裁剪）
- [ ] 在场状态持续显示
- [ ] 每 5 秒视觉提醒生效
- [ ] WebSocket 服务器正常运行
- [ ] 访问码生成和验证正常
- [ ] 远程查看端能接收视频流
- [ ] 查看者数量正确显示
- [ ] 生产构建成功
- [ ] 无控制台错误

---

## 完成检查清单

在实施完成后，运行以下检查：

```bash
# 1. 检查所有文件是否存在
ls -la src/hooks/useSmartCapture.js
ls -la src/hooks/useRemoteStream.js
ls -la src/components/RemoteMonitor.jsx
ls -la src/components/AccessCodeModal.jsx
ls -la src/components/PresenceIndicator.jsx
ls -la src/Viewer.jsx
ls -la src/server/index.js
ls -la src/utils/stream-utils.js

# 2. 检查依赖是否安装
npm list socket.io socket.io-client concurrently

# 3. 检查构建
npm run build

# 4. 检查类型错误（如果使用 TypeScript）
npm run type-check

# 5. 运行服务器测试
npm run dev:server
```