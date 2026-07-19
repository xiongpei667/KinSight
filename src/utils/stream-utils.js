/**
 * Stream 工具函数
 * 仅保留前端需要的工具；访问码生成 / 过期检查由服务端负责
 */

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
 * 通过 WebRTC 获取本机局域网 IP 地址
 * 原实现使用 ipify 返回的是公网 IP，不适用于局域网流媒体场景
 * @returns {Promise<string>} 局域网 IP 地址，失败时返回 'localhost'
 */
export async function getLocalIpAddress() {
  try {
    const pc = new RTCPeerConnection({ iceServers: [] });
    pc.createDataChannel(''); // 创建 DataChannel 以触发 ICE 收集
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // 等待 ICE 候选收集完成
    await new Promise((resolve) => {
      if (pc.iceGatheringState === 'complete') return resolve();
      const checkState = () => pc.iceGatheringState === 'complete' && resolve();
      pc.addEventListener('icegatheringstatechange', checkState);
      setTimeout(resolve, 2000); // 超时兜底
    });

    // 从 ICE 候选中提取局域网 IP（过滤掉公网和回环地址）
    const lines = pc.localDescription.sdp.split('\n');
    for (const line of lines) {
      if (line.startsWith('a=candidate:')) {
        const parts = line.split(' ');
        const ip = parts[4];
        // 优先返回局域网 IP（192.168.x.x / 10.x.x.x / 172.16-31.x.x）
        if (/^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(ip)) {
          pc.close();
          return ip;
        }
      }
    }

    pc.close();
    return 'localhost';
  } catch (e) {
    console.error('Failed to get local IP:', e);
    return 'localhost';
  }
}
