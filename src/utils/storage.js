import { STORAGE_KEY } from './constants';

/**
 * 场景模式：elderly（老人居家）、women（女性独居）、kindergarten（幼儿园接送）、general（通用）
 */
export const SCENARIOS = {
  elderly: {
    id: 'elderly',
    labelZh: '老人居家',
    labelEn: 'Elderly at home',
    icon: '👴',
    descriptionZh: '大字号 + 语音播报，适合独居老人',
    descriptionEn: 'Large font + voice announcement, suitable for elderly living alone',
    defaults: {
      accessibility: { largeFont: true, voiceAnnounce: true },
      webhook: {
        events: { recognized: true, stranger: true, sos: true },
        includeImage: true,
      },
    },
  },
  women: {
    id: 'women',
    labelZh: '女性独居',
    labelEn: 'Women living alone',
    icon: '👩',
    descriptionZh: '陌生人预警 + 一键求助，适合独居女性',
    descriptionEn: 'Stranger alert + SOS, suitable for women living alone',
    defaults: {
      accessibility: { largeFont: false, voiceAnnounce: true },
      webhook: {
        events: { recognized: false, stranger: true, sos: true },
        includeImage: true,
      },
    },
  },
  kindergarten: {
    id: 'kindergarten',
    labelZh: '幼儿园接送',
    labelEn: 'Kindergarten pickup',
    icon: '🏫',
    descriptionZh: '家长识别 + 陌生人预警，适合幼儿园/托管机构',
    descriptionEn: 'Parent recognition + stranger alert, suitable for kindergartens',
    defaults: {
      accessibility: { largeFont: false, voiceAnnounce: false },
      webhook: {
        events: { recognized: true, stranger: true, sos: false },
        includeImage: true,
      },
    },
  },
  general: {
    id: 'general',
    labelZh: '通用',
    labelEn: 'General',
    icon: '🏠',
    descriptionZh: '默认设置，适合家庭日常使用',
    descriptionEn: 'Default settings, suitable for daily family use',
    defaults: {
      accessibility: { largeFont: false, voiceAnnounce: false },
      webhook: {
        events: { recognized: true, stranger: true, sos: true },
        includeImage: true,
      },
    },
  },
};

/**
 * 默认设置：远程守护 webhook + 适老化（大字号 / 语音播报）
 */
export function defaultSettings() {
  return {
    scenario: 'general', // 场景模式
    webhook: {
      url: '',
      events: { recognized: true, stranger: true, sos: true },
      includeImage: true,
      lastTestAt: null,
      lastTestStatus: null, // 'ok' | 'fail' | null
    },
    accessibility: { largeFont: false, voiceAnnounce: false },
    pushHistory: [], // 推送历史: { id, type, name, status, timestamp, url }
  };
}

/**
 * 合并已保存的 settings，补齐新增字段（向前兼容旧版本）
 */
function migrateSettings(saved) {
  const def = defaultSettings();
  if (!saved || typeof saved !== 'object') return def;
  return {
    webhook: {
      ...def.webhook,
      ...(saved.webhook || {}),
      events: { ...def.webhook.events, ...((saved.webhook && saved.webhook.events) || {}) },
    },
    accessibility: { ...def.accessibility, ...(saved.accessibility || {}) },
  };
}

/**
 * 将原始 descriptor 数据转为 Float32Array
 * 兼容旧版单 descriptor 和新版 descriptors 数组
 */
function toFloat32Array(raw) {
  if (!raw) return null;
  return new Float32Array(raw);
}

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visitors: [], visits: [], settings: defaultSettings() };
    const parsed = JSON.parse(raw);
    // 兼容旧数据：将旧的 descriptor(单个) 迁移为 descriptors(数组)
    const visitors = (parsed.visitors ?? parsed ?? []).map((v) => {
      // 新版数据：descriptors 数组
      if (v.descriptors) {
        return {
          ...v,
          descriptors: v.descriptors.map((d) => toFloat32Array(d)).filter(Boolean),
          // 清理旧字段
          descriptor: undefined,
        };
      }
      // 旧版数据：单个 descriptor → 迁移为 descriptors 数组
      if (v.descriptor) {
        const arr = toFloat32Array(v.descriptor);
        return {
          ...v,
          descriptors: arr ? [arr] : [],
          descriptor: undefined,
        };
      }
      return { ...v, descriptors: [] };
    });
    return {
      visitors,
      visits: parsed.visits ?? [],
      settings: migrateSettings(parsed.settings),
    };
  } catch {
    return { visitors: [], visits: [], settings: defaultSettings() };
  }
}

export function saveData(data) {
  // 序列化前将 Float32Array 转为普通数组，否则 JSON.stringify 会输出对象格式
  const serializable = {
    ...data,
    visitors: data.visitors.map((v) => ({
      ...v,
      descriptors: (v.descriptors || []).map((d) => (d ? Array.from(d) : null)).filter(Boolean),
      // 确保不保存旧的 descriptor 字段
      descriptor: undefined,
    })),
    settings: data.settings || defaultSettings(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
}

let idCounter = 0;
export function makeId() {
  idCounter += 1;
  return `${Date.now()}-${idCounter}-${Math.random().toString(16).slice(2)}`;
}

export function formatTime(timestamp, locale = 'zh-CN') {
  return new Intl.DateTimeFormat(locale, {
    month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
  }).format(new Date(timestamp));
}

export function formatDate(timestamp, locale = 'zh-CN') {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short'
  }).format(new Date(timestamp));
}

/**
 * 计算两个 descriptor 之间的欧氏距离
 */
export function descriptorDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * 将一个 descriptor 与某人的所有 descriptors 比较，返回最小距离
 * 用于多角度匹配：只要和任一角度的 descriptor 足够接近就认为是同一人
 */
export function bestDescriptorMatch(descriptor, visitorDescriptors) {
  if (!descriptor || !visitorDescriptors || !visitorDescriptors.length) return Infinity;
  let minDist = Infinity;
  for (const stored of visitorDescriptors) {
    const dist = descriptorDistance(descriptor, stored);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}
