import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, ZAxis,
} from 'recharts';
import { useApp } from '../App.jsx';
import {
  getData, getCustomers, aggregateByCountry, aggregateByPeriod,
  COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import DataTable from '../components/DataTable.jsx';
import { fmt } from '../utils/formatters.js';

const CC       = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK     = { fontSize: 11, fill: '#64748B' };
const SEG_COLORS = { HNI: '#7C3AED', 'Mass Affluent': '#3B82F6', 'Mass Market': '#10B981' };
const GENDER_COLORS = ['#3B82F6', '#EC4899'];

export default function CustomerInsights() {
  const { filters, priorFilters, selectedCountries } = useApp();
  const [segFilter, setSegFilter] = useState('All');

  const data      = useMemo(() => getData(filters),      [filters]);
  const priorData = useMemo(() => getData(priorFilters), [priorFilters]);
  const byMo      = useMemo(() => aggregateByPeriod(data), [data]);
  const byCtry    = useMemo(() => aggregateByCountry(data), [data]);

  // Raw customers filtered by country
  const customers = useMemo(() => {
    let c = getCustomers({ countries: selectedCountries });
    if (segFilter !== 'All') c = c.filter(x => x.segment === segFilter);
    return c;
  }, [selectedCountries, segFilter]);

  // Customer aggregates
  const custStats = useMemo(() => {
    const active   = customers.filter(c => c.status === 'Active');
    const lapsed   = customers.filter(c => c.status === 'Lapsed');
    const avgNPS   = customers.length ? customers.reduce((a,c) => a+c.nps,0) / customers.length : 0;
    const avgLTV   = customers.length ? customers.reduce((a,c) => a+c.lifetimeValue,0) / customers.length : 0;
    const avgPrem  = customers.length ? customers.reduce((a,c) => a+c.annualPremium,0) / customers.length : 0;
    const retRate  = customers.length ? (active.length / customers.length) * 100 : 0;
    return { total: customers.length, active: active.length, lapsed: lapsed.length,
      avgNPS: Math.round(avgNPS), avgLTV: Math.round(avgLTV), avgPrem: Math.round(avgPrem),
      retentionRate: Math.round(retRate * 10) / 10 };
  }, [customers]);

  const priorCustBase = useMemo(() => priorData.reduce((a,r) => a + r.newCustomers, 0), [priorData]);
  const currCustBase  = useMemo(() => data.reduce((a,r) => a + r.newCustomers, 0), [data]);

  // Segment breakdown
  const segData = useMemo(() => {
    const map = {};
    customers.forEach(c => {
      if (!map[c.segment]) map[c.segment] = { segment: c.segment, count:0, active:0, totalLTV:0, totalPrem:0, totalNPS:0 };
      map[c.segment].count++;
      if (c.status === 'Active') map[c.segment].active++;
      map[c.segment].totalLTV  += c.lifetimeValue;
      map[c.segment].totalPrem += c.annualPremium;
      map[c.segment].totalNPS  += c.nps;
    });
    return Object.values(map).map(s => ({
      ...s,
      retentionRate: s.count ? Math.round((s.active/s.count)*1000)/10 : 0,
      avgLTV:  s.count ? Math.round(s.totalLTV/s.count)  : 0,
      avgPrem: s.count ? Math.round(s.totalPrem/s.count) : 0,
      avgNPS:  s.count ? Math.round(s.totalNPS/s.count)  : 0,
    }));
  }, [customers]);

  // Age distribution
  const ageGroups = useMemo(() => {
    const buckets = { '18-29':0, '30-39':0, '40-49':0, '50-59':0, '60+':0 };
    customers.forEach(c => {
      if (c.age < 30)      buckets['18-29']++;
      else if (c.age < 40) buckets['30-39']++;
      else if (c.age < 50) buckets['40-49']++;
      else if (c.age < 60) buckets['50-59']++;
      else                 buckets['60+']++;
    });
    return Object.entries(buckets).map(([age, count]) => ({ age, count }));
  }, [customers]);

  // Channel acquisition
  const channelAcq = useMemo(() => {
    const map = {};
    customers.forEach(c => {
      map[c.channel] = (map[c.channel] || 0) + 1;
    });
    return Object.entries(map).map(([channel, count]) => ({ channel, count }));
  }, [customers]);

  // Product spread among customers
  const prodSpread = useMemo(() => {
    const map = {};
    customers.forEach(c => {
      if (!map[c.product]) map[c.product] = { product: c.product, count:0, totalPrem:0 };
      map[c.product].count++;
      map[c.product].totalPrem += c.annualPremium;
    });
    return Object.values(map).map(p => ({
      ...p, avgPrem: p.count ? Math.round(p.totalPrem / p.count) : 0,
    }));
  }, [customers]);

  // Gender split
  const genderSplit = useMemo(() => {
    const m = customers.filter(c => c.gender === 'Male').length;
    const f = customers.filter(c => c.gender === 'Female').length;
    return [{ gender:'Male', value:m }, { gender:'Female', value:f }];
  }, [customers]);

  // Country NPS bar
  const npsBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country, NPS: c.avgNPS,
  }));

  // NPS monthly trend
  const npsTrend = byMo.map(r => ({ ...r }));

  // Customer table (sample 200 for display)
  const tableData = useMemo(() => customers.slice(0, 300), [customers]);
  const tableCols = [
    { key: 'id',            label: 'ID',        sortable: false },
    { key: 'countryName',   label: 'Country' },
    { key: 'region',        label: 'Region' },
    { key: 'segment',       label: 'Segment',   render: v => <span className={`badge ${v==='HNI'?'badge-purple':v==='Mass Affluent'?'badge-blue':'badge-green'}`}>{v}</span> },
    { key: 'age',           label: 'Age' },
    { key: 'gender',        label: 'Gender' },
    { key: 'product',       label: 'Product' },
    { key: 'annualPremium', label: 'Prem. (USD)', render: v => '$'+fmt.number(v) },
    { key: 'status',        label: 'Status',    render: v => <span className={`badge ${v==='Active'?'badge-green':v==='Lapsed'?'badge-red':'badge-amber'}`}>{v}</span> },
    { key: 'nps',           label: 'NPS',       render: v => <span className={`badge ${v>=40?'badge-green':v>=20?'badge-amber':'badge-red'}`}>{v}</span> },
    { key: 'channel',       label: 'Channel' },
    { key: 'lifetimeValue', label: 'LTV (USD)',  render: v => '$'+fmt.number(v) },
  ];

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Total Customers"   value={fmt.number(custStats.total)}          sub={`${selectedCountries.length} countries`}  change={fmt.change(currCustBase, priorCustBase)} changeSub="new policies vs prior" accent="#3B82F6"/>
        <KPICard label="Active Customers"  value={fmt.number(custStats.active)}         sub={fmt.percent(custStats.retentionRate) + ' retention'} accent="#10B981"/>
        <KPICard label="Lapsed Customers"  value={fmt.number(custStats.lapsed)}         sub="Portfolio attrition" accent="#EF4444"/>
        <KPICard label="Avg NPS"           value={custStats.avgNPS}                     sub="Net Promoter Score" accent="#8B5CF6"/>
        <KPICard label="Avg Annual Premium" value={'$' + fmt.number(custStats.avgPrem)} sub="Per active policy" accent="#F59E0B"/>
        <KPICard label="Avg Lifetime Value" value={'$' + fmt.number(custStats.avgLTV)}  sub="Projected LTV" accent="#06B6D4"/>
      </div>

      {/* Segment breakdown + NPS by country */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Customer Segment Performance</div>
              <div className="chart-sub">HNI · Mass Affluent · Mass Market</div>
            </div>
          </div>
          <table className="summary-table">
            <thead><tr><th>Segment</th><th>Count</th><th>Retention</th><th>Avg LTV</th><th>Avg Premium</th><th>Avg NPS</th></tr></thead>
            <tbody>
              {segData.sort((a,b) => b.avgLTV - a.avgLTV).map(s => (
                <tr key={s.segment}>
                  <td><span className="badge" style={{ background: SEG_COLORS[s.segment]+'20', color: SEG_COLORS[s.segment] }}>{s.segment}</span></td>
                  <td>{fmt.number(s.count)}</td>
                  <td><span className={`badge ${s.retentionRate>=95?'badge-green':s.retentionRate>=85?'badge-amber':'badge-red'}`}>{fmt.percent(s.retentionRate)}</span></td>
                  <td>${fmt.number(s.avgLTV)}</td>
                  <td>${fmt.number(s.avgPrem)}</td>
                  <td><span className={`badge ${s.avgNPS>=40?'badge-green':s.avgNPS>=20?'badge-amber':'badge-red'}`}>{s.avgNPS}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">NPS by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={npsBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} domain={[0,70]}/>
              <Tooltip/>
              <Bar dataKey="NPS" radius={[4,4,0,0]}>
                {npsBar.map((e,i) => <Cell key={i} fill={CC[e.code]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Age + channel + product */}
      <div className="charts-row col-3">
        <div className="chart-card">
          <div className="chart-hdr"><div className="chart-title">Age Distribution</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageGroups}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="age" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} tickFormatter={fmt.axis.count}/>
              <Tooltip formatter={v => [fmt.number(v), 'Customers']}/>
              <Bar dataKey="count" name="Customers" fill="#3B82F6" radius={[4,4,0,0]}>
                {ageGroups.map((_,i) => <Cell key={i} fill={['#BFDBFE','#93C5FD','#60A5FA','#3B82F6','#1D4ED8'][i]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr"><div className="chart-title">Acquisition Channel</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={channelAcq} cx="50%" cy="50%" outerRadius={75} innerRadius={30}
                dataKey="count" nameKey="channel"
                label={({ channel, percent }) => `${channel} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={9}>
                {channelAcq.map((_,i) => <Cell key={i} fill={['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'][i%5]}/>)}
              </Pie>
              <Tooltip formatter={v => [fmt.number(v), 'Customers']}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr"><div className="chart-title">Gender Split</div></div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={genderSplit} cx="50%" cy="50%" outerRadius={75} innerRadius={30}
                dataKey="value" nameKey="gender"
                label={({ gender, percent }) => `${gender} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {genderSplit.map((_,i) => <Cell key={i} fill={GENDER_COLORS[i]}/>)}
              </Pie>
              <Tooltip formatter={v => [fmt.number(v), 'Customers']}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product holdings */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Product Holdings by Count & Avg Premium</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prodSpread} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis type="number" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis type="category" dataKey="product" tick={{ fontSize:10, fill:'#64748B' }} width={90}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="count"   name="Customers" fill="#3B82F6" radius={[0,3,3,0]}/>
              <Bar dataKey="avgPrem" name="Avg Premium ($)" fill="#10B981" radius={[0,3,3,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Monthly NPS Trend</div>
            <div className="chart-sub">Net Promoter Score — aggregate</div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={npsTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="label" tick={TICK} interval={2}/>
              <YAxis tick={TICK} domain={[0,60]}/>
              <Tooltip/>
              <Line dataKey="activeAgents" hide/>
            </LineChart>
          </ResponsiveContainer>
          {/* NPS per country lines */}
          <ResponsiveContainer width="100%" height={0}>
            <LineChart data={[]}>
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                return <Line key={code} dataKey={code} name={meta?.flag+' '+meta?.name} stroke={CC[code]} strokeWidth={2} dot={false}/>;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Customer table */}
      <div className="chart-card">
        <div className="chart-hdr">
          <div className="chart-title">Customer Portfolio Sample (first 300)</div>
          <div style={{ display:'flex', gap:6 }}>
            {['All','HNI','Mass Affluent','Mass Market'].map(s => (
              <button key={s} className={`period-btn${segFilter===s?' active':''}`}
                onClick={() => setSegFilter(s)}>{s}</button>
            ))}
          </div>
        </div>
        <DataTable columns={tableCols} data={tableData} pageSize={10} filename="customer-portfolio"/>
      </div>
    </>
  );
}
