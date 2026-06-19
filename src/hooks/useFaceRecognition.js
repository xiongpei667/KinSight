import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FACE_API_URL, MODEL_URL, MATCH_THRESHOLD, LEARN_THRESHOLD,
  MAX_DESCRIPTORS_PER_PERSON, SCAN_INTERVAL_MS, NOTIFICATION_COOLDOWN_MS,
  STRANGER_COOLDOWN_MS, PRESENCE_TIMEOUT_MS,
  OPTIMIZED_SCAN_INTERVAL_MS, OPTIMIZED_MATCH_THRESHOLD, OPTIMIZED_LEARN_THRESHOLD,
  FACE_DETECTION_INPUT_SIZE, FACE_DETECTION_SCORE_THRESHOLD,
  PRESENCE_REMINDER_INTERVAL_MS
} from '../utils/constants';
import { bestDescriptorMatch } from '../utils/storage';
import useSmartCapture from './useSmartCapture';

export default function useFaceRecognition({ visitors, onRecognized, onUnknownFace, onLearnDescriptor, videoRef, canvasRef }) {
  const extVideoRef = videoRef || useRef(null);
  const extCanvasRef = canvasRef || useRef(null);
  videoRef = extVideoRef;
  canvasRef = extCanvasRef;
  const streamRef = useRef(null);
  const scanLockRef = useRef(false);
  const lastNotifyRef = useRef({});
  const lastStrangerRef = useRef(0);
  const visitorsRef = useRef(visitors);
  visitorsRef.current = visitors;

  // 在场追踪：记录每个已识别的人最后一次被检测到的时间
  // 只有"新人出现"或"离开后重新出现"才触发提醒
  const presenceRef = useRef({}); // { [visitorId]: lastSeenTimestamp }
  const reminderTimerRef = useRef({}); // { [visitorId]: timerId }
  const { captureSmartFace } = useSmartCapture();

  const [modelsReady, setModelsReady] = useState(false);
  const [modelProgress, setModelProgress] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState('等待启动摄像头');
  const [error, setError] = useState('');

  // 加载人脸识别模型（仅在组件首次挂载时执行）
  useEffect(() => {
    let cancelled = false;

    async function loadFaceApi() {
      try {
        setStatus('正在加载人脸识别模型…');
        if (!window.faceapi) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = FACE_API_URL;
            script.async = true;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
          });
        }
        const nets = [
          { name: 'tinyFaceDetector', loader: window.faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL) },
          { name: 'faceLandmark68Net', loader: window.faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL) },
          { name: 'faceRecognitionNet', loader: window.faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL) },
        ];
        for (const { name, loader } of nets) {
          setModelProgress(name);
          await loader;
        }
        if (!cancelled) {
          setModelsReady(true);
          setModelProgress('');
          setStatus('模型已就绪，可以启动摄像头');
        }
      } catch (e) {
        setError('模型加载失败，请检查网络后刷新页面。');
        setStatus('模型加载失败');
        console.error(e);
      }
    }

    loadFaceApi();
    return () => {
      cancelled = true;
    };
  }, []);

  // 摄像头流的清理：仅在组件真正卸载时关闭摄像头，避免 React StrictMode 双重挂载导致误关闭
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!modelsReady || !cameraReady) return undefined;
    const timer = setInterval(scanFrame, OPTIMIZED_SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [modelsReady, cameraReady]);

  // 当摄像头就绪且 video 元素可用时，确保流始终绑定到 video 元素
  // 防止 React 重渲染导致 video 元素被重新创建后丢失 srcObject
  useEffect(() => {
    if (!cameraReady || !streamRef.current || !videoRef.current) return;
    if (videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  });

  const startCamera = useCallback(async () => {
    try {
      setStatus('正在启动摄像头…');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
      setStatus('摄像头已启动，正在扫描…');
    } catch (e) {
      setError('无法访问摄像头，请检查权限设置。');
      setStatus('摄像头启动失败');
      console.error(e);
    }
  }, []);

  async function scanFrame() {
    if (scanLockRef.current || !videoRef.current || videoRef.current.paused) return;
    scanLockRef.current = true;

    try {
      const detection = await window.faceapi
        .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({
          inputSize: FACE_DETECTION_INPUT_SIZE,
          scoreThreshold: FACE_DETECTION_SCORE_THRESHOLD
        }))
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (!detection.length) {
        setStatus('未检测到人脸');
        scanLockRef.current = false;
        return;
      }

      const currentVisitors = visitorsRef.current;
      const now = Date.now();
      const displayResult = detection[0];

      // 绘制人脸检测框
      const canvas = canvasRef.current;
      if (canvas) {
        const dims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        window.faceapi.matchDimensions(canvas, dims);
        const resized = window.faceapi.resizeResults(detection, dims);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.faceapi.draw.drawDetections(canvas, resized);
      }

      // 与所有已知人员的所有角度 descriptor 匹配，取最小距离
      let bestMatch = null;
      let bestDistance = Infinity;

      for (const visitor of currentVisitors) {
        const descriptors = visitor.descriptors;
        if (!descriptors || !descriptors.length) continue;
        // 多角度匹配：与该人的所有 descriptor 比较，取最小距离
        const dist = bestDescriptorMatch(displayResult.descriptor, descriptors);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = visitor;
        }
      }

      if (bestMatch && bestDistance < OPTIMIZED_MATCH_THRESHOLD) {
        // === 已识别到已知人员 ===
        const visitorId = bestMatch.id;
        const lastPresence = presenceRef.current[visitorId];
        const wasPresent = lastPresence && (now - lastPresence < PRESENCE_TIMEOUT_MS);

        // 更新在场时间
        presenceRef.current[visitorId] = now;

        // 自动学习新角度：如果匹配距离大于一定值但仍在阈值内，说明是新角度
        // 将该 descriptor 加入此人的 descriptors 库，下次就能更好匹配
        if (bestDistance > OPTIMIZED_MATCH_THRESHOLD * 0.7 && bestMatch.descriptors.length < MAX_DESCRIPTORS_PER_PERSON) {
          onLearnDescriptor?.(visitorId, displayResult.descriptor);
        }

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
        } else {
          // 此人刚出现或离开后重新出现，触发提醒
          setStatus(`${bestMatch.relation} ${bestMatch.name} 来了`);
          // 通知冷却检查
          if (!lastNotifyRef.current[visitorId] || now - lastNotifyRef.current[visitorId] > NOTIFICATION_COOLDOWN_MS) {
            lastNotifyRef.current[visitorId] = now;
            trySendNotification(`${bestMatch.relation} ${bestMatch.name}`, `来了`);
            onRecognized?.(bestMatch, bestDistance, now, 'arrival');
          }
        }
      } else if (bestMatch && bestDistance < OPTIMIZED_LEARN_THRESHOLD) {
        // === 弱匹配：可能是已知人员的新角度 ===
        // 距离在 MATCH_THRESHOLD 和 LEARN_THRESHOLD 之间
        // 自动学习该 descriptor，但不触发识别提醒（避免误报）
        if (bestMatch.descriptors.length < MAX_DESCRIPTORS_PER_PERSON) {
          onLearnDescriptor?.(bestMatch.id, displayResult.descriptor);
        }
        const visitorId = bestMatch.id;
        const lastPresence = presenceRef.current[visitorId];
        const wasPresent = lastPresence && (now - lastPresence < PRESENCE_TIMEOUT_MS);
        presenceRef.current[visitorId] = now;

        if (wasPresent) {
          setStatus(`${bestMatch.relation} ${bestMatch.name} 在场`);
        } else {
          setStatus(`可能是 ${bestMatch.relation} ${bestMatch.name}`);
        }
      } else {
        // === 陌生人 ===
        setStatus('检测到陌生人');
        if (now - lastStrangerRef.current > STRANGER_COOLDOWN_MS) {
          lastStrangerRef.current = now;
          captureUnknownFace(displayResult);
        }
      }

      // 清理超时的在场记录和提醒定时器
      for (const id of Object.keys(presenceRef.current)) {
        if (now - presenceRef.current[id] > PRESENCE_TIMEOUT_MS) {
          // 清理提醒定时器
          if (reminderTimerRef.current[id]) {
            clearTimeout(reminderTimerRef.current[id]);
            delete reminderTimerRef.current[id];
          }
          delete presenceRef.current[id];
        }
      }
    } catch (e) {
      console.error(e);
    }

    scanLockRef.current = false;
  }

  function captureUnknownFace(detection) {
    const video = videoRef.current;
    const box = detection.detection.box;
    const image = captureSmartFace(video, box);
    onUnknownFace?.({ image, descriptor: detection.descriptor, seenAt: Date.now() });
  }

  function trySendNotification(title, body) {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }

  return { modelsReady, cameraReady, status, error, modelProgress, videoRef, canvasRef, startCamera };
}
