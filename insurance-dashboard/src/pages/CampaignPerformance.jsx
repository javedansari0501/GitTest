import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, ScatterChart, Scatter,
  XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useApp } from '../App.jsx';
import {
  getData, getCampaigns, aggregateByCountry, aggregateByPeriod,
  getChannelBreakdown, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import DataTable from '../components/DataTable.jsx';
import { fmt } from '../utils/formatters.js';

const CC       = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK     = { fontSize: 11, fill: '#64748B' };
const CH_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'];

export default function CampaignPerformance() {
  const { filters, priorFilters, selectedCountries, periodRange } = useApp();
  const [statusFilter, setStatusFilter] = useState('All');

  const data      = useMemo(() => getData(filters),      [filters]);
  const priorData = useMemo(() => getData(priorFilters), [priorFilters]);
  const byCtry    = useMemo(() => aggregateByCountry(data), [data]);
  const byMo      = useMemo(() => aggregateByPeriod(data),  [data]);
  const channels  = useMemo(() => getChannelBreakdown(data), [data]);

  // Campaigns — filter by selected countries and years
  const selectedYears = [...new Set(data.map(r => r.year))];
  const campaigns     = useMemo(() => {
    let c = getCampaigns({ countries: selectedCountries, years: selectedYears });
    if (statusFilter !== 'All') c = c.filter(x => x.status === statusFilter);
    return c;
  }, [selectedCountries, selectedYears, statusFilter]);

  const totals = useMemo(() => {
    const t = data.reduce((a, r) => ({
      budget:    a.budget    + r.campaignBudget,
      campaigns: a.campaigns + r.campaignsRun,
      leads:     a.leads     + r.leads,
      newPremium:a.newPremium+ r.newPremium,
      budgetTgt: a.budgetTgt + r.budgetTarget,
    }), { budget:0, campaigns:0, leads:0, newPremium:0, budgetTgt:0 });
    t.roi    = t.budget ? Math.round((t.newPremium / t.budget) * 10) / 10 : 0;
    t.cpl    = t.leads  ? Math.round(t.budget / t.leads) : 0;
    t.achBudget = t.budgetTgt ? (t.budget / t.budgetTgt) * 100 : 100;
    return t;
  }, [data]);

  const priorT = useMemo(() => priorData.reduce((a,r) => ({
    budget: a.budget + r.campaignBudget, leads: a.leads + r.leads,
  }), { budget:0, leads:0 }), [priorData]);

  // ROI by country
  const roiBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country, ROI: c.campaignROI,
    Budget: Math.round(c.campaignBudget / 1000),
  }));

  // Monthly budget vs leads
  const budgetTrend = byMo.map(r => ({
    ...r, cpl: r.leads ? Math.round(r.campaignBudget / r.leads) : 0,
  }));

  // Scatter: campaigns (budget vs roi)
  const scatterData = campaigns.map(c => ({
    x: c.budget, y: c.roi, z: c.leads, name: c.name, country: c.country,
  }));

  // Campaign table
  const campCols = [
    { key: 'id',          label: 'ID',       sortable: false },
    { key: 'countryName', label: 'Country' },
    { key: 'name',        label: 'Campaign Name' },
    { key: 'type',        label: 'Type' },
    { key: 'channel',     label: 'Channel' },
    { key: 'budget',      label: 'Budget',   render: v => fmt.currency(v) },
    { key: 'leads',       label: 'Leads',    render: v => fmt.number(v) },
    { key: 'conversions', label: 'Conv.',    render: v => fmt.number(v) },
    { key: 'roi',         label: 'ROI',      render: v => <span className={`badge ${v>=4?'badge-green':v>=2.5?'badge-amber':'badge-red'}`}>{v}x</span> },
    { key: 'cpl',         label: 'CPL ($)',  render: v => '$' + v },
    { key: 'status',      label: 'Status',   render: v => <span className={`badge ${v==='Active'?'badge-green':v==='Completed'?'badge-blue':'badge-amber'}`}>{v}</span> },
  ];

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Total Budget"    value={fmt.currency(totals.budget)}     sub="Campaign spend"       change={fmt.change(totals.budget, priorT.budget)}   changeSub="vs prior" achievement={totals.achBudget} accent="#3B82F6"/>
        <KPICard label="Campaigns Run"   value={fmt.number(totals.campaigns)}    sub="Total campaigns"      accent="#8B5CF6"/>
        <KPICard label="Avg ROI"         value={totals.roi + 'x'}                sub="Premium / spend"      accent="#10B981"/>
        <KPICard label="Leads Generated" value={fmt.number(totals.leads)}         sub="All channels"         change={fmt.change(totals.leads, priorT.leads)} changeSub="vs prior" accent="#F59E0B"/>
        <KPICard label="Cost Per Lead"   value={'$' + fmt.number(totals.cpl)}    sub="Avg campaign CPL"     accent="#EF4444"/>
        <KPICard label="Total Campaigns" value={campaigns.length.toLocaleString()} sub="In selection"       accent="#06B6D4"/>
      </div>

      {/* Channel breakdown */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Spend & Leads by Channel</div>
            <div className="chart-sub">Budget allocation vs lead generation</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={channels} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis type="number" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis type="category" dataKey="channel" tick={{ fontSize:10, fill:'#64748B' }} width={115}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="leads"       name="Leads"     radius={[0,3,3,0]}>
                {channels.map((_,i) => <Cell key={i} fill={CH_COLORS[i%5]}/>)}
              </Bar>
              <Bar dataKey="conversions" name="Converted" fill="#10B981" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Channel Efficiency</div>
            <div className="chart-sub">CTR %, Conversion %, CPL</div>
          </div>
          <table className="summary-table">
            <thead><tr><th>Channel</th><th>Spend</th><th>CTR %</th><th>Conv. %</th><th>CPL ($)</th></tr></thead>
            <tbody>
              {channels.sort((a,b) => b.conversions - a.conversions).map(c => (
                <tr key={c.channel}>
                  <td><strong>{c.channel}</strong></td>
                  <td>{fmt.currency(c.spend)}</td>
                  <td><span className={`badge ${c.ctr>=1?'badge-green':c.ctr>=0.5?'badge-amber':'badge-red'}`}>{c.ctr}%</span></td>
                  <td><span className={`badge ${c.cvr>=20?'badge-green':c.cvr>=12?'badge-amber':'badge-red'}`}>{c.cvr}%</span></td>
                  <td>${fmt.number(c.cpl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ROI by country + budget trend */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">ROI by Country</div>
            <div className="chart-sub">Premium generated per $1 spent</div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={roiBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis yAxisId="l" tick={TICK} tickFormatter={v=>v+'x'}/>
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={v=>'$'+v+'K'}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar yAxisId="l" dataKey="ROI"    name="ROI (x)" radius={[4,4,0,0]}>
                {roiBar.map((e,i) => <Cell key={i} fill={CC[e.code]}/>)}
              </Bar>
              <Bar yAxisId="r" dataKey="Budget" name="Budget ($K)" fill="#E2E8F0" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Monthly Budget vs Cost Per Lead</div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={budgetTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="label" tick={TICK} interval={2}/>
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.currency}/>
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={v=>'$'+v}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar    yAxisId="l" dataKey="campaignBudget" name="Budget ($)" fill="#BFDBFE" radius={[3,3,0,0]}/>
              <Line   yAxisId="r" dataKey="cpl"            name="CPL ($)"   stroke="#EF4444" strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Scatter: budget vs ROI */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-hdr">
          <div>
            <div className="chart-title">Campaign Portfolio — Budget vs ROI</div>
            <div className="chart-sub">Bubble size = leads generated · hover for details</div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
            <XAxis dataKey="x" name="Budget" tick={TICK} tickFormatter={fmt.axis.currency} label={{ value:'Budget', position:'insideBottom', offset:-5, fontSize:11 }}/>
            <YAxis dataKey="y" name="ROI"    tick={TICK} tickFormatter={v=>v+'x'} label={{ value:'ROI', angle:-90, position:'insideLeft', fontSize:11 }}/>
            <ZAxis dataKey="z" range={[30,300]}/>
            <Tooltip cursor={{ strokeDasharray:'3 3' }}
              content={({ payload }) => {
                if (!payload?.length) return null;
                const d = payload[0].payload;
                return (
                  <div style={{ background:'#fff', border:'1px solid #E2E8F0', padding:'8px 12px', borderRadius:8, fontSize:11 }}>
                    <div style={{ fontWeight:700, marginBottom:4 }}>{d.name}</div>
                    <div>Budget: {fmt.currency(d.x)}</div>
                    <div>ROI: {d.y}x</div>
                    <div>Leads: {fmt.number(d.z)}</div>
                  </div>
                );
              }}/>
            {selectedCountries.map(code => {
              const meta = COUNTRIES.find(c => c.code === code);
              return (
                <Scatter key={code} name={meta?.flag+' '+meta?.name}
                  data={scatterData.filter(d => d.country === code)}
                  fill={CC[code]} fillOpacity={0.7}/>
              );
            })}
            <Legend wrapperStyle={{ fontSize: 11 }}/>
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Campaign table */}
      <div className="chart-card">
        <div className="chart-hdr">
          <div className="chart-title">Individual Campaign Ledger</div>
          <div style={{ display:'flex', gap:6 }}>
            {['All','Active','Completed','Paused'].map(s => (
              <button key={s}
                className={`period-btn${statusFilter===s?' active':''}`}
                onClick={() => setStatusFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        <DataTable columns={campCols} data={campaigns} pageSize={12} filename="campaigns"/>
      </div>
    </>
  );
}
