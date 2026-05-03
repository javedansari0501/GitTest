export const fmt = {
  number(n) {
    if (n == null) return '—';
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
    return n.toLocaleString();
  },
  currency(n, compact = true) {
    if (n == null) return '—';
    if (!compact) return '$' + n.toLocaleString();
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(1) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toLocaleString();
  },
  percent(n) {
    if (n == null) return '—';
    return n.toFixed(1) + '%';
  },
  axis: {
    count:    v => fmt.number(v),
    currency: v => fmt.currency(v),
    percent:  v => v + '%',
  },
};
