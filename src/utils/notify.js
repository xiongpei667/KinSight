import { WEBHOOK_TIMEOUT_MS } from './constants';

/**
 * 远程守护推送：由用户自己的浏览器直接 POST 到其配置的 webhook URL。
 * 我们不引入任何后端，所有数据仅发往用户填写的地址。
 *
 * 支持的事件类型：recognized（识别到已知人员）/ stranger（陌生人）/ sos（一键求助）
 */

function isEnabled(settings, type) {
  const events = settings?.webhook?.events || {};
  return Boolean(events[type]);
}

/**
 * 推送一个事件到远程守护 webhook。
 * 尽力而为：失败只记录到控制台，不抛错，不阻塞 UI。
 * @param {object} settings - app 设置
 * @param {{ type: string, name?: string, relation?: string, snapshotImage?: string|null, timestamp?: number }} event
 * @returns {Promise<{ status: 'ok' | 'failed', timestamp: number }>}
 */
export async function pushEvent(settings, { type, name, relation, snapshotImage, timestamp }) {
  const webhook = settings?.webhook;
  const url = (webhook?.url || '').trim();
  if (!url) return { status: 'skipped', timestamp: timestamp ?? Date.now() }; // 未配置 webhook
  if (!isEnabled(settings, type)) return { status: 'disabled', timestamp: timestamp ?? Date.now() }; // 该事件未开启

  const pushTime = timestamp ?? Date.now();
  const body = {
    event: type,
    device: 'KinSight',
    timestamp: pushTime,
    name: name ?? null,
    relation: relation ?? null,
  };
  // 默认附带抓拍图片，让守护方"看到"谁来了；可由用户关闭
  if (webhook.includeImage && snapshotImage) {
    body.image = snapshotImage;
  }

  let status = 'ok';
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
  } catch (e) {
    status = 'failed';
    // 网络错误 / CORS / 超时均静默处理，避免打扰被守护人
    console.warn('[KinSight] webhook push failed:', e);
  }

  return { status, timestamp: pushTime };
}

/**
 * 记录推送历史条目（调用方应调用此函数来持久化历史）
 * @param {object} settings - app 设置（会被修改，调用方需保存）
 * @param {{ type, name, status, timestamp, url }} entry
 */
export function addPushHistory(settings, entry) {
  const history = settings?.pushHistory || [];
  const newEntry = {
    id: `${entry.timestamp}-${entry.type}`,
    ...entry,
  };
  settings.pushHistory = [newEntry, ...history].slice(0, 100);
}

/**
 * 测试 webhook 连通性，返回结果供"测试"按钮显示状态。
 * @returns {Promise<{ ok: boolean, status?: number }>}
 */
export async function testWebhook(settings) {
  const url = (settings?.webhook?.url || '').trim();
  if (!url) return { ok: false };

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'test',
        device: 'KinSight',
        timestamp: Date.now(),
        message: 'KinSight webhook test',
      }),
      signal: AbortSignal.timeout(WEBHOOK_TIMEOUT_MS),
    });
    // 2xx 视为成功；许多 webhook 服务会返回 200 之外的值（如 Telegram 返回 200+body.ok）
    return { ok: res.ok, status: res.status };
  } catch (e) {
    console.warn('[KinSight] webhook test failed:', e);
    return { ok: false };
  }
}
