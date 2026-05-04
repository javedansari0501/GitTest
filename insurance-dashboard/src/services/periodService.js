/**
 * Period Service
 * Simulated "today" = October 31, 2024 (so YTD ≠ full year, giving meaningful partial-year data)
 */
export const TODAY = { year: 2024, month: 10 };

export const PERIOD_OPTIONS = [
  { code: 'MTD',  label: 'Month to Date',    short: 'MTD'  },
  { code: 'QTD',  label: 'Quarter to Date',  short: 'QTD'  },
  { code: 'YTD',  label: 'Year to Date',     short: 'YTD'  },
  { code: 'L3M',  label: 'Last 3 Months',    short: 'L3M'  },
  { code: 'L6M',  label: 'Last 6 Months',    short: 'L6M'  },
  { code: 'L12M', label: 'Last 12 Months',   short: 'L12M' },
  { code: 'ALL',  label: 'All Time (5 Yrs)', short: 'ALL'  },
];

function addMonths(year, month, delta) {
  let m = month + delta;
  let y = year;
  while (m <= 0) { m += 12; y--; }
  while (m > 12) { m -= 12; y++; }
  return { year: y, month: m };
}

export function getPeriodRange(code) {
  const { year: ty, month: tm } = TODAY;
  switch (code) {
    case 'MTD':
      return { startYear: ty, startMonth: tm, endYear: ty, endMonth: tm };
    case 'QTD': {
      const qStart = Math.floor((tm - 1) / 3) * 3 + 1; // Q4 → Oct
      return { startYear: ty, startMonth: qStart, endYear: ty, endMonth: tm };
    }
    case 'YTD':
      return { startYear: ty, startMonth: 1, endYear: ty, endMonth: tm };
    case 'L3M': {
      const s = addMonths(ty, tm, -2);
      return { startYear: s.year, startMonth: s.month, endYear: ty, endMonth: tm };
    }
    case 'L6M': {
      const s = addMonths(ty, tm, -5);
      return { startYear: s.year, startMonth: s.month, endYear: ty, endMonth: tm };
    }
    case 'L12M': {
      const s = addMonths(ty, tm, -11);
      return { startYear: s.year, startMonth: s.month, endYear: ty, endMonth: tm };
    }
    default:
      return { startYear: 2020, startMonth: 1, endYear: ty, endMonth: tm };
  }
}

export function getPriorPeriodRange(code) {
  const cur    = getPeriodRange(code);
  const length = periodMonths(cur);
  const end    = addMonths(cur.startYear, cur.startMonth, -1);
  const start  = addMonths(end.year, end.month, -(length - 1));
  return { startYear: start.year, startMonth: start.month, endYear: end.year, endMonth: end.month };
}

export function periodMonths(range) {
  return (range.endYear - range.startYear) * 12 + (range.endMonth - range.startMonth) + 1;
}

export function inRange(row, range) {
  const { startYear, startMonth, endYear, endMonth } = range;
  if (row.year < startYear || row.year > endYear) return false;
  if (row.year === startYear && row.month < startMonth) return false;
  if (row.year === endYear   && row.month > endMonth)   return false;
  return true;
}

export function periodLabel(code) {
  const r = getPeriodRange(code);
  const months = ['', 'Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  if (r.startYear === r.endYear && r.startMonth === r.endMonth)
    return `${months[r.startMonth]} ${r.startYear}`;
  if (r.startYear === r.endYear)
    return `${months[r.startMonth]}–${months[r.endMonth]} ${r.startYear}`;
  return `${months[r.startMonth]} ${r.startYear} – ${months[r.endMonth]} ${r.endYear}`;
}
