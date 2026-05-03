import React, { useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { useFilters } from '../App.jsx';
import {
  getData, aggregateByCountry, getTimeSeriesData, getYearlyComparison, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import { fmt } from '../utils/formatters.js';

const CC  = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748b' };

export default function SalesPerformance() {
  const { filters, selectedCountries } = useFilters();

  const data          = useMemo(() => getData(filters), [filters]);
  const byCtry        = useMemo(() => aggregateByCountry(data), [data]);
  const yearly        = useMemo(() => getYearlyComparison(data), [data]);
  const agentSeries   = useMemo(() => getTimeSeriesData(data, 'avgPoliciesPerAgent', selectedCountries), [data]);
  const achieveSeries = useMemo(() => getTimeSeriesData(data, 'achievementRate', selectedCountries), [data]);

  const totals = useMemo(() => data.reduce((a, r) => ({
    policiesSold:   a.policiesSold   + r.policiesSold,
    policiesTarget: a.policiesTarget + r.policiesTarget,
    newPremium:     a.newPremium     + r.newPremium,
    premiumTarget:  a.premiumTarget  + r.premiumTarget,
    agents:         Math.max(a.agents, r.activeAgents),
  }), { policiesSold: 0, policiesTarget: 0, newPremium: 0, premiumTarget: 0, agents: 0 }), [data]);

  const policyAchieve  = totals.policiesTarget ? (totals.policiesSold / totals.policiesTarget) * 100 : 0;
  const premiumAchieve = totals.premiumTarget  ? (totals.newPremium   / totals.premiumTarget)  * 100 : 0;
  const avgPPA = byCtry.length
    ? byCtry.reduce((a, c) => a + c.avgPoliciesPerAgent, 0) / byCtry.length : 0;

  const targetBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'Policies Sold':   c.policiesSold,
    'Policies Target': c.policiesTarget,
    'Achievement (%)': c.achievementPolicies,
  }));

  const premiumTargetBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'New Premium': Math.round(c.newPremium / 1000),
    'Target':      Math.round(c.premiumTarget / 1000),
  }));

  const ppaBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'Policies/Agent': c.avgPoliciesPerAgent,
    'Peak Agents':    c.activeAgents,
  }));

  const radarData = byCtry.map(c => {
    const maxCtry = byCtry.reduce((mx, x) => ({
      policiesSold: Math.max(mx.policiesSold, x.policiesSold),
      newPremium:   Math.max(mx.newPremium,   x.newPremium),
      avgPoliciesPerAgent: Math.max(mx.avgPoliciesPerAgent, x.avgPoliciesPerAgent),
      campaignROI:  Math.max(mx.campaignROI,  x.campaignROI),
      conversionRate: Math.max(mx.conversionRate, x.conversionRate),
    }), { policiesSold: 1, newPremium: 1, avgPoliciesPerAgent: 1, campaignROI: 1, conversionRate: 1 });
    return {
      country: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
      'Policies':    Math.round((c.policiesSold / maxCtry.policiesSold) * 100),
      'Premium':     Math.round((c.newPremium   / maxCtry.newPremium)   * 100),
      'Agent Prod.': Math.round((c.avgPoliciesPerAgent / maxCtry.avgPoliciesPerAgent) * 100),
      'ROI':         Math.round((c.campaignROI  / maxCtry.campaignROI)  * 100),
      'Conversion':  Math.round((c.conversionRate / maxCtry.conversionRate) * 100),
    };
  });

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Peak Active Agents"   value={fmt.number(totals.agents)}           sub="Max in any month"         accent="#3b82f6" />
        <KPICard label="Avg Policies/Agent"   value={avgPPA.toFixed(1)}                   sub="Monthly average"          accent="#8b5cf6" />
        <KPICard label="Policy Achievement"   value={fmt.percent(policyAchieve)}          sub="vs target"                accent="#10b981" />
        <KPICard label="Premium Achievement"  value={fmt.percent(premiumAchieve)}         sub="vs target"                accent="#f59e0b" />
        <KPICard label="Total Policies Sold"  value={fmt.number(totals.policiesSold)}     sub="All countries"            accent="#ef4444" />
      </div>

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Policies Sold vs Target by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={targetBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={TICK} tickFormatter={fmt.axis.count} />
              <Tooltip formatter={v => [fmt.number(v)]} />
              <Legend />
              <Bar dataKey="Policies Target" fill="#e2e8f0" radius={[4,4,0,0]} />
              <Bar dataKey="Policies Sold"   radius={[4,4,0,0]}>
                {targetBar.map((e, i) => <Cell key={i} fill={CC[e.code]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">New Premium vs Target by Country</div>
            <div className="chart-sub">USD thousands</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={premiumTargetBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={TICK} tickFormatter={v => '$' + v + 'K'} />
              <Tooltip formatter={v => ['$' + fmt.number(v * 1000)]} />
              <Legend />
              <Bar dataKey="Target"      fill="#e2e8f0" radius={[4,4,0,0]} />
              <Bar dataKey="New Premium" fill="#3b82f6" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Agent Productivity by Country</div>
            <div className="chart-sub">Avg policies per agent per month</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ppaBar} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={TICK} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={110} />
              <Tooltip />
              <Bar dataKey="Policies/Agent" radius={[0,4,4,0]}>
                {ppaBar.map((e, i) => <Cell key={i} fill={CC[e.code]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Country Performance (Indexed)</div>
            <div className="chart-sub">100 = best in selected group</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#f1f5f9" />
              <PolarAngleAxis dataKey="country" tick={{ fontSize: 10 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                const d    = radarData.find(r => r.country.includes(meta?.name ?? ''));
                if (!d) return null;
                return (
                  <Radar
                    key={code}
                    name={meta?.flag + ' ' + meta?.name}
                    dataKey={Object.keys(d).find(k => k !== 'country') ?? 'Policies'}
                    stroke={CC[code]} fill={CC[code]} fillOpacity={0.15}
                  />
                );
              })}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-1col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Monthly Agent Productivity Trend</div>
            <div className="chart-sub">Avg policies per agent per month</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={agentSeries.map(r => ({ ...r, label: `${r.monthName}'${String(r.year).slice(2)}` }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={TICK} interval={5} />
              <YAxis tick={TICK} />
              <Tooltip formatter={v => [v, 'Policies/Agent']} />
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
      </div>

      <div className="charts-row charts-1col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Yearly Sales Growth — All Countries</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={TICK} />
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.count} />
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={fmt.axis.currency} />
              <Tooltip />
              <Legend />
              <Bar  yAxisId="l" dataKey="policiesSold" name="Policies Sold" fill="#3b82f6" radius={[4,4,0,0]} />
              <Line yAxisId="r" dataKey="newPremium"   name="New Premium ($)" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">Sales Team Summary by Country</div>
        </div>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Peak Agents</th>
              <th>Policies Sold</th>
              <th>Target</th>
              <th>Achievement</th>
              <th>Avg Policies/Agent</th>
              <th>New Premium</th>
              <th>Campaign ROI</th>
            </tr>
          </thead>
          <tbody>
            {byCtry.map(c => {
              const meta = COUNTRIES.find(x => x.code === c.country);
              const ach  = c.achievementPolicies ?? 0;
              return (
                <tr key={c.country}>
                  <td><span className="country-flag-name"><span style={{ fontSize: 16 }}>{meta?.flag}</span>{c.countryName}</span></td>
                  <td>{fmt.number(c.activeAgents)}</td>
                  <td>{fmt.number(c.policiesSold)}</td>
                  <td>{fmt.number(c.policiesTarget)}</td>
                  <td>
                    <span className={`badge ${ach >= 100 ? 'badge-green' : ach >= 90 ? 'badge-blue' : 'badge-amber'}`}>
                      {fmt.percent(ach)}
                    </span>
                  </td>
                  <td>{c.avgPoliciesPerAgent}</td>
                  <td>{fmt.currency(c.newPremium)}</td>
                  <td><span className="badge badge-purple">{c.campaignROI}x</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
