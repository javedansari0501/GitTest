import React, { useMemo, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ComposedChart, Line,
} from 'recharts';
import { useApp } from '../App.jsx';
import {
  getData, aggregateByCountry, aggregateByPeriod, getRegionalData,
  aggregateByRegion, getSparkline, getYearlyComparison, COUNTRIES,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import DrillBreadcrumb from '../components/DrillBreadcrumb.jsx';
import { fmt } from '../utils/formatters.js';

const CC = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748B' };

// Heatmap: achievement % per country per month
function AchievementHeatmap({ data, selectedCountries }) {
  const months = [...new Set(data.map(r => r.date))].sort();
  const byKey  = {};
  data.forEach(r => {
    const k = `${r.country}|${r.date}`;
    const ach = r.policiesTarget ? (r.policiesSold / r.policiesTarget) * 100 : 100;
    byKey[k] = Math.round(ach);
  });
  const getAch = (code, date) => byKey[`${code}|${date}`];
  const cellClass = v => {
    if (v == null) return 'hm-0';
    if (v >= 105) return 'hm-g';
    if (v >= 95)  return 'hm-ga';
    if (v >= 85)  return 'hm-a';
    if (v >= 75)  return 'hm-ra';
    return 'hm-r';
  };
  const visible = COUNTRIES.filter(c => selectedCountries.includes(c.code));
  const cols = 1 + months.length;
  return (
    <div className="heatmap-wrap">
      <div className="heatmap" style={{
        gridTemplateColumns: `110px repeat(${months.length}, minmax(28px,1fr))`,
        display: 'grid', gap: 2,
      }}>
        <div className="hm-corner" />
        {months.map(m => {
          const [y, mo] = m.split('-');
          const mn = ['','J','F','M','A','M','J','J','A','S','O','N','D'][+mo];
          return <div key={m} className="hm-col-hdr">{mn}{String(y).slice(2)}</div>;
        })}
        {visible.map(c => (
          <React.Fragment key={c.code}>
            <div className="hm-row-hdr"><span>{c.flag}</span>{c.name}</div>
            {months.map(m => {
              const v = getAch(c.code, m);
              return (
                <div key={m} className={`hm-cell ${cellClass(v)}`} title={v != null ? `${v}%` : 'No data'}>
                  {v != null ? v : ''}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        {[['hm-g','≥105%'],['hm-ga','95–105%'],['hm-a','85–95%'],['hm-ra','75–85%'],['hm-r','<75%']].map(([cls,lbl])=>(
          <div key={cls} style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#64748B' }}>
            <div className={`hm-cell ${cls}`} style={{ width:14,height:14,minWidth:14,borderRadius:3 }} />
            {lbl}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Overview() {
  const { filters, priorFilters, selectedCountries } = useApp();
  const [drill, setDrill] = useState({ level: 0, country: null });

  const data      = useMemo(() => getData(filters),      [filters]);
  const priorData = useMemo(() => getData(priorFilters),  [priorFilters]);
  const byCtry    = useMemo(() => aggregateByCountry(data),  [data]);
  const byMo      = useMemo(() => aggregateByPeriod(data),   [data]);
  const yearly    = useMemo(() => getYearlyComparison(data), [data]);

  // Regional drill-down data
  const regData  = useMemo(() => getRegionalData(filters), [filters]);
  const byRegion = useMemo(() => aggregateByRegion(regData), [regData]);

  const totals = useMemo(() => {
    const t = data.reduce((a, r) => ({
      traffic: a.traffic + r.traffic, leads: a.leads + r.leads,
      policiesSold: a.policiesSold + r.policiesSold,
      newPremium: a.newPremium + r.newPremium,
      totalPremium: a.totalPremium + r.totalPremium,
      policiesTarget: a.policiesTarget + r.policiesTarget,
      premiumTarget: a.premiumTarget + r.premiumTarget,
      nps: a.nps + r.nps, npsN: a.npsN + 1,
    }), { traffic:0,leads:0,policiesSold:0,newPremium:0,totalPremium:0,policiesTarget:0,premiumTarget:0,nps:0,npsN:0 });
    t.convRate = t.leads ? (t.policiesSold / t.leads) * 100 : 0;
    t.achPolicies = t.policiesTarget ? (t.policiesSold / t.policiesTarget) * 100 : 100;
    t.achPremium  = t.premiumTarget  ? (t.newPremium   / t.premiumTarget)  * 100 : 100;
    t.avgNPS = t.npsN ? t.nps / t.npsN : 0;
    return t;
  }, [data]);

  const priorTotals = useMemo(() => priorData.reduce((a, r) => ({
    leads: a.leads + r.leads, policiesSold: a.policiesSold + r.policiesSold,
    newPremium: a.newPremium + r.newPremium, totalPremium: a.totalPremium + r.totalPremium,
  }), { leads:0, policiesSold:0, newPremium:0, totalPremium:0 }), [priorData]);

  // Sparklines
  const allData = useMemo(() => getData({}), []);
  const sparkPremium  = useMemo(() => {
    const byM = aggregateByPeriod(allData);
    return byM.slice(-12).map(r => ({ v: r.newPremium }));
  }, [allData]);
  const sparkLeads = useMemo(() => {
    const byM = aggregateByPeriod(allData);
    return byM.slice(-12).map(r => ({ v: r.leads }));
  }, [allData]);

  // Bar chart data — country or region
  const geoBarData = useMemo(() => {
    if (drill.level === 0) {
      return byCtry.map(c => ({
        name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
        code: c.country, Policies: c.policiesSold, Premium: Math.round(c.newPremium / 1000),
        Target: c.policiesTarget,
      }));
    }
    return byRegion
      .filter(r => r.country === drill.country)
      .map(r => ({
        name: r.region, code: r.country,
        Policies: r.policiesSold, Premium: Math.round(r.newPremium / 1000), Target: 0,
      }));
  }, [drill, byCtry, byRegion]);

  const premiumPie = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    value: c.newPremium, color: CC[c.country],
  }));

  const trendData = byMo.map(r => ({ ...r }));

  const handleBarClick = (data) => {
    if (drill.level === 0 && data?.activePayload?.[0]) {
      const code = data.activePayload[0].payload.code;
      if (code) setDrill({ level: 1, country: code });
    }
  };
  const handleDrillNav = (i) => {
    if (i === -1) setDrill({ level: 0, country: null });
  };

  const drillPath = drill.level > 0
    ? [COUNTRIES.find(c => c.code === drill.country)?.flag + ' ' + COUNTRIES.find(c => c.code === drill.country)?.name]
    : [];

  return (
    <>
      {/* KPIs */}
      <div className="kpi-grid">
        <KPICard label="New Premium" value={fmt.currency(totals.newPremium)}
          sub="First-year premium"
          change={fmt.change(totals.newPremium, priorTotals.newPremium)}
          changeSub="vs prior"
          sparkData={sparkPremium} achievement={totals.achPremium} accent="#3B82F6" />
        <KPICard label="Total Premium" value={fmt.currency(totals.totalPremium)}
          sub="New + renewals"
          change={fmt.change(totals.totalPremium, priorTotals.totalPremium)}
          changeSub="vs prior" accent="#8B5CF6" />
        <KPICard label="Policies Sold" value={fmt.number(totals.policiesSold)}
          sub="New policies issued"
          change={fmt.change(totals.policiesSold, priorTotals.policiesSold)}
          changeSub="vs prior"
          achievement={totals.achPolicies} accent="#10B981" />
        <KPICard label="Total Leads" value={fmt.number(totals.leads)}
          sub="Qualified leads"
          change={fmt.change(totals.leads, priorTotals.leads)}
          changeSub="vs prior"
          sparkData={sparkLeads} accent="#F59E0B" />
        <KPICard label="Conversion Rate" value={fmt.percent(totals.convRate)}
          sub="Lead → policy" accent="#EF4444" />
        <KPICard label="Avg NPS" value={Math.round(totals.avgNPS)}
          sub="Net Promoter Score" accent="#06B6D4" />
      </div>

      {/* Trend + Pie */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Premium Trend</div>
              <div className="chart-sub">New & total premium over selected period</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#8B5CF6" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="gNew" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3B82F6" stopOpacity={0.18}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="label" tick={TICK} interval={2}/>
              <YAxis tick={TICK} tickFormatter={fmt.axis.currency}/>
              <Tooltip formatter={v => [fmt.currency(v)]} labelStyle={{ fontSize: 11 }}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Area dataKey="totalPremium" name="Total Premium" stroke="#8B5CF6" fill="url(#gTotal)" strokeWidth={2}/>
              <Area dataKey="newPremium"   name="New Premium"   stroke="#3B82F6" fill="url(#gNew)"   strokeWidth={2}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Premium by Country</div>
              <div className="chart-sub">Share of new premium</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={premiumPie} cx="50%" cy="50%"
                outerRadius={85} innerRadius={40} dataKey="value"
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {premiumPie.map((e, i) => <Cell key={i} fill={e.color}/>)}
              </Pie>
              <Tooltip formatter={v => [fmt.currency(v), 'Premium']}/>
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Drillable geo bar + YoY */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">
                {drill.level === 0 ? 'Policies by Country' : `Regions — ${COUNTRIES.find(c=>c.code===drill.country)?.name}`}
              </div>
              <div className="chart-sub">
                {drill.level === 0 ? 'Click a bar to drill into regions' : 'Regional breakdown'}
              </div>
            </div>
          </div>
          <DrillBreadcrumb path={drillPath} onNavigate={handleDrillNav}/>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={geoBarData} layout="vertical" onClick={handleBarClick}
              style={{ cursor: drill.level === 0 ? 'pointer' : 'default' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis type="number" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill:'#64748B' }} width={110}/>
              <Tooltip formatter={v => [fmt.number(v)]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="Target"   name="Target"        fill="#E2E8F0" radius={[0,3,3,0]}/>
              <Bar dataKey="Policies" name="Policies Sold" radius={[0,3,3,0]}>
                {geoBarData.map((e, i) => <Cell key={i} fill={CC[e.code]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Year-over-Year Growth</div>
              <div className="chart-sub">Policies sold & new premium</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="year" tick={TICK}/>
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={fmt.axis.currency}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar  yAxisId="l" dataKey="policiesSold" name="Policies" fill="#3B82F6" radius={[4,4,0,0]}/>
              <Line yAxisId="r" dataKey="newPremium"   name="New Premium" stroke="#F59E0B" strokeWidth={2} dot={{ r:3 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Achievement Heatmap */}
      <div className="chart-card" style={{ marginBottom: 20 }}>
        <div className="chart-hdr">
          <div>
            <div className="chart-title">Policy Achievement Heatmap</div>
            <div className="chart-sub">Actual vs target — each cell = one country-month</div>
          </div>
        </div>
        <AchievementHeatmap data={data} selectedCountries={selectedCountries}/>
      </div>

      {/* Country summary table */}
      <div className="chart-card">
        <div className="chart-hdr">
          <div className="chart-title">Country Performance Summary</div>
        </div>
        <table className="summary-table">
          <thead>
            <tr>
              <th>Country</th><th>Traffic</th><th>Leads</th><th>Conv.</th>
              <th>Policies</th><th>vs Target</th><th>New Premium</th>
              <th>Total Premium</th><th>NPS</th><th>Claim Ratio</th>
            </tr>
          </thead>
          <tbody>
            {byCtry.map(c => {
              const meta = COUNTRIES.find(x => x.code === c.country);
              const ach  = c.achievementPolicies;
              return (
                <tr key={c.country}>
                  <td><span className="flag-name"><span style={{fontSize:15}}>{meta?.flag}</span>{c.countryName}</span></td>
                  <td>{fmt.number(c.traffic)}</td>
                  <td>{fmt.number(c.leads)}</td>
                  <td><span className="badge badge-blue">{fmt.percent(c.conversionRate)}</span></td>
                  <td>{fmt.number(c.policiesSold)}</td>
                  <td>
                    <span className={`badge ${ach>=100?'badge-green':ach>=90?'badge-amber':'badge-red'}`}>
                      {fmt.percent(ach)}
                    </span>
                  </td>
                  <td>{fmt.currency(c.newPremium)}</td>
                  <td>{fmt.currency(c.totalPremium)}</td>
                  <td><span className={`badge ${c.avgNPS>=40?'badge-green':c.avgNPS>=25?'badge-amber':'badge-red'}`}>{c.avgNPS}</span></td>
                  <td>{fmt.percent(c.claimRatio)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
