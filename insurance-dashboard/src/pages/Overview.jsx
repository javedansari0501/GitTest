import React, { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useFilters } from '../App.jsx';
import {
  getData, aggregateByCountry, aggregateByPeriod, getYearlyComparison, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import { fmt } from '../utils/formatters.js';

const CC = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const CF = Object.fromEntries(COUNTRIES.map(c => [c.code, c.flag + ' ' + c.name]));

const TICK = { fontSize: 11, fill: '#64748b' };

export default function Overview() {
  const { filters } = useFilters();

  const data    = useMemo(() => getData(filters), [filters]);
  const byCtry  = useMemo(() => aggregateByCountry(data), [data]);
  const byMo    = useMemo(() => aggregateByPeriod(data), [data]);
  const yearly  = useMemo(() => getYearlyComparison(data), [data]);

  const totals = useMemo(() => {
    const t = data.reduce((a, r) => ({
      traffic:      a.traffic      + r.traffic,
      leads:        a.leads        + r.leads,
      policiesSold: a.policiesSold + r.policiesSold,
      newPremium:   a.newPremium   + r.newPremium,
      totalPremium: a.totalPremium + r.totalPremium,
    }), { traffic: 0, leads: 0, policiesSold: 0, newPremium: 0, totalPremium: 0 });
    t.conversionRate = t.leads ? (t.policiesSold / t.leads) * 100 : 0;
    return t;
  }, [data]);

  const trendData = byMo.map(r => ({
    ...r, label: `${r.monthName}'${String(r.year).slice(2)}`,
  }));

  const premiumPie = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    value: c.newPremium,
    color: CC[c.country],
  }));

  const countryBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    Policies: c.policiesSold,
    Leads: c.leads,
  }));

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Total Traffic"     value={fmt.number(totals.traffic)}      sub="Website visits"        accent="#3b82f6" />
        <KPICard label="Total Leads"       value={fmt.number(totals.leads)}         sub="Qualified leads"       accent="#8b5cf6" />
        <KPICard label="Policies Sold"     value={fmt.number(totals.policiesSold)}  sub="New policies"          accent="#10b981" />
        <KPICard label="New Premium"       value={fmt.currency(totals.newPremium)}  sub="USD"                   accent="#f59e0b" />
        <KPICard label="Conversion Rate"   value={fmt.percent(totals.conversionRate)} sub="Lead → policy"       accent="#ef4444" />
      </div>

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Monthly Premium Trend</div>
            <div className="chart-sub">USD · all selected countries</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="label" tick={TICK} interval={5} />
              <YAxis tick={TICK} tickFormatter={fmt.axis.currency} />
              <Tooltip formatter={v => [fmt.currency(v)]} />
              <Legend />
              <Area dataKey="totalPremium" name="Total Premium" stroke="#3b82f6" fill="url(#gTotal)" strokeWidth={2} />
              <Area dataKey="newPremium"   name="New Premium"   stroke="#10b981" fill="url(#gNew)"   strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">New Premium by Country</div>
            <div className="chart-sub">% share of total</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={premiumPie} cx="50%" cy="50%"
                outerRadius={90} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                labelLine={false}
              >
                {premiumPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
              <Tooltip formatter={v => [fmt.currency(v), 'Premium']} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="charts-row charts-2col">
        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Leads & Policies by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={countryBar} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" tick={TICK} tickFormatter={fmt.axis.count} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} width={105} />
              <Tooltip formatter={v => [fmt.number(v)]} />
              <Legend />
              <Bar dataKey="Leads"    fill="#a5b4fc" radius={[0,3,3,0]} />
              <Bar dataKey="Policies" radius={[0,3,3,0]}>
                {countryBar.map((e, i) => <Cell key={i} fill={CC[e.code]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-header">
            <div className="chart-title">Year-over-Year Growth</div>
            <div className="chart-sub">Policies sold & new premium</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="year" tick={TICK} />
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.count} />
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={fmt.axis.currency} />
              <Tooltip />
              <Legend />
              <Bar yAxisId="l" dataKey="policiesSold" name="Policies"    fill="#3b82f6" radius={[4,4,0,0]} />
              <Bar yAxisId="r" dataKey="newPremium"   name="Premium ($)" fill="#10b981" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary table */}
      <div className="chart-card">
        <div className="chart-header">
          <div className="chart-title">Country Summary</div>
          <div className="chart-sub">Aggregated across selected period</div>
        </div>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Country</th>
              <th>Traffic</th>
              <th>Leads</th>
              <th>Conv. Rate</th>
              <th>Policies Sold</th>
              <th>New Premium</th>
              <th>Total Premium</th>
              <th>Active Agents</th>
            </tr>
          </thead>
          <tbody>
            {byCtry.map(c => {
              const meta = COUNTRIES.find(x => x.code === c.country);
              return (
                <tr key={c.country}>
                  <td>
                    <span className="country-flag-name">
                      <span style={{ fontSize: 16 }}>{meta?.flag}</span>
                      {c.countryName}
                    </span>
                  </td>
                  <td>{fmt.number(c.traffic)}</td>
                  <td>{fmt.number(c.leads)}</td>
                  <td>
                    <span className="badge badge-blue">{fmt.percent(c.conversionRate)}</span>
                  </td>
                  <td>{fmt.number(c.policiesSold)}</td>
                  <td>{fmt.currency(c.newPremium)}</td>
                  <td>{fmt.currency(c.totalPremium)}</td>
                  <td>{fmt.number(c.activeAgents)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
