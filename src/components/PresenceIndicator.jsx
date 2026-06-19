import { useEffect, useState } from 'react';
import { Users, UserCheck, Clock } from 'lucide-react';

/**
 * 在场状态指示器
 * 显示当前在场的人员列表和状态
 */
export default function PresenceIndicator({ presentPeople, onDeparture }) {
  const [departures, setDepartures] = useState([]);

  useEffect(() => {
    // 检测离开的人员
    const currentIds = new Set(presentPeople.map(p => p.id));
    const previousIds = new Set(departures.map(d => d.id));

    // 之前在场但现在不在的 = 离开
    presentPeople.forEach(person => {
      previousIds.add(person.id);
    });

    const newDepartures = Array.from(previousIds).filter(id => !currentIds.has(id));
    if (newDepartures.length > 0) {
      newDepartures.forEach(id => {
        const person = departures.find(d => d.id === id);
        if (person) {
          onDeparture?.(person);
        }
      });
    }

    setDepartures(presentPeople);
  }, [presentPeople, onDeparture, departures]);

  if (presentPeople.length === 0) {
    return null;
  }

  return (
    <div className="presence-indicator">
      <div className="presence-header">
        <Users size={16} />
        <span className="presence-count">{presentPeople.length}</span>
        <span className="presence-label">人在场</span>
      </div>
      <div className="presence-list">
        {presentPeople.map(person => (
          <div key={person.id} className="presence-item reminder-pulse">
            <UserCheck size={14} className="presence-icon" />
            <span className="presence-name">{person.relation} {person.name}</span>
            <Clock size={12} className="presence-time" />
          </div>
        ))}
      </div>
    </div>
  );
}