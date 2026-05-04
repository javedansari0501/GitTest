import React from 'react';

export default function DrillBreadcrumb({ path = [], onNavigate }) {
  if (!path.length) return null;
  return (
    <div className="drill-bc">
      <button className="bc-btn" onClick={() => onNavigate(-1)}>All</button>
      {path.map((item, i) => (
        <React.Fragment key={i}>
          <span className="bc-sep">›</span>
          <button
            className={`bc-btn${i === path.length - 1 ? ' bc-current' : ''}`}
            onClick={() => onNavigate(i)}
          >
            {item}
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}
