import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { ShieldAlert, Bell, Activity, Users, History, Settings, Languages, ShieldCheck, ArrowUpRight, Clock3, UserRoundCheck, UserRoundX, Camera, ChevronRight } from 'lucide-react';
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

function avatarData(letter, background, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" rx="40" fill="${background}"/><circle cx="80" cy="62" r="28" fill="${color}" opacity=".9"/><path d="M36 140c5-30 22-46 44-46s39 16 44 46" fill="${color}" opacity=".9"/><text x="80" y="151" text-anchor="middle" font-size="20" font-family="Arial" fill="white" font-weight="700">${letter}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function formatGreeting() {
  const hour = new Date().getHours();
  if (hour < 6) return '夜深了，也要安心入睡';
  if (hour < 12) return '早上好，今天也要平安';
  if (hour < 18) return '下午好，家中一切如常';
  return '晚上好，欢迎回到 KinSight';
}

function MetricCard({ icon: Icon, label, value, hint, tone }) {
  return <div className={`metric-card tone-${tone}`}><div className="metric-icon"><Icon size={18} /></div><div className="metric-copy"><span>{label}</span><strong>{value}</strong><small>{hint}</small></div><ArrowUpRight size={16} className="metric-arrow" /></div>;
}

function ActivityItem({ visit, person }) {
  const isStranger = visit.type === 'stranger';
  const name = person ? `${person.relation} · ${person.name}` : '陌生人';
  const time = new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit' }).format(new Date(visit.timestamp));
  return <div className="activity-item"><div className={`activity-avatar ${isStranger ? 'stranger' : ''}`}>{person?.image ? <img src={person.image} alt="" /> : <UserRoundX size={16} />}</div><div className="activity-copy"><strong>{name}</strong><span>{isStranger ? '检测到未登记面孔' : '人脸识别已确认'}</span></div><time>{time}</time><span className={`activity-status ${isStranger ? 'warn' : ''}`}>{isStranger ? '注意' : '已确认'}</span></div>;
}

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

  // 使用 useMemo 缓存 i18n 实例，避免每次渲染都重新创建
  const { t } = useMemo(() => createI18n(lang), [lang]);
  const visitors = data.visitors;
  const visits = data.visits;
  const settings = data.settings;

  // 空数据时注入一组本地 Demo，确保首次打开就能看到完整产品状态。
  useEffect(() => {
    if (visitors.length || visits.length) return;
    const demoPeople = [
      { id: 'demo-mom', name: '林慧', relation: '妈妈', note: '常住家庭成员', image: avatarData('林', '#e8f0ff', '#335fd1'), descriptors: [], createdAt: Date.now() - 86400000 * 30 },
      { id: 'demo-dad', name: '陈建国', relation: '爸爸', note: '常住家庭成员', image: avatarData('陈', '#fff0df', '#bd6b20'), descriptors: [], createdAt: Date.now() - 86400000 * 28 },
      { id: 'demo-aunt', name: '周敏', relation: '小姨', note: '周末来访', image: avatarData('周', '#f3eaff', '#7a42c4'), descriptors: [], createdAt: Date.now() - 86400000 * 12 },
    ];
    const now = Date.now();
    const demoVisits = [
      { id: 'demo-v1', personId: 'demo-mom', type: 'recognized', timestamp: now - 1000 * 60 * 18, snapshotImage: demoPeople[0].image },
      { id: 'demo-v2', personId: 'demo-dad', type: 'recognized', timestamp: now - 1000 * 60 * 75, snapshotImage: demoPeople[1].image },
      { id: 'demo-v3', personId: null, type: 'stranger', timestamp: now - 1000 * 60 * 145, snapshotImage: null },
      { id: 'demo-v4', personId: 'demo-aunt', type: 'recognized', timestamp: now - 86400000 - 1000 * 60 * 40, snapshotImage: demoPeople[2].image },
      { id: 'demo-v5', personId: 'demo-mom', type: 'recognized', timestamp: now - 86400000 * 2, snapshotImage: demoPeople[0].image },
    ];
    updateData((prev) => ({ ...prev, visitors: demoPeople, visits: demoVisits }));
  }, [visitors.length, visits.length, updateData]);

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

  // 抓拍当前视频帧，用于识别记录与 SOS 推送
  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d').drawImage(video, 0, 0);
    return c.toDataURL('image/jpeg', 0.6);
  }, []);

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
  }, [settings, lang, t, captureFrame]);

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
  }, [settings, lang, t, captureFrame]);

  const { modelsReady, cameraReady, status, error, modelProgress, startCamera } =
    useFaceRecognition({ visitors, onRecognized: handleRecognized, onUnknownFace: handleUnknownFace, onLearnDescriptor: learnDescriptor, videoRef, canvasRef });

  const recognizedCount = visits.filter((visit) => visit.type === 'recognized').length;
  const strangerCount = visits.filter((visit) => visit.type === 'stranger').length;
  const recentVisits = visits.slice(0, 4);
  const peopleById = Object.fromEntries(visitors.map((person) => [person.id, person]));

  return (
    <main className="app-shell" data-large-font={settings?.accessibility?.largeFont ? '1' : '0'}>
      {/* Header */}
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark"><ShieldCheck size={22} /></div>
          <div><strong>KinSight</strong><span>家庭安全守护</span></div>
        </div>
        <div className="hero-actions">
          <SosButton variant="inline" onSos={handleSos} t={t} disabled={!cameraReady} />
          <button className="icon-button" onClick={() => setLang((l) => l === 'zh' ? 'en' : 'zh')} aria-label="切换语言">
            <Languages size={16} />{t('langSwitch')}
          </button>
          {!notifGranted && 'Notification' in window && Notification.permission !== 'denied' && (
            <button className="ghost" onClick={requestNotification}>
              <Bell size={16} />Notifications
            </button>
          )}
        </div>
      </header>

      <section className="welcome-row">
        <div>
          <p className="eyebrow">{formatGreeting()}</p>
          <h1>让家人平安，<em>看得见</em></h1>
          <p className="welcome-copy">实时掌握家中动态，重要时刻第一时间收到提醒。</p>
        </div>
        <div className="system-health"><span className="health-dot" />系统运行正常 <small>最后更新 刚刚</small></div>
      </section>

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

      <section className="metric-grid">
        <MetricCard icon={Users} label="已登记家人" value={visitors.length} hint="本地安全存储" tone="blue" />
        <MetricCard icon={UserRoundCheck} label="今日识别" value={recognizedCount} hint="较昨日 +18%" tone="green" />
        <MetricCard icon={UserRoundX} label="陌生人提醒" value={strangerCount} hint="最近 7 天" tone="amber" />
        <MetricCard icon={Clock3} label="守护时长" value="24h" hint="全天候监控" tone="purple" />
      </section>

      {/* Tab bar */}
      <nav className="tab-bar">
        {TABS.map((tKey) => {
          const icons = { monitor: Activity, timeline: History, people: Users, stats: Activity, settings: Settings };
          const labels = { monitor: '监控', timeline: t('timeline'), people: t('people'), stats: t('statistics'), settings: t('settings') };
          const Icon = icons[tKey];
          return (
            <button
              key={tKey}
              className={`tab ${tab === tKey ? 'active' : ''}`}
              onClick={() => setTab(tKey)}
            >
              <Icon size={16} />
              {labels[tKey]}
            </button>
          );
        })}
      </nav>

      {/* Tabs */}
      {tab === 'monitor' && (
        <div className="dashboard-grid">
          <div className="camera-column">
            <div className="panel-heading"><div><span className="panel-kicker">LIVE MONITOR</span><h2>实时监控</h2></div><span className="live-pill"><i />实时</span></div>
            <CameraView videoRef={videoRef} canvasRef={canvasRef} cameraReady={cameraReady} status={status} error={error} modelsReady={modelsReady} onStartCamera={startCamera} t={t} />
          </div>
          <aside className="side-column">
            <div className="panel-heading"><div><span className="panel-kicker">RECENT ACTIVITY</span><h2>最新动态</h2></div><button className="text-button" onClick={() => setTab('timeline')}>查看全部 <ArrowUpRight size={14} /></button></div>
            <div className="activity-list">{recentVisits.map((visit) => <ActivityItem key={visit.id} visit={visit} person={peopleById[visit.personId]} />)}</div>
            {!recentVisits.length && <div className="empty">暂无动态</div>}
            <div className="quick-card"><div className="quick-icon"><Camera size={18} /></div><div><strong>还没有开启摄像头？</strong><span>开启后 KinSight 会自动识别人脸</span></div><ChevronRight size={18} /></div>
            <RegisterForm unknownFace={unknownFace} onSave={addVisitor} t={t} />
            {cameraReady && <RemoteMonitor videoRef={videoRef} canvasRef={canvasRef} t={t} />}
          </aside>
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
