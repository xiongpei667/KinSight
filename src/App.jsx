import { useState, useCallback, useEffect } from 'react';
import { ShieldAlert, Bell, Activity, Users, History, Settings, Languages } from 'lucide-react';
import CameraView from './components/CameraView';
import RegisterForm from './components/RegisterForm';
import RecognizedAlert from './components/RecognizedAlert';
import FamilyTree from './components/FamilyTree';
import PersonDetailModal from "./components/PersonDetailModal";
import StatsPanel from "./components/StatsPanel";
import PeoplePanel from "./components/PeoplePanel";
import TimelinePanel from './components/TimelinePanel';
import useFaceRecognition from './hooks/useFaceRecognition';
import { useLocalStorage } from './hooks/useLocalStorage';
import { makeId } from './utils/storage';
import { createI18n } from './utils/i18n';
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

  const t = createI18n(lang).t;
  const visitors = data.visitors;
  const visits = data.visits;

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

  const handleRecognized = useCallback((visitor, distance, seenAt) => {
    const snapshot = captureFrame();
    setRecognized({ ...visitor, _distance: distance, _seenAt: seenAt });
    addVisit(visitor.id, 'recognized', snapshot);
  }, []);

  const handleUnknownFace = useCallback((face) => {
    setUnknownFace(face);
    addVisit(null, 'stranger', face.image);
  }, []);

  function addVisit(personId, type, snapshotImage) {
    updateData((prev) => ({
      ...prev,
      visits: [{ id: makeId(), personId, type, timestamp: Date.now(), snapshotImage: snapshotImage || null }, ...prev.visits]
    }));
  }

  function addVisitor({ name, relation, note, image, descriptor }) {
    const visitor = { id: makeId(), name, relation, note, image, descriptor, createdAt: Date.now() };
    updateData((prev) => ({
      ...prev,
      visitors: [visitor, ...prev.visitors],
      visits: [{ id: makeId(), personId: visitor.id, type: 'registered', timestamp: Date.now(), snapshotImage: null }, ...prev.visits]
    }));
    setUnknownFace(null);
  }

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
    updateData({ visitors: [], visits: [] });
  }

  const { modelsReady, cameraReady, status, error, modelProgress, videoRef, canvasRef, startCamera } =
    useFaceRecognition({ visitors, onRecognized: handleRecognized, onUnknownFace: handleUnknownFace });

  return (
    <main className="app-shell">
      {/* Header */}
      <header className="hero card">
        <div>
          <p className="eyebrow">KinSight</p>
          <h1>{t('appTitle')}</h1>
          <p>{t('tagline')}</p>
        </div>
        <div className="hero-actions">
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
          <RegisterForm unknownFace={unknownFace} onSave={addVisitor} t={t} />
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
        <section className="card settings-card">
          <div className="section-title"><Settings size={18} /><span>{t('settings')}</span></div>
          <div className="settings-actions">
            <button className="primary" onClick={exportData}><span>{t('exportData')}</span></button>
            <button className="primary" onClick={importData}><span>{t('importData')}</span></button>
            <button className="ghost danger" onClick={clearData}><span>{t('clearData')}</span></button>
          </div>
          <p className="settings-hint">
            {visitors.length} persons · {visits.length} visits · {captureFrame() ? 'camera' : 'no camera'}
          </p>
        </section>
      )}

      {/* Person detail modal */}
      {detailPerson && (
        <PersonDetailModal person={detailPerson} visits={visits} onClose={() => setDetailPerson(null)} t={t} />
      )}

      <FamilyTree visitors={visitors} onRemove={removeVisitor} onDetail={setDetailPerson} t={t} />
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
