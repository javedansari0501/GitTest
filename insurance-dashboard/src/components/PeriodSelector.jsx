import React from 'react';
import { PERIOD_OPTIONS } from '../services/periodService.js';

export default function PeriodSelector({ value, onChange }) {
  return (
    <div className="period-selector">
      {PERIOD_OPTIONS.map(({ code, label }) => (
        <button
          key={code}
          className={`period-btn${value === code ? ' active' : ''}`}
          onClick={() => onChange(code)}
          title={label}
        >
          {code}
        </button>
      ))}
    </div>
  );
}
