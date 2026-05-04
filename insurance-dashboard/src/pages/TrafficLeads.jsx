import React, { useMemo, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { useApp } from '../App.jsx';
import {
  getData, aggregateByCountry, aggregateByPeriod, getTimeSeriesData,
  getLeadSourceBreakdown, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import DrillBreadcrumb from '../components/DrillBreadcrumb.jsx';
import DataTable from '../components/DataTable.jsx';
import { fmt } from '../utils/formatters.js';

const CC   = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748B' };
const SRC_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'];

// Lead conversion funnel
function Funnel({ steps }) {
  const max = steps[0]?.value || 1;
  const colors = ['#3B82F6','#6366F1','#8B5CF6','#A855F7','#EC4899'];
  return (
    <div className="funnel-wrap">
      {steps.map((s, i) => {
        const pct = Math.round((s.value / max) * 100);
        const dropPct = i > 0 ? Math.round(((steps[i-1].value - s.value) / steps[i-1].value) * 100) : null;
        return (
          <div key={i} className="funnel-row">
            <div className="funnel-label">{s.label}</div>
            <div className="funnel-bar-wrap">
              <div className="funnel-bar" style={{ width: pct + '%', background: colors[i] }}>
                <span className="funnel-val">{fmt.number(s.value)}</span>
              </div>
            </div>
            <div className="funnel-pct">
              {dropPct != null ? <span style={{ color: '#EF4444', fontSize: 11 }}>-{dropPct}%</span> : <span style={{ color: '#10B981', fontSize: 11 }}>100%</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function TrafficLeads() {
  const { filters, priorFilters, selectedCountries } = useApp();
  const [drill, setDrill] = useState({ level: 0, source: null });

  const data      = useMemo(() => getData(filters),      [filters]);
  const priorData = useMemo(() => getData(priorFilters), [priorFilters]);
  const byCtry    = useMemo(() => aggregateByCountry(data), [data]);
  const byMo      = useMemo(() => aggregateByPeriod(data),  [data]);
  const leadSeries = useMemo(() => getTimeSeriesData(data, 'leads'), [data]);
  const trafficSeries = useMemo(() => getTimeSeriesData(data, 'traffic'), [data]);
  const sources   = useMemo(() => getLeadSourceBreakdown(data), [data]);

  const totals = useMemo(() => {
    const t = data.reduce((a, r) => ({
      traffic: a.traffic + r.traffic, uniqueVisitors: a.uniqueVisitors + r.uniqueVisitors,
      leads: a.leads + r.leads, qualifiedLeads: a.qualifiedLeads + r.qualifiedLeads,
      hotLeads: a.hotLeads + r.hotLeads, policiesSold: a.policiesSold + r.policiesSold,
      campaignBudget: a.campaignBudget + r.campaignBudget,
      leadsTarget: a.leadsTarget + r.leadsTarget,
    }), { traffic:0, uniqueVisitors:0, leads:0, qualifiedLeads:0, hotLeads:0, policiesSold:0, campaignBudget:0, leadsTarget:0 });
    t.convRate = t.leads ? (t.policiesSold / t.leads) * 100 : 0;
    t.qualRate = t.leads ? (t.qualifiedLeads / t.leads) * 100 : 0;
    t.cpl      = t.leads ? Math.round(t.campaignBudget / t.leads) : 0;
    t.achLeads = t.leadsTarget ? (t.leads / t.leadsTarget) * 100 : 100;
    return t;
  }, [data]);

  const priorT = useMemo(() => priorData.reduce((a,r) => ({
    traffic: a.traffic+r.traffic, leads: a.leads+r.leads,
  }), { traffic:0, leads:0 }), [priorData]);

  const funnelSteps = [
    { label: 'Traffic',         value: totals.traffic },
    { label: 'Unique Visitors', value: totals.uniqueVisitors },
    { label: 'Leads',           value: totals.leads },
    { label: 'Qualified',       value: totals.qualifiedLeads },
    { label: 'Hot Leads',       value: totals.hotLeads },
    { label: 'Policies Sold',   value: totals.policiesSold },
  ];

  // Source drill-down: top level = all sources, drill = sub-channel breakdown (simulated)
  const sourceBarData = drill.level === 0
    ? sources.sort((a, b) => b.count - a.count)
    : sources.filter(s => s.source === drill.source)
        .flatMap(s => [
          { source: s.source + ' — Mobile', count: Math.round(s.count * 0.55), converted: Math.round(s.converted * 0.55) },
          { source: s.source + ' — Desktop', count: Math.round(s.count * 0.35), converted: Math.round(s.converted * 0.35) },
          { source: s.source + ' — Other', count: Math.round(s.count * 0.10), converted: Math.round(s.converted * 0.10) },
        ]);

  const handleSourceClick = (d) => {
    if (drill.level === 0 && d?.activePayload?.[0]) {
      const src = d.activePayload[0].payload.source;
      if (src) setDrill({ level: 1, source: src });
    }
  };

  // Country conv rate bar
  const convBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'Conv. Rate (%)': c.conversionRate,
    'Qualified Rate (%)': c.qualifiedRate,
  }));

  const trendWithLabel = leadSeries.map(r => ({ ...r, label: r.label }));
  const trafficLabeled = trafficSeries.map(r => ({ ...r }));

  // Monthly table
  const tableData = byMo.map(r => ({
    ...r,
    convRate: r.leads ? Math.round((r.policiesSold / r.leads) * 1000) / 10 : 0,
    cpl: r.leads ? Math.round(r.campaignBudget / r.leads) : 0,
  }));

  const tableCols = [
    { key: 'label',         label: 'Period' },
    { key: 'traffic',       label: 'Traffic',    render: v => fmt.number(v) },
    { key: 'leads',         label: 'Leads',      render: v => fmt.number(v) },
    { key: 'qualifiedLeads',label: 'Qualified',  render: v => fmt.number(v) },
    { key: 'policiesSold',  label: 'Policies',   render: v => fmt.number(v) },
    { key: 'convRate',      label: 'Conv. %',    render: v => <span className="badge badge-blue">{fmt.percent(v)}</span> },
    { key: 'cpl',           label: 'CPL ($)',    render: v => '$' + fmt.number(v) },
    { key: 'campaignBudget',label: 'Budget',     render: v => fmt.currency(v) },
  ];

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Total Traffic"     value={fmt.number(totals.traffic)}        sub="Website sessions"       change={fmt.change(totals.traffic, priorT.traffic)}   changeSub="vs prior" accent="#3B82F6" />
        <KPICard label="Total Leads"       value={fmt.number(totals.leads)}           sub="All channels"           change={fmt.change(totals.leads, priorT.leads)}     changeSub="vs prior" achievement={totals.achLeads} accent="#8B5CF6" />
        <KPICard label="Qualified Leads"   value={fmt.number(totals.qualifiedLeads)}  sub={`${fmt.percent(totals.qualRate)} qualify rate`} accent="#10B981" />
        <KPICard label="Hot Leads"         value={fmt.number(totals.hotLeads)}        sub="Ready to convert"       accent="#F59E0B" />
        <KPICard label="Conversion Rate"   value={fmt.percent(totals.convRate)}       sub="Lead → policy"          accent="#EF4444" />
        <KPICard label="Cost Per Lead"     value={'$' + fmt.number(totals.cpl)}       sub="Avg across all channels" accent="#06B6D4" />
      </div>

      {/* Funnel + Lead source */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Lead Conversion Funnel</div>
              <div className="chart-sub">Traffic → qualified lead → policy</div>
            </div>
          </div>
          <Funnel steps={funnelSteps}/>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">
                {drill.level === 0 ? 'Leads by Source Channel' : `${drill.source} — Sub-channel`}
              </div>
              <div className="chart-sub">
                {drill.level === 0 ? 'Click bar to drill into sub-channel' : 'Device/sub-channel breakdown'}
              </div>
            </div>
          </div>
          <DrillBreadcrumb path={drill.level > 0 ? [drill.source] : []} onNavigate={() => setDrill({ level:0, source:null })}/>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={sourceBarData} layout="vertical"
              onClick={handleSourceClick} style={{ cursor: drill.level === 0 ? 'pointer' : 'default' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis type="number" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis type="category" dataKey="source" tick={{ fontSize: 10, fill:'#64748B' }} width={120}/>
              <Tooltip formatter={v => [fmt.number(v)]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="count"     name="Total Leads"     radius={[0,3,3,0]}>
                {sourceBarData.map((_, i) => <Cell key={i} fill={SRC_COLORS[i % 5]}/>)}
              </Bar>
              <Bar dataKey="converted" name="Converted"       fill="#10B981" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Multi-line trend */}
      <div className="charts-row col-1">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Monthly Lead Volume by Country</div>
              <div className="chart-sub">Qualified leads generated each month</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendWithLabel}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="label" tick={TICK} interval={2}/>
              <YAxis tick={TICK} tickFormatter={fmt.axis.count}/>
              <Tooltip formatter={v => [fmt.number(v)]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                return <Line key={code} dataKey={code} name={meta?.flag + ' ' + meta?.name}
                  stroke={CC[code]} strokeWidth={2} dot={false} activeDot={{ r:3 }}/>;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Conv + Traffic country bars */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Conversion & Qualification Rate by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={convBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} tickFormatter={v => v + '%'} domain={[0,55]}/>
              <Tooltip formatter={v => [v + '%']}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="Qualified Rate (%)" fill="#BFDBFE" radius={[4,4,0,0]}/>
              <Bar dataKey="Conv. Rate (%)"     radius={[4,4,0,0]}>
                {convBar.map((e,i) => <Cell key={i} fill={CC[e.code]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Source Quality Matrix</div>
            <div className="chart-sub">Qualified rate vs conversion rate per source</div>
          </div>
          <table className="summary-table">
            <thead>
              <tr><th>Source</th><th>Leads</th><th>Qualified %</th><th>Converted %</th><th>CPL ($)</th></tr>
            </thead>
            <tbody>
              {sources.sort((a,b) => b.count - a.count).map(s => (
                <tr key={s.source}>
                  <td><strong>{s.source}</strong></td>
                  <td>{fmt.number(s.count)}</td>
                  <td><span className="badge badge-blue">{fmt.percent(s.qualifiedRate)}</span></td>
                  <td><span className={`badge ${s.conversionRate>=20?'badge-green':s.conversionRate>=12?'badge-amber':'badge-red'}`}>{fmt.percent(s.conversionRate)}</span></td>
                  <td>${fmt.number(s.cpl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly data table */}
      <div className="chart-card">
        <div className="chart-hdr">
          <div className="chart-title">Monthly Traffic & Lead Detail</div>
        </div>
        <DataTable columns={tableCols} data={tableData} filename="traffic-leads"/>
      </div>
    </>
  );
}
