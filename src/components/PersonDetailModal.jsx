import { formatTime, formatDate } from '../utils/storage';

export default function PersonDetailModal({ person, visits, onClose, t }) {
  const personVisits = visits
    .filter((v) => v.personId === person.id)
    .slice(0, 50);

  // Group by date
  const groups = {};
  for (const v of personVisits) {
    const date = formatDate(v.timestamp);
    if (!groups[date]) groups[date] = [];
    groups[date].push(v);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <div className="detail-header">
          <img src={person.image} alt={person.name} className="detail-avatar" />
          <div>
            <h3>{person.relation} · {person.name}</h3>
            {person.note && <p className="detail-note">{person.note}</p>}
            <p className="detail-meta">
              {personVisits.length} visits · registered {formatTime(person.createdAt)}
            </p>
          </div>
        </div>

        <div className="detail-visits">
          {personVisits.length === 0 ? (
            <div className="empty">{t('noVisits')}</div>
          ) : (
            Object.entries(groups).map(([date, dayVisits]) => (
              <div key={date} className="detail-day-group">
                <div className="detail-day-label">{date}</div>
                {dayVisits.map((v) => (
                  <div className="detail-visit-item" key={v.id}>
                    <span className="detail-visit-time">
                      {new Intl.DateTimeFormat(t.lang === 'zh' ? 'zh-CN' : 'en-US', {
                        hour: '2-digit', minute: '2-digit', second: '2-digit'
                      }).format(new Date(v.timestamp))}
                    </span>
                    <span className="detail-visit-tag">
                      {v.type === 'recognized' ? t('recognizedLabel') : t('registered')}
                    </span>
                    {v.snapshotImage && (
                      <img className="detail-visit-snap" src={v.snapshotImage} alt="snapshot" />
                    )}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>

        <button className="ghost" onClick={onClose} style={{ marginTop: 14 }}>
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
