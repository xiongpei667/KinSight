import { useState } from 'react';
import { UserPlus, Save } from 'lucide-react';
import { relationOptions } from '../utils/relations';

export default function RegisterForm({ unknownFace, onSave, t }) {
  const [name, setName] = useState('');
  const [relation, setRelation] = useState('堂哥');
  const [note, setNote] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      relation,
      note: note.trim(),
      image: unknownFace.image,
      descriptor: unknownFace.descriptor,
    });
    setName('');
    setNote('');
  }

  return (
    <div className="card label-card">
      <div className="section-title">
        <UserPlus size={18} />
        <span>{t('registerTitle')}</span>
      </div>
      {unknownFace ? (
        <form onSubmit={handleSubmit} className="label-form">
          <img className="unknown-face" src={unknownFace.image} alt="Stranger" />
          <label>
            {t('nameLabel')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              autoFocus
            />
          </label>
          <label>
            {t('relationLabel')}
            <select value={relation} onChange={(e) => setRelation(e.target.value)}>
              {relationOptions.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>
          <label>
            {t('noteLabel')}
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t('notePlaceholder')}
            />
          </label>
          <button className="primary full" type="submit">
            <Save size={18} />{t('saveBtn')}
          </button>
        </form>
      ) : (
        <div className="empty">{t('registerHint')}</div>
      )}
    </div>
  );
}
