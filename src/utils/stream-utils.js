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