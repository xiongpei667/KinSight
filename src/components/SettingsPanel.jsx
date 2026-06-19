import { useState } from 'react';
import { Settings, Webhook, Accessibility, Database, Check, X, Loader, Home } from 'lucide-react';
import { testWebhook } from '../utils/notify';
import { SCENARIOS } from '../utils/storage';

/**
 * 设置面板：四段
 *  1. 场景模式（老人居家 / 女性独居 / 幼儿园接送 / 通用）
 *  2. 远程守护（webhook 推送 + 事件开关 + 测试）
 *  3. 适老化（大字号 / 语音播报）
 *  4. 数据（导出 / 导入 / 清除）
 *
 * 通过 updateSettings(partial) 上报变更，settings 形状见 defaultSettings()。
 */
export default function SettingsPanel({
  settings,
  updateSettings,
  exportData,
  importData,
  clearData,
  visitorsCount,
  visitsCount,
  cameraReady,
  t,
  lang,
}) {
  const [testState, setTestState] = useState(null); // null | 'pending' | 'ok' | 'fail'

  const wh = settings?.webhook || {};
  const acc = settings?.accessibility || {};
  const currentScenario = settings?.scenario || 'general';

  // ── webhook 字段更新 ──
  function setWebhook(patch) {
    updateSettings({ webhook: { ...wh, ...patch } });
  }
  function setEvent(eventKey, enabled) {
    setWebhook({ events: { ...(wh.events || {}), [eventKey]: enabled } });
  }

  // ── 适老化字段更新 ──
  function setAccessibility(patch) {
    updateSettings({ accessibility: { ...acc, ...patch } });
  }

  // ── 应用场景模式 ──
  function applyScenario(scenarioId) {
    const scenario = SCENARIOS[scenarioId];
    if (!scenario) return;
    // 合并默认值：保留用户已设置的 webhook URL
    updateSettings({
      scenario: scenarioId,
      accessibility: scenario.defaults.accessibility,
      webhook: {
        ...wh,
        events: scenario.defaults.webhook.events,
        includeImage: scenario.defaults.webhook.includeImage,
      },
    });
  }

  async function handleTest() {
    if (!(wh.url || '').trim()) {
      setTestState('fail');
      return;
    }
    setTestState('pending');
    const result = await testWebhook(settings);
    const status = result.ok ? 'ok' : 'fail';
    setTestState(status);
    // 持久化最近一次测试结果
    setWebhook({ lastTestAt: Date.now(), lastTestStatus: status });
  }

  const scenarioKeys = Object.keys(SCENARIOS);
  const langKey = lang === 'zh' ? 'labelZh' : 'labelEn';
  const descKey = lang === 'zh' ? 'descriptionZh' : 'descriptionEn';

  return (
    <section className="card settings-card">
      <div className="section-title"><Settings size={18} /><span>{t('settings')}</span></div>

      {/* ── 场景模式 ── */}
      <div className="settings-section">
        <div className="settings-section-head">
          <Home size={16} />
          <strong>{t('scenario')}</strong>
        </div>
        <p className="settings-section-hint">{t('scenarioHint')}</p>
        <div className="scenario-grid">
          {scenarioKeys.map((key) => {
            const scenario = SCENARIOS[key];
            const isActive = currentScenario === scenario.id;
            return (
              <button
                key={scenario.id}
                className={`scenario-card ${isActive ? 'active' : ''}`}
                onClick={() => applyScenario(scenario.id)}
              >
                <span className="scenario-icon">{scenario.icon}</span>
                <span className="scenario-label">{scenario[langKey]}</span>
                <span className="scenario-desc">{scenario[descKey]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── 远程守护 ── */}
      <div className="settings-section">
        <div className="settings-section-head">
          <Webhook size={16} />
          <strong>{t('remoteGuardian')}</strong>
          {testState && (
            <span className={`webhook-status ${testState}`}>
              {testState === 'pending' && <Loader size={13} className="spin" />}
              {testState === 'ok' && <Check size={13} />}
              {testState === 'fail' && <X size={13} />}
              {testState === 'pending' ? t('testPending') : testState === 'ok' ? t('testOk') : t('testFail')}
            </span>
          )}
        </div>
        <p className="settings-section-hint">{t('remoteGuardianHint')}</p>

        <label className="settings-field">
          <span>{t('webhookUrl')}</span>
          <input
            type="url"
            value={wh.url || ''}
            placeholder={t('webhookUrlPlaceholder')}
            onChange={(e) => setWebhook({ url: e.target.value })}
          />
        </label>

        <div className="settings-rows">
          <ToggleRow
            checked={!!wh.events?.recognized}
            onChange={(v) => setEvent('recognized', v)}
            label={t('eventRecognized')}
          />
          <ToggleRow
            checked={!!wh.events?.stranger}
            onChange={(v) => setEvent('stranger', v)}
            label={t('eventStranger')}
          />
          <ToggleRow
            checked={!!wh.events?.sos}
            onChange={(v) => setEvent('sos', v)}
            label={t('eventSos')}
          />
          <ToggleRow
            checked={!!wh.includeImage}
            onChange={(v) => setWebhook({ includeImage: v })}
            label={t('includeImage')}
            hint={t('includeImageHint')}
          />
        </div>

        <button
          className="ghost settings-test-btn"
          onClick={handleTest}
          disabled={testState === 'pending'}
        >
          {t('testWebhook')}
        </button>
      </div>

      {/* ── 适老化 ── */}
      <div className="settings-section">
        <div className="settings-section-head">
          <Accessibility size={16} />
          <strong>{t('accessibility')}</strong>
        </div>
        <div className="settings-rows">
          <ToggleRow
            checked={!!acc.largeFont}
            onChange={(v) => setAccessibility({ largeFont: v })}
            label={t('largeFont')}
            hint={t('largeFontHint')}
          />
          <ToggleRow
            checked={!!acc.voiceAnnounce}
            onChange={(v) => setAccessibility({ voiceAnnounce: v })}
            label={t('voiceAnnounce')}
            hint={t('voiceAnnounceHint')}
          />
        </div>
      </div>

      {/* ── 数据 ── */}
      <div className="settings-section">
        <div className="settings-section-head">
          <Database size={16} />
          <strong>{t('settings')}</strong>
        </div>
        <div className="settings-actions">
          <button className="primary" onClick={exportData}><span>{t('exportData')}</span></button>
          <button className="primary" onClick={importData}><span>{t('importData')}</span></button>
          <button className="ghost danger" onClick={clearData}><span>{t('clearData')}</span></button>
        </div>
        <p className="settings-hint">
          {visitorsCount} {t('visitor')} · {visitsCount} {t('count')} · {cameraReady ? '📷' : '🚫'}
        </p>
      </div>
    </section>
  );
}

function ToggleRow({ checked, onChange, label, hint }) {
  return (
    <label className="toggle-row">
      <span className="toggle-row-text">
        <span className="toggle-row-label">{label}</span>
        {hint && <span className="toggle-row-hint">{hint}</span>}
      </span>
      <button
        type="button"
        className={`toggle ${checked ? 'on' : ''}`}
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span className="toggle-knob" />
      </button>
    </label>
  );
}
