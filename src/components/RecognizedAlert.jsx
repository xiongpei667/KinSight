import { formatTime } from '../utils/storage';

export default function RecognizedAlert({ person, t }) {
  if (!person) return null;

  return (
    <div className="recognized card">
      <div className="recognized-inner">
        <img src={person.image} alt={person.name} />
        <div>
          <strong>{person.relation} · {person.name}</strong>
          <span>
            {t('lastSeen')}：{formatTime(person._seenAt)}
            · {t('matched', { d: person._distance?.toFixed(3) ?? '?' })}
          </span>
        </div>
      </div>
    </div>
  );
}
