import React, { useState, useMemo } from 'react';
import { exportToCSV } from '../utils/csvExport.js';

export default function DataTable({ columns, data, pageSize = 12, filename = 'export' }) {
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage]       = useState(0);

  const sorted = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      const cmp = typeof va === 'number' ? va - vb : String(va ?? '').localeCompare(String(vb ?? ''));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const pageData   = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = key => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
    setPage(0);
  };

  const handleExport = () => exportToCSV(data, filename, columns);

  return (
    <div className="dt-wrap">
      <div className="dt-toolbar">
        <span className="dt-count">{data.length.toLocaleString()} records</span>
        <div className="dt-actions">
          <button className="btn-export" onClick={handleExport}>↓ Export CSV</button>
        </div>
      </div>
      <div className="dt-scroll">
        <table className="datatable">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={col.sortable !== false ? 'sortable' : ''}
                  onClick={col.sortable !== false ? () => handleSort(col.key) : undefined}
                >
                  {col.label}
                  {sortKey === col.key && (
                    <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageData.map((row, i) => (
              <tr key={i}>
                {columns.map(col => (
                  <td key={col.key}>
                    {col.render ? col.render(row[col.key], row) : (row[col.key] ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="dt-footer">
          <button className="btn-page" disabled={page === 0} onClick={() => setPage(0)}>«</button>
          <button className="btn-page" disabled={page === 0} onClick={() => setPage(p => p - 1)}>‹</button>
          <span className="page-info">Page {page + 1} of {totalPages}</span>
          <button className="btn-page" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>›</button>
          <button className="btn-page" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>»</button>
        </div>
      )}
    </div>
  );
}
