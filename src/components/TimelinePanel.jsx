import { useState, useMemo } from 'react';
import { History, Siren, Download } from 'lucide-react';
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
      if (filter === 'sos') return v.type === 'sos';
      return true;
    });
  }, [visits, filter]);

  function exportCsv(all = true) {
    const dataToExport = all ? visits : filtered;
    if (!dataToExport.length) return;

    const headers = [t('csvHeaderType'), t('csvHeaderName'), t('csvHeaderRelation'), t('csvHeaderTime')];
    const rows = dataToExport.map((v) => {
      const person = getPerson(v.personId);
      const typeMap = { recognized: t('recognizedLabel'), stranger: t('strangerLabel'), sos: t('sosLabel'), registered: t('registeredLabel') };
      const typeLabel = typeMap[v.type] || v.type;
      const name = person?.name || t('unknown');
      const relation = person?.relation || '';
      const time = new Date(v.timestamp).toLocaleString(t.lang === 'zh' ? 'zh-CN' : 'en-US');
      return [typeLabel, name, relation, time];
    });

    const csvContent = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kinsight-timeline-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

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

      {/* Export buttons */}
      <div className="timeline-actions">
        <button className="ghost" onClick={() => exportCsv(false)} title={t('exportCsvFiltered')}>
          <Download size={14} />{t('exportCsv')}
        </button>
        <button className="ghost" onClick={() => exportCsv(true)} title={t('exportCsvAll')}>
          <Download size={14} />{t('exportCsvAll')}
        </button>
      </div>

      {/* Filter tabs */}
      <div className="filter-bar">
        {['all', 'recognized', 'stranger', 'sos'].map((f) => {
          const count = f === 'all' ? visits.length
            : f === 'recognized' ? visits.filter(v => v.type !== 'stranger' && v.type !== 'sos').length
            : visits.filter(v => v.type === f).length;
          return (
            <button
              key={f}
              className={`ghost filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? t('allVisits')
                : f === 'recognized' ? t('recognizedLabel')
                : f === 'stranger' ? t('strangersOnly')
                : t('sosOnly')}
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
                    {visit.type === 'sos' ? (
                      <div className="timeline-avatar timeline-avatar-sos"><Siren size={20} /></div>
                    ) : person ? (
                      <img className="timeline-avatar" src={person.image} alt={person.name} />
                    ) : (
                      <div className="timeline-avatar timeline-avatar-stranger">?</div>
                    )}
                    <div className="timeline-info">
                      <strong>
                        {visit.type === 'sos' ? t('sosLabel')
                          : person ? `${person.relation} ${person.name}` : t('unknown')}
                      </strong>
                      <span>{formatTime(visit.timestamp)}</span>
                    </div>
                    {visit.type === 'stranger' && (
                      <span className="timeline-type-tag stranger-tag">{t('strangerLabel')}</span>
                    )}
                    {visit.type === 'sos' && (
                      <span className="timeline-type-tag sos-tag">{t('sosLabel')}</span>
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
