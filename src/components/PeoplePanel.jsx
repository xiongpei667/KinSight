import { useState } from 'react';
import { Users, LayoutGrid, List, Trash2, ExternalLink } from 'lucide-react';
import { formatTime } from '../utils/storage';

export default function PeoplePanel({ visitors, visits, onEdit, onRemove, onDetail, t }) {
  const [search, setSearch] = useState('');
  const [view, setView] = useState('card'); // card | list

  const filtered = visitors.filter((v) =>
    v.name.includes(search) || v.relation.includes(search)
  );

  // Compute visit counts per person
  const visitCounts = {};
  const lastVisits = {};
  for (const v of visits) {
    if (!v.personId) continue;
    visitCounts[v.personId] = (visitCounts[v.personId] || 0) + 1;
    if (!lastVisits[v.personId] || v.timestamp > lastVisits[v.personId]) {
      lastVisits[v.personId] = v.timestamp;
    }
  }

  return (
    <section className="card people-card">
      <div className="section-title">
        <Users size={18} /><span>{t('people')}</span>
        <small style={{ color: '#94a3b8', fontWeight: 400, marginLeft: 8 }}>
          ({visitors.length})
        </small>
      </div>

      <div className="people-toolbar">
        <input
          className="search-input"
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="view-toggle">
          <button
            className={`ghost ${view === 'card' ? 'active' : ''}`}
            onClick={() => setView('card')}
            title="Card view"
          >
            <LayoutGrid size={16} />
          </button>
          <button
            className={`ghost ${view === 'list' ? 'active' : ''}`}
            onClick={() => setView('list')}
            title="List view"
          >
            <List size={16} />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="empty">{t('noVisitors')}</div>
      ) : view === 'card' ? (
        <div className="people-grid">
          {filtered.map((person) => (
            <div className="person-manage-card" key={person.id}>
              <img
                src={person.image}
                alt={person.name}
                onClick={() => onDetail(person)}
                style={{ cursor: 'pointer' }}
              />
              <strong>{person.name}</strong>
              <small>{person.relation}</small>
              {person.note && <span>{person.note}</span>}
              <div className="person-meta">
                <span>{visitCounts[person.id] || 0} visits</span>
                {lastVisits[person.id] && <span>{formatTime(lastVisits[person.id])}</span>}
              </div>
              <div className="person-actions">
                <button className="ghost" onClick={() => onEdit(person)}>{t('edit')}</button>
                <button className="ghost" onClick={() => onDetail(person)}>
                  <ExternalLink size={14} />
                </button>
                <button className="ghost" onClick={() => onRemove(person.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="people-list">
          {filtered.map((person) => (
            <div className="people-list-item" key={person.id}>
              <img src={person.image} alt={person.name} className="people-list-avatar" />
              <div className="people-list-info">
                <strong>{person.name}</strong>
                <span>{person.relation}{person.note ? ` · ${person.note}` : ''}</span>
              </div>
              <div className="people-list-stats">
                <span className="people-list-count">{visitCounts[person.id] || 0}</span>
                <small>{t('count')}</small>
              </div>
              <div className="person-actions">
                <button className="ghost" onClick={() => onEdit(person)}>{t('edit')}</button>
                <button className="ghost" onClick={() => onDetail(person)}>
                  <ExternalLink size={14} />
                </button>
                <button className="ghost" onClick={() => onRemove(person.id)}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
