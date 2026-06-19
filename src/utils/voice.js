/**
 * 适老化语音播报：基于浏览器原生 SpeechSynthesis API。
 * 按当前语言（zh / en）挑选匹配的语音，清空队列后朗读一次。
 * 无该 API 时静默跳过，不影响主流程。
 */

let voicesCache = null;

function loadVoices() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return [];
  if (!voicesCache || !voicesCache.length) {
    voicesCache = window.speechSynthesis.getVoices() || [];
  }
  return voicesCache;
}

// 部分浏览器（Chrome）需监听 voiceschanged 才能拿到列表
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    voicesCache = window.speechSynthesis.getVoices() || [];
  };
}

function pickVoice(lang) {
  const voices = loadVoices();
  if (!voices.length) return null;
  const prefix = lang === 'zh' ? 'zh' : 'en';
  // 优先精确匹配，其次前缀匹配，最后任意
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith(prefix)) ||
    voices.find((v) => v.lang?.toLowerCase().startsWith('zh')) ||
    voices[0]
  );
}

/**
 * 朗读一段文本。
 * @param {string} text - 要朗读的内容
 * @param {string} lang - 'zh' | 'en'
 */
export function speak(text, lang = 'zh') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window) || !text) return;
  try {
    window.speechSynthesis.cancel(); // 清空队列，避免堆积
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang === 'zh' ? 'zh-CN' : 'en-US';
    const voice = pickVoice(lang);
    if (voice) utter.voice = voice;
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.speak(utter);
  } catch (e) {
    console.warn('[KinSight] voice speak failed:', e);
  }
}

/**
 * 停止当前播报。
 */
export function stopSpeaking() {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}
