import { useEffect, useRef, useState, useCallback } from 'react';
import {
  FACE_API_URL, MODEL_URL, MATCH_THRESHOLD,
  SCAN_INTERVAL_MS, NOTIFICATION_COOLDOWN_MS, STRANGER_COOLDOWN_MS
} from '../utils/constants';
import { descriptorDistance } from '../utils/storage';

export default function useFaceRecognition({ visitors, onRecognized, onUnknownFace }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanLockRef = useRef(false);
  const lastNotifyRef = useRef({});
  const lastStrangerRef = useRef(0);
  const visitorsRef = useRef(visitors);
  visitorsRef.current = visitors;

  const [modelsReady, setModelsReady] = useState(false);
  const [modelProgress, setModelProgress] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [status, setStatus] = useState('等待启动摄像头');
  const [error, setError] = useState('');

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
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  useEffect(() => {
    if (!modelsReady || !cameraReady) return undefined;
    const timer = setInterval(scanFrame, SCAN_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [modelsReady, cameraReady]);

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
        .detectAllFaces(videoRef.current, new window.faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
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

      // Draw face boxes
      const canvas = canvasRef.current;
      if (canvas) {
        const dims = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        window.faceapi.matchDimensions(canvas, dims);
        const resized = window.faceapi.resizeResults(detection, dims);
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.faceapi.draw.drawDetections(canvas, resized);
      }

      // Try to match against known faces
      let bestMatch = null;
      let bestDistance = Infinity;

      for (const visitor of currentVisitors) {
        if (!visitor.descriptor) continue;
        const dist = descriptorDistance(displayResult.descriptor, visitor.descriptor);
        if (dist < bestDistance) {
          bestDistance = dist;
          bestMatch = visitor;
        }
      }

      if (bestMatch && bestDistance < MATCH_THRESHOLD) {
        setStatus(`${bestMatch.relation} ${bestMatch.name} 来了`);
        // Cooldown check
        if (!lastNotifyRef.current[bestMatch.id] || now - lastNotifyRef.current[bestMatch.id] > NOTIFICATION_COOLDOWN_MS) {
          lastNotifyRef.current[bestMatch.id] = now;
          trySendNotification(`${bestMatch.relation} ${bestMatch.name}`, `来了`);
          onRecognized?.(bestMatch, bestDistance, now);
        }
      } else {
        setStatus('检测到陌生人');
        if (now - lastStrangerRef.current > STRANGER_COOLDOWN_MS) {
          lastStrangerRef.current = now;
          captureUnknownFace(displayResult);
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
    const offscreen = document.createElement('canvas');
    offscreen.width = box.width;
    offscreen.height = box.height;
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(video, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
    const image = offscreen.toDataURL('image/jpeg', 0.8);
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
