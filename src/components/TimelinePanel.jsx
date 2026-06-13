import { useState, useMemo } from 'react';
import { History } from 'lucide-react';
import { formatTime } from '../utils/storage';
import PersonDetailModal from './PersonDetailModal';

export default function TimelinePanel({ visits, visitors, t }) {
  const [filter, setFilter] = useState('all');
  const [detailPerson, setDetailPerson] = useState(null);

  const getPerson = (personId) => visitors.find((v) => v.id === personId);

  const filtered = useMemo(() => {
    return visits.filter((v) => {
      if (filter === 'recognized') return v.type === 'recognized' || v.type === 'registered';
      if (filter === 'stranger') return v.type === 'stranger';
      return true;
    });
  }, [visits, filter]);

  // Group by date for display
  const groups = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterday = today - 86400000;

    const g = {};
    for (const v of filtered.slice(0, 200)) {
      let label;
      if (v.timestamp >= today) {
        label = t.lang === 'zh' ? '今天' : 'Today';
      } else if (v.timestamp >= yesterday) {
        label = t.lang === 'zh' ? '昨天' : 'Yesterday';
      } else {
        label = new Intl.DateTimeFormat(t.lang === 'zh' ? 'zh-CN' : 'en-US', {
          month: 'long', day: 'numeric'
        }).format(new Date(v.timestamp));
      }
      if (!g[label]) g[label] = [];
      g[label].push(v);
    }
    return g;
  }, [filtered, t.lang]);

  return (
    <section className="card timeline-card">
      <div className="section-title">
        <History size={18} /><span>{t('timeline')}</span>
        <small style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
          ({visits.length})
        </small>
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        {['all', 'recognized', 'stranger'].map((f) => {
          const count = f === 'all' ? visits.length
            : f === 'recognized' ? visits.filter(v => v.type !== 'stranger').length
            : visits.filter(v => v.type === 'stranger').length;
          return (
            <button
              key={f}
              className={`ghost filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? t('allVisits') : f === 'recognized' ? t('recognizedLabel') : t('strangerLabel')}
              <span className="filter-count">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Timeline list */}
      {filtered.length === 0 ? (
        <div className="empty">{t('noVisits')}</div>
      ) : (
        <div className="timeline-list">
          {Object.entries(groups).map(([dateLabel, dayVisits]) => (
            <div key={dateLabel}>
              <div className="timeline-date-label">{dateLabel}</div>
              {dayVisits.map((visit) => {
                const person = getPerson(visit.personId);
                return (
                  <div
                    className="timeline-item"
                    key={visit.id}
                    onClick={() => person && setDetailPerson(person)}
                    style={{ cursor: person ? 'pointer' : 'default' }}
                  >
                    {person ? (
                      <img className="timeline-avatar" src={person.image} alt={person.name} />
                    ) : (
                      <div className="timeline-avatar timeline-avatar-stranger">?</div>
                    )}
                    <div className="timeline-info">
                      <strong>
                        {person ? `${person.relation} ${person.name}` : t('unknown')}
                      </strong>
                      <span>{formatTime(visit.timestamp)}</span>
                    </div>
                    {visit.type === 'stranger' && (
                      <span className="timeline-type-tag stranger-tag">{t('strangerLabel')}</span>
                    )}
                    {visit.snapshotImage && (
                      <img className="timeline-snapshot" src={visit.snapshotImage} alt="snap" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      {detailPerson && (
        <PersonDetailModal
          person={detailPerson}
          visits={visits}
          onClose={() => setDetailPerson(null)}
          t={t}
        />
      )}
    </section>
  );
}
