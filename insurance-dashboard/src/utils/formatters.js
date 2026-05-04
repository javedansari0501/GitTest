export const fmt = {
  number(n) {
    if (n == null) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  },
  currency(n) {
    if (n == null) return '—';
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toLocaleString();
  },
  percent(n, dec = 1) {
    if (n == null) return '—';
    return n.toFixed(dec) + '%';
  },
  change(current, prior) {
    if (!prior) return null;
    return ((current - prior) / prior) * 100;
  },
  axis: {
    count:    v => fmt.number(v),
    currency: v => fmt.currency(v),
    pct:      v => v + '%',
    roi:      v => v + 'x',
  },
};
