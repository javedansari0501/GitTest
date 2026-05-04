import React from 'react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

function ragClass(ach) {
  if (ach == null) return '';
  if (ach >= 100)  return 'rag-green';
  if (ach >= 90)   return 'rag-amber';
  return 'rag-red';
}

export default function KPICard({
  label, value, sub,
  change, changeSub,
  sparkData,
  achievement,
  accent = '#3B82F6',
}) {
  return (
    <div className="kpi-card" style={{ '--accent': accent }}>
      <div className="kpi-top">
        <div className="kpi-label">{label}</div>
        {achievement != null && (
          <div className={`rag-dot ${ragClass(achievement)}`} title={`${achievement}% of target`} />
        )}
      </div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      <div className="kpi-bottom">
        {change != null && (
          <div className={`kpi-change ${change >= 0 ? 'pos' : 'neg'}`}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
            {changeSub && <span style={{ fontWeight: 400, color: '#94A3B8', marginLeft: 3 }}>{changeSub}</span>}
          </div>
        )}
        {sparkData?.length > 1 && (
          <div className="kpi-spark">
            <ResponsiveContainer width={72} height={28}>
              <LineChart data={sparkData}>
                <Line dataKey="v" stroke={accent} strokeWidth={1.5} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
