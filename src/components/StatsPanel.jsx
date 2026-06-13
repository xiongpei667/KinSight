import { Activity } from 'lucide-react';

export default function StatsPanel({ visits, visitors, t }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayTs = today.getTime();
  const weekAgo = todayTs - 7 * 86400000;

  const totalVisits = visits.length;
  const todayVisits = visits.filter((v) => v.timestamp >= todayTs).length;
  const weekVisits = visits.filter((v) => v.timestamp >= weekAgo).length;

  // Visit count per person
  const visitCounts = {};
  for (const v of visits) {
    const key = v.personId || '__stranger__';
    if (!visitCounts[key]) visitCounts[key] = { count: 0 };
    visitCounts[key].count += 1;
  }

  const ranking = Object.entries(visitCounts)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 8);

  const maxCount = ranking.length > 0 ? Math.max(...ranking.map(([, s]) => s.count)) : 1;

  // Hour distribution
  const hourCounts = new Array(24).fill(0);
  for (const v of visits) {
    const hour = new Date(v.timestamp).getHours();
    hourCounts[hour] += 1;
  }
  const maxHour = Math.max(...hourCounts, 1);

  // Weekly activity (last 7 days)
  const dayCounts = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(todayTs - i * 86400000);
    const dStart = d.getTime();
    const dEnd = dStart + 86400000;
    dayCounts.push({
      label: new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(d),
      count: visits.filter((v) => v.timestamp >= dStart && v.timestamp < dEnd).length,
    });
  }

  return (
    <section className="card stats-card">
      <div className="section-title"><Activity size={18} /><span>{t('statistics')}</span></div>

      {/* Summary boxes */}
      <div className="stats-grid">
        <div className="stat-box">
          <strong>{totalVisits}</strong>
          <span>{t('totalVisits')}</span>
        </div>
        <div className="stat-box">
          <strong>{todayVisits}</strong>
          <span>{t('todayVisits')}</span>
        </div>
        <div className="stat-box">
          <strong>{weekVisits}</strong>
          <span>{t.lang === 'zh' ? '本周' : 'This Week'}</span>
        </div>
        <div className="stat-box">
          <strong>{visitors.length}</strong>
          <span>{t('people')}</span>
        </div>
      </div>

      {/* Hour distribution */}
      <h4 className="stats-subtitle">{t.lang === 'zh' ? '时段分布' : 'Hourly Distribution'}</h4>
      <div className="chart-hourly">
        {hourCounts.map((c, h) => (
          <div className="chart-bar-col" key={h} title={`${h}:00 — ${c} ${t('count')}`}>
            <div
              className="chart-bar"
              style={{ height: `${(c / maxHour) * 100}%` }}
            />
            {h % 4 === 0 && <span className="chart-label">{h}</span>}
          </div>
        ))}
      </div>

      {/* Weekly activity */}
      <h4 className="stats-subtitle">{t.lang === 'zh' ? '近 7 天' : 'Last 7 Days'}</h4>
      <div className="chart-weekly">
        {dayCounts.map((d) => (
          <div className="chart-bar-col" key={d.label} title={`${d.label}: ${d.count}`}>
            <div
              className="chart-bar chart-bar-week"
              style={{ height: `${Math.max(4, (d.count / Math.max(...dayCounts.map((x) => x.count), 1)) * 100)}%` }}
            />
            <span className="chart-label">{d.label}</span>
          </div>
        ))}
      </div>

      {/* Ranking */}
      <h4 className="stats-subtitle">{t('visitRanking')}</h4>
      <div className="ranking-list">
        {ranking.map(([personId, stats]) => {
          const person = visitors.find((v) => v.id === personId);
          const pct = (stats.count / maxCount) * 100;
          return (
            <div className="ranking-item" key={personId}>
              <span className="rank-name">
                {person ? `${person.relation} ${person.name}` : t('unknown')}
              </span>
              <div className="rank-bar-track">
                <div className="rank-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="rank-count">{stats.count}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
