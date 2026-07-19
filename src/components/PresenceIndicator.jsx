import { useEffect, useRef } from 'react';
import { Users, UserCheck, Clock } from 'lucide-react';

/**
 * 在场状态指示器
 * 显示当前在场的人员列表，并在人员离开时触发回调
 */
export default function PresenceIndicator({ presentPeople, onDeparture }) {
  // 用 ref 追踪上一帧的在场人员，避免 state 依赖导致的重复触发
  const prevPeopleRef = useRef([]);

  useEffect(() => {
    const currentIds = new Set(presentPeople.map(p => p.id));
    const prevPeople = prevPeopleRef.current;

    // 检测离开的人：之前在场但现在不在的
    for (const prev of prevPeople) {
      if (!currentIds.has(prev.id)) {
        onDeparture?.(prev);
      }
    }

    prevPeopleRef.current = presentPeople;
  }, [presentPeople, onDeparture]);

  if (presentPeople.length === 0) return null;

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
