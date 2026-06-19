import { useState, useCallback, useEffect, useRef } from 'react';
import { ShieldAlert, Bell, Activity, Users, History, Settings, Languages } from 'lucide-react';
import CameraView from './components/CameraView';
import RegisterForm from './components/RegisterForm';
import RecognizedAlert from './components/RecognizedAlert';
import FamilyTree from './components/FamilyTree';
import PersonDetailModal from "./components/PersonDetailModal";
import StatsPanel from "./components/StatsPanel";
import PeoplePanel from './components/PeoplePanel';
import TimelinePanel from './components/TimelinePanel';
import SettingsPanel from './components/SettingsPanel';
import SosButton from './components/SosButton';
import PresenceIndicator from './components/PresenceIndicator';
import RemoteMonitor from './components/RemoteMonitor';
import useFaceRecognition from './hooks/useFaceRecognition';
import { useLocalStorage } from './hooks/useLocalStorage';
import { makeId } from './utils/storage';
import { createI18n } from './utils/i18n';
import { pushEvent, addPushHistory } from './utils/notify';
import { speak } from './utils/voice';
import './App.css';

const TABS = ['monitor', 'timeline', 'people', 'stats', 'settings'];

export default function App() {
  const [lang, setLang] = useState('zh');
  const [tab, setTab] = useState('monitor');
  const [data, updateData] = useLocalStorage();
  const [recognized, setRecognized] = useState(null);
  const [unknownFace, setUnknownFace] = useState(null);
  const [notifGranted, setNotifGranted] = useState(false);
  const [editPerson, setEditPerson] = useState(null);
  const [detailPerson, setDetailPerson] = useState(null);
  const [presentPeople, setPresentPeople] = useState([]);

  // 摄像头 video 元素引用：用于 SOS / 识别时抓拍当前帧
  const videoRef = useRef(null);
  // Canvas 元素引用：用于绘制人脸检测框
  const canvasRef = useRef(null);

  const t = createI18n(lang).t;
  const visitors = data.visitors;
  const visits = data.visits;
  const settings = data.settings;

  // 统一更新 settings 字段（与 visitors/visits 共用同一份持久化数据）
  const updateSettings = useCallback((partial) => {
    updateData((prev) => ({ ...prev, settings: { ...(prev.settings || {}), ...partial } }));
  }, [updateData]);

  // Hide recognized alert after 5s
  useEffect(() => {
    if (!recognized) return;
    const timer = setTimeout(() => setRecognized(null), 5000);
    return () => clearTimeout(timer);
  }, [recognized]);

  function captureFrame() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    return c.toDataURL('image/jpeg', 0.6);
  }

  const handleRecognized = useCallback(async (visitor, distance, seenAt, type = 'arrival') => {
    const snapshot = captureFrame();
    setRecognized({ ...visitor, _distance: distance, _seenAt: seenAt });

    // 处理在场状态
    if (type === 'arrival') {
      // 首次到达
      setPresentPeople(prev => {
        const exists = prev.find(p => p.id === visitor.id);
        if (!exists) {
          return [...prev, { ...visitor, lastSeen: seenAt }];
        }
        return prev;
      });
    }

    addVisit(visitor.id, 'recognized', snapshot);
    // 远程守护推送 + 语音播报
    const result = await pushEvent(settings, {
      type: 'recognized',
      name: visitor.name,
      relation: visitor.relation,
      snapshotImage: snapshot,
      timestamp: seenAt,
    });
    if (result.status === 'ok' || result.status === 'failed') {
      addPushHistory(settings, { type: 'recognized', name: visitor.name, status: result.status, timestamp: result.timestamp });
    }
    if (settings?.accessibility?.voiceAnnounce && type === 'arrival') {
      speak(`${visitor.relation} ${visitor.name} ${t('voiceRecognized')}`, lang);
    }
  }, [settings, lang, t]);

  const handleUnknownFace = useCallback(async (face) => {
    setUnknownFace(face);
    addVisit(null, 'stranger', face.image);
    // 陌生人：远程推送 + 语音
    const result = await pushEvent(settings, {
      type: 'stranger',
      snapshotImage: face.image,
      timestamp: face.seenAt,
    });
    if (result.status === 'ok' || result.status === 'failed') {
      addPushHistory(settings, { type: 'stranger', name: null, status: result.status, timestamp: result.timestamp });
    }
    if (settings?.accessibility?.voiceAnnounce) {
      speak(t('voiceStranger'), lang);
    }
  }, [settings, lang, t]);

  function addVisit(personId, type, snapshotImage) {
    updateData((prev) => ({
      ...prev,
      visits: [{ id: makeId(), personId, type, timestamp: Date.now(), snapshotImage: snapshotImage || null }, ...prev.visits]
    }));
  }

  function addVisitor({ name, relation, note, image, descriptor }) {
    // 将单个 descriptor 存为 descriptors 数组，支持多角度
    const visitor = { id: makeId(), name, relation, note, image, descriptors: descriptor ? [descriptor] : [], createdAt: Date.now() };
    updateData((prev) => ({
      ...prev,
      visitors: [visitor, ...prev.visitors],
      visits: [{ id: makeId(), personId: visitor.id, type: 'registered', timestamp: Date.now(), snapshotImage: null }, ...prev.visits]
    }));
    setUnknownFace(null);
  }

  // 自动学习新角度：将新的 descriptor 加入已有人员的 descriptors 库
  function learnDescriptor(visitorId, newDescriptor) {
    updateData((prev) => ({
      ...prev,
      visitors: prev.visitors.map((v) => {
        if (v.id !== visitorId) return v;
        const descriptors = v.descriptors || [];
        // 防止重复添加过于相似的 descriptor（距离很近说明角度差不多）
        const isDuplicate = descriptors.some((d) => {
          let sum = 0;
          for (let i = 0; i < d.length; i++) { const diff = d[i] - newDescriptor[i]; sum += diff * diff; }
          return Math.sqrt(sum) < 0.3; // 距离太近说明角度几乎一样，不需要存储
        });
        if (isDuplicate) return v;
        return { ...v, descriptors: [...descriptors, newDescriptor] };
      }),
    }));
  }

  // 处理人员离开
  const handleDeparture = useCallback((person) => {
    setPresentPeople(prev => prev.filter(p => p.id !== person.id));
    if (settings?.accessibility?.voiceAnnounce) {
      speak(`${person.relation} ${person.name} 离开了`, lang);
    }
  }, [settings, lang]);

  function updateVisitor(id, updates) {
    updateData((prev) => ({
      ...prev,
      visitors: prev.visitors.map((v) => v.id === id ? { ...v, ...updates } : v)
    }));
    setEditPerson(null);
  }

  function removeVisitor(id) {
    const name = visitors.find((v) => v.id === id)?.name;
    if (!window.confirm(t('confirmRemove', { name }))) return;
    updateData((prev) => ({
      ...prev,
      visitors: prev.visitors.filter((v) => v.id !== id)
    }));
  }

  function requestNotification() {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setNotifGranted(true);
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then((r) => setNotifGranted(r === 'granted'));
    }
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinsight-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(ev.target.result);
          if (!imported.visitors || !imported.visits) throw new Error('Invalid');
          updateData(imported);
          alert('Import successful!');
        } catch {
          alert('Invalid backup file.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function clearData() {
    if (!window.confirm(t('clearConfirm'))) return;
    updateData((prev) => ({ visitors: [], visits: [], settings: prev.settings || {} }));
  }

  // ── 一键求助 ──
  // 确认后抓拍当前画面，推送给守护方，并记录一条 sos 访客记录；
  // 同时触发本地通知与语音，确保被守护人得到反馈。
  const handleSos = useCallback(async () => {
    if (!window.confirm(t('sosConfirm'))) return;
    const snapshot = captureFrame();
    const timestamp = Date.now();

    // 推送远程守护（按 settings.webhook.events.sos 开关）
    pushEvent(settings, { type: 'sos', snapshotImage: snapshot, timestamp });

    // 记录到访客时间线
    addVisit(null, 'sos', snapshot);

    // 本地反馈：语音 + 通知
    if (settings?.accessibility?.voiceAnnounce) {
      speak(t('sosVoice'), lang);
    }
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(t('sos'), { body: t('sosSent') });
      } catch {
        /* noop */
      }
    }
  }, [settings, lang, t]);

  const { modelsReady, cameraReady, status, error, modelProgress, startCamera } =
    useFaceRecognition({ visitors, onRecognized: handleRecognized, onUnknownFace: handleUnknownFace, onLearnDescriptor: learnDescriptor, videoRef, canvasRef });

  return (
    <main className="app-shell" data-large-font={settings?.accessibility?.largeFont ? '1' : '0'}>
      {/* Header */}
      <header className="hero card">
        <div>
          <p className="eyebrow">KinSight</p>
          <h1>{t('appTitle')}</h1>
          <p>{t('tagline')}</p>
        </div>
        <div className="hero-actions">
          <SosButton variant="inline" onSos={handleSos} t={t} disabled={!cameraReady} />
          <button className="ghost lang-btn" onClick={() => setLang((l) => l === 'zh' ? 'en' : 'zh')}>
            <Languages size={16} />{t('langSwitch')}
          </button>
          {!notifGranted && 'Notification' in window && Notification.permission !== 'denied' && (
            <button className="ghost" onClick={requestNotification}>
              <Bell size={16} />Notifications
            </button>
          )}
        </div>
      </header>

      {error && <div className="alert"><ShieldAlert size={18} />{error}</div>}

      {modelProgress && (
        <div className="status-line model-progress">
          <span>{t('modelLoading')} <strong>{modelProgress}</strong></span>
        </div>
      )}

      {recognized && <RecognizedAlert person={recognized} t={t} />}

      {/* 在场状态指示器 */}
      {presentPeople.length > 0 && (
        <PresenceIndicator
          presentPeople={presentPeople}
          onDeparture={handleDeparture}
        />
      )}

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map((tKey) => (
          <button
            key={tKey}
            className={`tab ${tab === tKey ? 'active' : ''}`}
            onClick={() => setTab(tKey)}
          >
            {tKey === 'monitor' && <Activity size={16} />}
            {tKey === 'timeline' && <History size={16} />}
            {tKey === 'people' && <Users size={16} />}
            {tKey === 'stats' && <Activity size={16} />}
            {tKey === 'settings' && <Settings size={16} />}
            {tKey === 'monitor' ? 'Monitor' : tKey === 'timeline' ? t('timeline') : tKey === 'people' ? t('people') : tKey === 'stats' ? t('statistics') : t('settings')}
          </button>
        ))}
      </nav>

      {/* Tabs */}
      {tab === 'monitor' && (
        <div className="grid">
          <CameraView
            videoRef={videoRef}
            canvasRef={canvasRef}
            cameraReady={cameraReady}
            status={status}
            error={error}
            modelsReady={modelsReady}
            onStartCamera={startCamera}
            t={t}
          />
          <div>
            <RegisterForm unknownFace={unknownFace} onSave={addVisitor} t={t} />
            {cameraReady && (
              <RemoteMonitor
                videoRef={videoRef}
                canvasRef={canvasRef}
                t={t}
              />
            )}
          </div>
        </div>
      )}

      {tab === 'timeline' && (
        <TimelinePanel
          visits={visits}
          visitors={visitors}
          t={t}
        />
      )}

      {tab === 'people' && (
        <PeoplePanel
          visitors={visitors}
          visits={visits}
          onEdit={setEditPerson}
          onRemove={removeVisitor}
          updateVisitor={updateVisitor}
          editPerson={editPerson}
          onDetail={setDetailPerson}
          t={t}
        />
      )}

      {tab === 'stats' && <StatsPanel visits={visits} visitors={visitors} t={t} />}

      {tab === 'settings' && (
        <SettingsPanel
          settings={settings}
          updateSettings={updateSettings}
          exportData={exportData}
          importData={importData}
          clearData={clearData}
          visitorsCount={visitors.length}
          visitsCount={visits.length}
          cameraReady={cameraReady}
          t={t}
          lang={lang}
        />
      )}

      {/* Person detail modal */}
      {detailPerson && (
        <PersonDetailModal person={detailPerson} visits={visits} onClose={() => setDetailPerson(null)} t={t} />
      )}

      <FamilyTree visitors={visitors} onRemove={removeVisitor} onDetail={setDetailPerson} t={t} />

      {/* 移动端浮动 SOS 按钮（始终可见） */}
      <SosButton variant="fab" onSos={handleSos} t={t} disabled={!cameraReady} />
    </main>
  );
}

