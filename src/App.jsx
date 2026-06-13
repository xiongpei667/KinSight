import { useState, useCallback, useEffect } from 'react';
import { ShieldAlert, Bell, Activity, Users, History, Settings, Languages } from 'lucide-react';
import CameraView from './components/CameraView';
import RegisterForm from './components/RegisterForm';
import RecognizedAlert from './components/RecognizedAlert';
import FamilyTree from './components/FamilyTree';
import useFaceRecognition from './hooks/useFaceRecognition';
import { useLocalStorage } from './hooks/useLocalStorage';
import { makeId, formatTime } from './utils/storage';
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

  const t = createI18n(lang).t;
  const visitors = data.visitors;
  const visits = data.visits;

  // Hide recognized alert after 5s
  useEffect(() => {
    if (!recognized) return;
    const timer = setTimeout(() => setRecognized(null), 5000);
    return () => clearTimeout(timer);
  }, [recognized]);

  const handleRecognized = useCallback((visitor, distance, seenAt) => {
    setRecognized({ ...visitor, _distance: distance, _seenAt: seenAt });
    addVisit(visitor.id, 'recognized');
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
          if (!imported.visitors || !imported.visits) throw new Error('Invalid format');
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
              <Bell size={16} />Enable Notifications
            </button>
          )}
        </div>
      </header>

      {/* Error */}
      {error && <div className="alert"><ShieldAlert size={18} />{error}</div>}

      {/* Model loading progress */}
      {modelProgress && (
        <div className="status-line model-progress">
          <span>{t('modelLoading')} <strong>{modelProgress}</strong></span>
        </div>
      )}

      {/* Recognized alert */}
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
            {tKey === 'monitor' ? '监控' : tKey === 'timeline' ? t('timeline') : tKey === 'people' ? t('people') : tKey === 'stats' ? t('statistics') : t('settings')}
          </button>
        ))}
      </nav>

      {/* Monitor tab */}
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

      {/* Timeline tab */}
      {tab === 'timeline' && <TimelinePanel visits={visits} visitors={visitors} t={t} />}

      {/* People tab */}
      {tab === 'people' && <PeoplePanel visitors={visitors} onEdit={setEditPerson} onRemove={removeVisitor} updateVisitor={updateVisitor} editPerson={editPerson} t={t} />}

      {/* Stats tab */}
      {tab === 'stats' && <StatsPanel visits={visits} visitors={visitors} t={t} />}

      {/* Settings tab */}
      {tab === 'settings' && (
        <section className="card settings-card">
          <div className="section-title"><Settings size={18} /><span>{t('settings')}</span></div>
          <div className="settings-actions">
            <button className="primary" onClick={exportData}><span>{t('exportData')}</span></button>
            <button className="primary" onClick={importData}><span>{t('importData')}</span></button>
            <button className="ghost danger" onClick={clearData}><span>{t('clearData')}</span></button>
          </div>
          <p className="settings-hint">
            {t('settings')} — {visitors.length} persons, {visits.length} visits
          </p>
        </section>
      )}

      {/* FamilyTree always visible */}
      <FamilyTree visitors={visitors} onRemove={removeVisitor} t={t} />
    </main>
  );
}

/* ───── Timeline Panel ───── */
function TimelinePanel({ visits, visitors, t }) {
  const [filter, setFilter] = useState('all'); // all | recognized | stranger

  const getPerson = (personId) => visitors.find((v) => v.id === personId);

  const filtered = visits.filter((v) => {
    if (filter === 'recognized') return v.type === 'recognized' || v.type === 'registered';
    if (filter === 'stranger') return v.type === 'stranger';
    return true;
  });

  return (
    <section className="card timeline-card">
      <div className="section-title"><History size={18} /><span>{t('timeline')}</span></div>
      <div className="filter-bar">
        {['all', 'recognized', 'stranger'].map((f) => (
          <button key={f} className={`ghost ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
            {f === 'all' ? t('allVisits') : f === 'recognized' ? t('recognizedLabel') : t('strangerLabel')}
          </button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="empty">{t('noVisits')}</div>
      ) : (
        <div className="timeline-list">
          {filtered.slice(0, 100).map((visit) => {
            const person = getPerson(visit.personId);
            return (
              <div className="timeline-item" key={visit.id}>
                {person ? (
                  <img className="timeline-avatar" src={person.image} alt={person.name} />
                ) : (
                  <div className="timeline-avatar timeline-avatar-stranger">?</div>
                )}
                <div className="timeline-info">
                  <strong>{person ? `${person.relation} ${person.name}` : t('unknown')}</strong>
                  <span>{formatTime(visit.timestamp)}</span>
                </div>
                {visit.snapshotImage && (
                  <img className="timeline-snapshot" src={visit.snapshotImage} alt="snapshot" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ───── People Panel ───── */
function PeoplePanel({ visitors, onEdit, onRemove, updateVisitor, editPerson, t }) {
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
            <img src={person.image} alt={person.name} />
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

      {/* Edit modal */}
      {editPerson && (
        <EditModal person={editPerson} onSave={updateVisitor} onClose={() => onEdit(null)} t={t} />
      )}
    </section>
  );
}

function EditModal({ person, onSave, onClose, t }) {
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

/* ───── Stats Panel ───── */
function StatsPanel({ visits, visitors, t }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();

  const totalVisits = visits.length;
  const todayVisits = visits.filter((v) => v.timestamp >= todayTs).length;

  // Count per person
  const visitCounts = {};
  for (const v of visits) {
    const key = v.personId || '__stranger__';
    if (!visitCounts[key]) visitCounts[key] = { count: 0, lastSeen: 0 };
    visitCounts[key].count += 1;
    if (v.timestamp > visitCounts[key].lastSeen) visitCounts[key].lastSeen = v.timestamp;
  }

  const ranking = Object.entries(visitCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 10);

  return (
    <section className="card stats-card">
      <div className="section-title"><Activity size={18} /><span>{t('statistics')}</span></div>
      <div className="stats-grid">
        <div className="stat-box">
          <strong>{totalVisits}</strong>
          <span>{t('totalVisits')}</span>
        </div>
        <div className="stat-box">
          <strong>{todayVisits}</strong>
          <span>{t('todayVisits')}</span>
        </div>
      </div>
      <h4 className="stats-subtitle">{t('visitRanking')}</h4>
      <div className="ranking-list">
        {ranking.map(([personId, stats]) => {
          const person = visitors.find((v) => v.id === personId);
          return (
            <div className="ranking-item" key={personId}>
              <span className="rank-name">
                {person ? `${person.relation} ${person.name}` : t('unknown')}
              </span>
              <span className="rank-count">{stats.count} {t('count')}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
