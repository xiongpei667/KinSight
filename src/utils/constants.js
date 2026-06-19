export const STORAGE_KEY = 'kinsight-data-v2';
export const FACE_API_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/dist/face-api.js';
export const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';

// 匹配阈值：descriptor 距离小于此值认为同一人
export const MATCH_THRESHOLD = 0.48;

// 学习阈值：已识别的人距离在此值以内时，自动将该角度的 descriptor 加入库中
// 大于 MATCH_THRESHOLD 但小于此值 = 新角度，值得学习
export const LEARN_THRESHOLD = 0.55;

// 每人最多存储的 descriptor 数量（防止数据过大）
export const MAX_DESCRIPTORS_PER_PERSON = 5;

// 扫描间隔（毫秒）
export const SCAN_INTERVAL_MS = 1400;

// 通知冷却时间（毫秒）
export const NOTIFICATION_COOLDOWN_MS = 15000;

// 陌生人提示冷却时间（毫秒）
export const STRANGER_COOLDOWN_MS = 30000;

// 在场超时：一个人多久没被检测到就视为"离开"（毫秒）
export const PRESENCE_TIMEOUT_MS = 8000;

// Webhook 推送超时（毫秒）
export const WEBHOOK_TIMEOUT_MS = 8000;

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
export const PRESENCE_REMINDER_TYPE = 'visual'; // 视觉提示

// 远程监控
export const REMOTE_STREAM_SERVER_PORT = 3001;
export const ACCESS_CODE_LENGTH = 6;
export const ACCESS_CODE_EXPIRY_HOURS = 24;
export const WEBRTC_STUN_SERVERS = [
  'stun:stun.l.google.com:19302'
];
