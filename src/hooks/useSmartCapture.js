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