/* ───── Person Detail Modal (lazy import wrapper) ───── */

/* PeoplePanel extracted to components/PeoplePanel.jsx */
function _PeoplePanel({ visitors, onEdit, onRemove, updateVisitor, editPerson, onDetail, t }) {
  const [search, setSearch] = useState('');

  const filtered = visitors.filter((v) =>
    v.name.includes(search) || v.relation.includes(search)
  );

  return (
    <section className="card people-card">
      <div className="section-title"><Users size={18} /><span>{t('people')}</span></div>
      <input
        className="search-input"
        placeholder={t('searchPlaceholder')}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="people-grid">
        {filtered.map((person) => (
          <div className="person-manage-card" key={person.id}>
            <img src={person.image} alt={person.name} onClick={() => onDetail(person)} style={{ cursor: 'pointer' }} />
            <strong>{person.name}</strong>
            <small>{person.relation}</small>
            {person.note && <span>{person.note}</span>}
            <div className="person-actions">
              <button className="ghost" onClick={() => onEdit(person)}>{t('edit')}</button>
              <button className="ghost" onClick={() => onRemove(person.id)}>{t('removeBtn')}</button>
            </div>
          </div>
        ))}
      </div>
      {filtered.length === 0 && <div className="empty">{t('noVisitors')}</div>}

      {editPerson && (
        <EditModal person={editPerson} onSave={updateVisitor} onClose={() => onEdit(null)} t={t} />
      )}
    </section>
  );
}

/* EditModal extracted */
function _EditModal({ person, onSave, onClose, t }) {
  const [name, setName] = useState(person.name);
  const [relation, setRelation] = useState(person.relation);
  const [note, setNote] = useState(person.note || '');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>{t('edit')}</h3>
        <label>
          {t('nameLabel')}
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label>
          {t('relationLabel')}
          <input value={relation} onChange={(e) => setRelation(e.target.value)} />
        </label>
        <label>
          {t('noteLabel')}
          <input value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <div className="modal-actions">
          <button className="primary" onClick={() => onSave(person.id, { name, relation, note })}>
            {t('saveBtn')}
          </button>
          <button className="ghost" onClick={onClose}>{t('cancel')}</button>
        </div>
      </div>
    </div>
  );
}

/* StatsPanel extracted to components/StatsPanel.jsx */
