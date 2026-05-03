import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFilters } from '../App.jsx';
import {
  getData, aggregateByCountry, aggregateByPeriod, getPolicyTypeBreakdown,
  getTimeSeriesData, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import { fmt } from '../utils/formatters.js';

const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'];
const CC = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748b' };

export default function PolicySales() {
  const { filters, selectedCountries } = useFilters();

  const data      = useMemo(() => getData(filters), [filters]);
  const byCtry    = useMemo(() => aggregateByCountry(data), [data]);
  const byMo      = useMemo(() => aggregateByPeriod(data), [data]);
  const policyMix = useMemo(() => getPolicyTypeBreakdown(data), [data]);
  const policySeries = useMemo(() => getTimeSeriesData(data, 'policiesSold', selectedCountries), [data]);

  const totals = useMemo(() => data.reduce((a, r) => ({
    policiesSold:   a.policiesSold   + r.policiesSold,
    newPremium:     a.newPremium     + r.newPremium,
    renewalPremium: a.renewalPremium + r.renewalPremium,
    totalPremium:   a.totalPremium   + r.totalPremium,
    renewalPolicies:a.renewalPolicies+ r.renewalPolicies,
  }), { policiesSold: 0, newPremium: 0, renewalPremium: 0, totalPremium: 0, renewalPolicies: 0 }), [data]);

  const avgPremium = totals.policiesSold
    ? Math.round(totals.newPremium / totals.policiesSold) : 0;

  const premiumBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'New Premium':     Math.round(c.newPremium / 1000),
    'Renewal Premium': Math.round(c.renewalPremium || (c.totalPremium - c.newPremium) / 1000),
  }));

  const trendData = byMo.map(r => ({
    ...r, label: `${r.monthName}'${String(r.year).slice(2)}`,
  }));

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Policies Sold"     value={fmt.number(totals.policiesSold)}     sub="New policies"         accent="#3b82f6" />
        <KPICard label="New Premium"       value={fmt.currency(totals.newPremium)}      sub="First-year premium"   accent="#10b981" />
        <KPICard label="Renewal Premium"   value={fmt.currency(totals.renewalPremium)}  sub="Portfolio renewals"   accent="#8b5cf6" />
        <KPICard label="Total Premium"     value={fmt.currency(totals.totalPremium)}    sub="New + renewals"       accent="#f59e0b" />
        <KPICard label="Avg Premium/Policy" value={fmt.currency(avgPremium)}            sub="Per new policy (USD)" accent="#ef4444" />
      </div>

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Policy Type Mix</div>
            <div className="chart-sub">Share by number of policies</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={policyMix} cx="50%" cy="50%"
                outerRadius={90} innerRadius={40} dataKey="count"
                label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {policyMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 5]} />)}
              </Pie>
              <Tooltip formatter={v => [fmt.number(v), 'Policies']} />
              <Legend formatter={(v) => v} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">New vs Renewal Premium by Country</div>
            <div className="chart-sub">USD thousands (stacked)</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={premiumBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={TICK} tickFormatter={v => '$' + v + 'K'} />
              <Tooltip formatter={v => ['$' + fmt.number(v * 1000)]} />
              <Legend />
              <Bar dataKey="New Premium"     stackId="a" fill="#3b82f6" radius={[0,0,0,0]} />
              <Bar dataKey="Renewal Premium" stackId="a" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-1col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Monthly Policies Sold by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={policySeries.map(r => ({ ...r, label: `${r.monthName}'${String(r.year).slice(2)}` }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={TICK} interval={5} />
              <YAxis tick={TICK} tickFormatter={fmt.axis.count} />
              <Tooltip formatter={v => [fmt.number(v), 'Policies']} />
              <Legend />
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                return (
                  <Line
                    key={code} dataKey={code} name={meta?.flag + ' ' + meta?.name}
                    stroke={CC[code]} strokeWidth={2} dot={false} activeDot={{ r: 4 }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-1col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Monthly New Premium Trend</div>
            <div className="chart-sub">Aggregate across selected countries (USD)</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={TICK} interval={5} />
              <YAxis tick={TICK} tickFormatter={fmt.axis.currency} />
              <Tooltip formatter={v => [fmt.currency(v), 'New Premium']} />
              <Bar dataKey="newPremium" name="New Premium" fill="#3b82f6" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">Policy Sales Detail by Country</div>
        </div>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Policies Sold</th>
              <th>New Premium</th>
              <th>Renewal Policies</th>
              <th>Renewal Premium</th>
              <th>Total Premium</th>
              <th>Avg Premium</th>
            </tr>
          </thead>
          <tbody>
            {byCtry.map(c => {
              const meta = COUNTRIES.find(x => x.code === c.country);
              const avgP = c.policiesSold ? Math.round(c.newPremium / c.policiesSold) : 0;
              const ren  = c.totalPremium - c.newPremium;
              return (
                <tr key={c.country}>
                  <td><span className="country-flag-name"><span style={{ fontSize: 16 }}>{meta?.flag}</span>{c.countryName}</span></td>
                  <td>{fmt.number(c.policiesSold)}</td>
                  <td>{fmt.currency(c.newPremium)}</td>
                  <td>{fmt.number(c.policiesSold * 2)}</td>
                  <td>{fmt.currency(ren)}</td>
                  <td><strong>{fmt.currency(c.totalPremium)}</strong></td>
                  <td><span className="badge badge-blue">${fmt.number(avgP)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
