import React, { useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useFilters } from '../App.jsx';
import {
  getData, aggregateByCountry, getTimeSeriesData, getLeadSourceBreakdown, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import { fmt } from '../utils/formatters.js';

const CC = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748b' };

export default function TrafficLeads() {
  const { filters, selectedCountries } = useFilters();

  const data    = useMemo(() => getData(filters), [filters]);
  const byCtry  = useMemo(() => aggregateByCountry(data), [data]);
  const tsSeries = useMemo(() => getTimeSeriesData(data, 'leads', selectedCountries), [data]);
  const trafficSeries = useMemo(() => getTimeSeriesData(data, 'traffic', selectedCountries), [data]);
  const sourceData = useMemo(() => getLeadSourceBreakdown(data), [data]);

  const totals = useMemo(() => data.reduce((a, r) => ({
    traffic: a.traffic + r.traffic,
    leads:   a.leads   + r.leads,
    policiesSold: a.policiesSold + r.policiesSold,
  }), { traffic: 0, leads: 0, policiesSold: 0 }), [data]);

  const convRate = totals.leads ? (totals.policiesSold / totals.leads) * 100 : 0;
  const topSource = sourceData.sort((a, b) => b.count - a.count)[0]?.source ?? '—';

  const trendWithLabel = tsSeries.map(r => ({
    ...r, label: `${r.monthName}'${String(r.year).slice(2)}`,
  }));

  const convByCtry = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'Conv. Rate (%)': c.conversionRate,
    'Avg Conv': 0,
  }));

  const radarData = byCtry.map(c => ({
    country: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    Traffic:  Math.round(c.traffic / 1000),
    Leads:    Math.round(c.leads / 100),
    Policies: Math.round(c.policiesSold / 10),
    'Conv%':  c.conversionRate,
  }));

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Total Traffic"     value={fmt.number(totals.traffic)}   sub="Website visits"    accent="#3b82f6" />
        <KPICard label="Total Leads"       value={fmt.number(totals.leads)}      sub="Qualified leads"   accent="#8b5cf6" />
        <KPICard label="Conversion Rate"   value={fmt.percent(convRate)}         sub="Lead → policy"     accent="#10b981" />
        <KPICard label="Top Lead Source"   value={topSource}                     sub="By volume"         accent="#f59e0b" />
      </div>

      <div className="charts-row charts-1col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Monthly Lead Volume by Country</div>
            <div className="chart-sub">Qualified leads generated each month</div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={trendWithLabel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={TICK} interval={5} />
              <YAxis tick={TICK} tickFormatter={fmt.axis.count} />
              <Tooltip formatter={v => [fmt.number(v)]} />
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

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Leads by Source Channel</div>
            <div className="chart-sub">Aggregated across selection</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={sourceData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={TICK} tickFormatter={fmt.axis.count} />
              <YAxis type="category" dataKey="source" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
              <Tooltip formatter={v => [fmt.number(v), 'Leads']} />
              <Bar dataKey="count" name="Leads" radius={[0,4,4,0]}>
                {sourceData.map((_, i) => (
                  <Cell key={i} fill={['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6'][i % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Conversion Rate by Country</div>
            <div className="chart-sub">Lead-to-policy conversion %</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={convByCtry}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={TICK} tickFormatter={v => v + '%'} domain={[0, 50]} />
              <Tooltip formatter={v => [v + '%', 'Conversion Rate']} />
              <Bar dataKey="Conv. Rate (%)" radius={[4,4,0,0]}>
                {convByCtry.map((e, i) => <Cell key={i} fill={CC[e.code]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Monthly Traffic by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trafficSeries.map(r => ({ ...r, label: `${r.monthName}'${String(r.year).slice(2)}` }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={TICK} interval={5} />
              <YAxis tick={TICK} tickFormatter={fmt.axis.count} />
              <Tooltip formatter={v => [fmt.number(v), 'Traffic']} />
              <Legend />
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                return (
                  <Line
                    key={code} dataKey={code} name={meta?.flag + ' ' + meta?.name}
                    stroke={CC[code]} strokeWidth={2} dot={false}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Country Performance Radar</div>
            <div className="chart-sub">Relative index across KPIs</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="country" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis tick={false} axisLine={false} />
              <Radar dataKey="Leads" name="Leads (100s)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
              <Radar dataKey="Conv%" name="Conv. %" stroke="#10b981" fill="#10b981" fillOpacity={0.2} />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">Country Traffic & Lead Summary</div>
        </div>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Total Traffic</th>
              <th>Total Leads</th>
              <th>Conversion Rate</th>
              <th>Policies Sold</th>
              <th>Traffic → Lead %</th>
            </tr>
          </thead>
          <tbody>
            {byCtry.map(c => {
              const meta = COUNTRIES.find(x => x.code === c.country);
              const tl = c.traffic ? ((c.leads / c.traffic) * 100).toFixed(1) : '—';
              return (
                <tr key={c.country}>
                  <td><span className="country-flag-name"><span style={{ fontSize: 16 }}>{meta?.flag}</span>{c.countryName}</span></td>
                  <td>{fmt.number(c.traffic)}</td>
                  <td>{fmt.number(c.leads)}</td>
                  <td><span className="badge badge-blue">{fmt.percent(c.conversionRate)}</span></td>
                  <td>{fmt.number(c.policiesSold)}</td>
                  <td><span className="badge badge-green">{tl}%</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
