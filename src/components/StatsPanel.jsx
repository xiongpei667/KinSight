import { useMemo } from 'react';
import { Activity } from 'lucide-react';

export default function StatsPanel({ visits, visitors, t }) {
  // 单次遍历计算所有统计指标，避免多次 filter 迭代
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    const weekAgo = todayTs - 7 * 86400000;

    let totalVisits = 0, todayVisits = 0, weekVisits = 0, sosCount = 0;
    const visitCounts = {};
    const hourCounts = new Array(24).fill(0);
    const dayCounts = [];
    for (let i = 6; i >= 0; i--) {
      const dStart = todayTs - i * 86400000;
      dayCounts.push({ label: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(new Date(dStart)), count: 0, start: dStart, end: dStart + 86400000 });
    }

    for (const v of visits) {
      totalVisits++;
      if (v.timestamp >= todayTs) todayVisits++;
      if (v.timestamp >= weekAgo) weekVisits++;
      if (v.type === 'sos') sosCount++;

      const key = v.personId || '__stranger__';
      visitCounts[key] = (visitCounts[key] || 0) + 1;

      hourCounts[new Date(v.timestamp).getHours()]++;

      for (const dc of dayCounts) {
        if (v.timestamp >= dc.start && v.timestamp < dc.end) { dc.count++; break; }
      }
    }

    const ranking = Object.entries(visitCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([id, count]) => ({ id, count }));

    return {
      totalVisits, todayVisits, weekVisits, sosCount,
      ranking, hourCounts, dayCounts,
      maxHour: Math.max(...hourCounts, 1),
      maxCount: ranking.length ? Math.max(...ranking.map(r => r.count)) : 1,
      maxDay: Math.max(...dayCounts.map(d => d.count), 1),
    };
  }, [visits]);

  return (
    <section className="card stats-card">
      <div className="section-title"><Activity size={18} /><span>{t('statistics')}</span></div>

      {/* Summary boxes */}
      <div className="stats-grid">
        <div className="stat-box">
          <strong>{stats.totalVisits}</strong>
          <span>{t('totalVisits')}</span>
        </div>
        <div className="stat-box">
          <strong>{stats.todayVisits}</strong>
          <span>{t('todayVisits')}</span>
        </div>
        <div className="stat-box" style={{ background: 'linear-gradient(135deg, #fecaca, #b91c1c)', color: '#7f1d1d' }}>
          <strong>{stats.sosCount}</strong>
          <span>{t('sosCount')}</span>
        </div>
        <div className="stat-box">
          <strong>{visitors.length}</strong>
          <span>{t('people')}</span>
        </div>
      </div>

      {/* Hour distribution */}
      <h4 className="stats-subtitle">{t('hourlyDistribution')}</h4>
      <div className="chart-hourly">
        {stats.hourCounts.map((c, h) => (
          <div className="chart-bar-col" key={h} title={`${h}:00 — ${c} ${t('count')}`}>
            <div
              className="chart-bar"
              style={{ height: `${(c / stats.maxHour) * 100}%` }}
            />
            {h % 4 === 0 && <span className="chart-label">{h}</span>}
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      <h4 className="stats-subtitle">{t('weeklyActivity')}</h4>
      <div className="chart-weekly">
        {stats.dayCounts.map((d) => (
          <div className="chart-bar-col" key={d.label} title={`${d.label}: ${d.count}`}>
            <div
              className="chart-bar chart-bar-week"
              style={{ height: `${Math.max(4, (d.count / stats.maxDay) * 100)}%` }}
            />
            <span className="chart-label">{d.label}</span>
          </div>
        ))}
      </div>

      {/* Ranking */}
      <h4 className="stats-subtitle">{t('visitRanking')}</h4>
      <div className="ranking-list">
        {stats.ranking.map(({ id, count }) => {
          const person = visitors.find((v) => v.id === id);
          const pct = (count / stats.maxCount) * 100;
          return (
            <div className="ranking-item" key={id}>
              <span className="rank-name">
                {person ? `${person.relation} ${person.name}` : t('unknown')}
              </span>
              <div className="rank-bar-track">
                <div className="rank-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="rank-count">{count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
