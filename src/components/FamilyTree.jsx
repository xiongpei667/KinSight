import { useState } from 'react';
import { GitBranch, Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { groupVisitors, groupByGeneration, generationLabels } from '../utils/relations';
import { formatTime } from '../utils/storage';

export default function FamilyTree({ visitors, onRemove, onDetail, t }) {
  const [zoom, setZoom] = useState(1);
  const [showCategory, setShowCategory] = useState(false);

  const byGeneration = groupByGeneration(visitors);

  if (!visitors.length) {
    return (
      <section className="card tree-card">
        <div className="section-title"><GitBranch size={18} /><span>{t('familyTree')}</span></div>
        <div className="empty">{t('noVisitors')}</div>
      </section>
    );
  }

  return (
    <section className="card tree-card">
      <div className="section-title">
        <GitBranch size={18} /><span>{t('familyTree')}</span>
        <div className="tree-controls">
          <button className="ghost" onClick={() => setZoom((z) => Math.max(0.5, z - 0.1))}>
            <ZoomOut size={14} />
          </button>
          <span className="tree-zoom-level">{Math.round(zoom * 100)}%</span>
          <button className="ghost" onClick={() => setZoom((z) => Math.min(2, z + 0.1))}>
            <ZoomIn size={14} />
          </button>
          <button className="ghost" onClick={() => setZoom(1)}>
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Generation-based tree */}
      <div className="gen-tree-wrap" style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
        <div className="gen-tree">
          <div className="gen-tree-root">{t('myHome')}</div>
          <div className="gen-tree-body">
            {byGeneration.map(([gen, people], idx) => (
              <div className="gen-row" key={gen}>
                <div className="gen-label">{generationLabels[gen] || gen}</div>
                <div className="gen-people">
                  {people.map((person) => (
                    <article
                      className="gen-card"
                      key={person.id}
                      onClick={() => onDetail?.(person)}
                    >
                      <img src={person.image} alt={person.name} />
                      <div className="gen-card-info">
                        <strong>{person.name}</strong>
                        <small>{person.relation}</small>
                        {person.note && <span>{person.note}</span>}
                      </div>
                      <button
                        className="ghost gen-remove"
                        onClick={(e) => { e.stopPropagation(); onRemove(person.id); }}
                        title={t('removeBtn')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle category tree */}
      <button
        className="ghost toggle-category"
        onClick={() => setShowCategory(!showCategory)}
        style={{ marginTop: 14 }}
      >
        {showCategory ? '−' : '+'} {t('core')} / {t('paternal')} / {t('maternal')}
      </button>
      {showCategory && <CategoryTree visitors={visitors} onRemove={onRemove} t={t} />}
    </section>
  );
}

function CategoryTree({ visitors, onRemove, t }) {
  const tree = groupVisitors(visitors);
  return (
    <div className="family-tree">
      <div className="branches">
        {Object.entries(tree).map(([branch, relations]) => (
          <div className="branch" key={branch}>
            <div className="branch-title">{branch}</div>
            {Object.entries(relations).map(([relation, people]) => (
              <div className="relation-group" key={relation}>
                <div className="relation-title">{relation}</div>
                <div className="people-row">
                  {people.map((person) => (
                    <article className="person-card" key={person.id}>
                      <img src={person.image} alt={person.name} />
                      <strong>{person.name}</strong>
                      <span>{person.note || t('noNote')}</span>
                      <small>{formatTime(person.createdAt)}</small>
                      <button className="ghost" onClick={() => onRemove(person.id)}>
                        <Trash2 size={14} />{t('removeBtn')}
                      </button>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
