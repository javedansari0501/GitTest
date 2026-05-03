import React from 'react';

export default function KPICard({ label, value, sub, trend, trendLabel, accent = '#3b82f6' }) {
  return (
    <div className="kpi-card" style={{ '--accent': accent }}>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {trend != null && (
        <div className={`kpi-trend ${trend >= 0 ? 'up' : 'down'}`}>
          {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%{trendLabel ? ' ' + trendLabel : ''}
        </div>
      )}
    </div>
  );
}
