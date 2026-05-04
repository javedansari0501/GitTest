export function exportToCSV(data, filename, columns) {
  const headers = columns.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    columns.map(c => {
      const val = c.getValue ? c.getValue(row) : row[c.key];
      if (val == null) return '';
      if (typeof val === 'string' && (val.includes(',') || val.includes('"')))
        return `"${val.replace(/"/g, '""')}"`;
      return val;
    }).join(',')
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename + '.csv';
  document.body.appendChild(a); a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
