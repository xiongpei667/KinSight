import { STORAGE_KEY } from './constants';

export function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { visitors: [], visits: [] };
    const parsed = JSON.parse(raw);
    return {
      visitors: parsed.visitors ?? parsed ?? [],
      visits: parsed.visits ?? []
    };
  } catch {
    return { visitors: [], visits: [] };
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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

export function descriptorDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let sum = 0;
  for (let i = 0; i < a.length; i += 1) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
