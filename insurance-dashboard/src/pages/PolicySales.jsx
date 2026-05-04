import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Area,
} from 'recharts';
import { useApp } from '../App.jsx';
import {
  getData, getProductData, aggregateByCountry, aggregateByPeriod,
  aggregateByProduct, getPolicyTypeBreakdown, getTimeSeriesData, COUNTRIES, PROD_COLORS,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import DrillBreadcrumb from '../components/DrillBreadcrumb.jsx';
import DataTable from '../components/DataTable.jsx';
import { fmt } from '../utils/formatters.js';

const CC   = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748B' };
const PIE_COLORS = ['#3B82F6','#10B981','#F59E0B','#EF4444','#8B5CF6'];

export default function PolicySales() {
  const { filters, priorFilters, selectedCountries } = useApp();
  const [drill, setDrill] = useState({ level: 0, product: null });

  const data      = useMemo(() => getData(filters),      [filters]);
  const priorData = useMemo(() => getData(priorFilters), [priorFilters]);
  const pdData    = useMemo(() => getProductData(filters), [filters]);

  const byCtry    = useMemo(() => aggregateByCountry(data),  [data]);
  const byMo      = useMemo(() => aggregateByPeriod(data),   [data]);
  const byProduct = useMemo(() => aggregateByProduct(pdData), [pdData]);
  const policyMix = useMemo(() => getPolicyTypeBreakdown(data), [data]);
  const policySeries = useMemo(() => getTimeSeriesData(data, 'policiesSold'), [data]);

  const totals = useMemo(() => {
    const t = data.reduce((a, r) => ({
      policiesSold: a.policiesSold + r.policiesSold,
      newPremium:   a.newPremium   + r.newPremium,
      renewalPremium: a.renewalPremium + r.renewalPremium,
      totalPremium: a.totalPremium + r.totalPremium,
      renewalsCollected: a.renewalsCollected + r.renewalsCollected,
      renewalsDue:  a.renewalsDue  + r.renewalsDue,
      lapseRate:    a.lapseRate    + r.lapseRate,
      claimsAmount: a.claimsAmount + r.claimsAmount,
      claimsSubmitted: a.claimsSubmitted + r.claimsSubmitted,
      policiesTarget: a.policiesTarget + r.policiesTarget,
      premiumTarget:  a.premiumTarget  + r.premiumTarget,
    }), { policiesSold:0,newPremium:0,renewalPremium:0,totalPremium:0,renewalsCollected:0,renewalsDue:0,lapseRate:0,claimsAmount:0,claimsSubmitted:0,policiesTarget:0,premiumTarget:0 });
    t.avgPremium = t.policiesSold ? Math.round(t.newPremium / t.policiesSold) : 0;
    t.persistencyRate = t.renewalsDue ? (t.renewalsCollected / t.renewalsDue) * 100 : 0;
    t.lapseRateAvg = data.length ? t.lapseRate / data.length : 0;
    t.claimRatio   = t.newPremium ? (t.claimsAmount / t.newPremium) * 100 : 0;
    t.achPolicies  = t.policiesTarget ? (t.policiesSold / t.policiesTarget) * 100 : 100;
    t.achPremium   = t.premiumTarget  ? (t.newPremium   / t.premiumTarget)  * 100 : 100;
    return t;
  }, [data]);

  const priorT = useMemo(() => priorData.reduce((a,r) => ({
    policiesSold: a.policiesSold + r.policiesSold,
    newPremium:   a.newPremium   + r.newPremium,
  }), { policiesSold:0, newPremium:0 }), [priorData]);

  // Premium stacked bar by country
  const premBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'New Premium ($K)':     Math.round(c.newPremium / 1000),
    'Renewal Premium ($K)': Math.round(c.renewalPremium / 1000),
    Target:                 Math.round(c.premiumTarget / 1000),
  }));

  // Persistency bar
  const persistBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'Persistency %': c.persistencyRate,
    'Lapse Rate %':  100 - c.persistencyRate,
  }));

  // Product drill-down
  const prodBarData = drill.level === 0
    ? byProduct.map(p => ({
        name: p.product, policiesSold: p.policiesSold,
        newPremium: Math.round(p.newPremium / 1000),
        lapseRate: p.lapseRate, claimRatio: p.claimRatio,
      }))
    : byProduct
        .filter(p => p.product === drill.product)
        .flatMap(p => COUNTRIES
          .filter(c => selectedCountries.includes(c.code))
          .map(c => {
            const cProd = pdData.filter(r => r.product === p.product && r.country === c.code);
            const pol   = cProd.reduce((a,r) => a + r.policiesSold, 0);
            return {
              name: c.flag + ' ' + c.name, code: c.code,
              policiesSold: pol,
              newPremium: Math.round(cProd.reduce((a,r) => a + r.newPremium, 0) / 1000),
              lapseRate: cProd.length ? cProd.reduce((a,r) => a + r.lapseRate,0)/cProd.length : 0,
            };
          })
        );

  // Trend with persistency
  const trendData = byMo.map(r => ({
    ...r,
    persistRate: r.renewalsDue ? Math.round((r.renewalsCollected / r.renewalsDue) * 1000) / 10 : 0,
  }));

  // Table
  const prodTableCols = [
    { key: 'product',      label: 'Product' },
    { key: 'policiesSold', label: 'Policies', render: v => fmt.number(v) },
    { key: 'newPremium',   label: 'New Premium', render: v => fmt.currency(v) },
    { key: 'avgPremium',   label: 'Avg Premium', render: v => '$' + fmt.number(v) },
    { key: 'lapseRate',    label: 'Lapse %', render: v => <span className={`badge ${v<8?'badge-green':v<14?'badge-amber':'badge-red'}`}>{fmt.percent(v)}</span> },
    { key: 'claimRatio',   label: 'Claim Ratio', render: v => <span className={`badge ${v<35?'badge-green':v<50?'badge-amber':'badge-red'}`}>{fmt.percent(v)}</span> },
    { key: 'renewalRate',  label: 'Renewal %', render: v => fmt.percent(v) },
  ];

  const prodTableData = byProduct.map(p => ({ ...p }));

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Policies Sold"    value={fmt.number(totals.policiesSold)}    sub="New policies"          change={fmt.change(totals.policiesSold, priorT.policiesSold)} changeSub="vs prior" achievement={totals.achPolicies} accent="#3B82F6"/>
        <KPICard label="New Premium"      value={fmt.currency(totals.newPremium)}     sub="First-year premium"    change={fmt.change(totals.newPremium, priorT.newPremium)}     changeSub="vs prior" achievement={totals.achPremium}  accent="#10B981"/>
        <KPICard label="Renewal Premium"  value={fmt.currency(totals.renewalPremium)} sub="Portfolio renewals"    accent="#8B5CF6"/>
        <KPICard label="Persistency Rate" value={fmt.percent(totals.persistencyRate)} sub="Renewal collection"    accent="#F59E0B"/>
        <KPICard label="Avg Lapse Rate"   value={fmt.percent(totals.lapseRateAvg)}    sub="Policy discontinuation" accent="#EF4444"/>
        <KPICard label="Claims Ratio"     value={fmt.percent(totals.claimRatio)}      sub="Claims / new premium"  accent="#06B6D4"/>
      </div>

      <div className="charts-row col-2">
        {/* Product mix pie */}
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Product Mix</div>
              <div className="chart-sub">Share by policy count</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={policyMix} cx="50%" cy="50%"
                outerRadius={88} innerRadius={40} dataKey="count"
                label={({ type, percent }) => `${type} ${(percent*100).toFixed(0)}%`}
                labelLine={false} fontSize={10}>
                {policyMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % 5]}/>)}
              </Pie>
              <Tooltip formatter={v => [fmt.number(v), 'Policies']}/>
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Persistency bar */}
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Persistency vs Lapse by Country</div>
              <div className="chart-sub">Renewal collection rate</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={persistBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} tickFormatter={v => v + '%'} domain={[0,100]}/>
              <Tooltip formatter={v => [fmt.percent(v)]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="Persistency %" stackId="a" fill="#10B981" radius={[0,0,0,0]}/>
              <Bar dataKey="Lapse Rate %"  stackId="a" fill="#FCA5A5" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product drill-down bar */}
      <div className="charts-row col-1">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">
                {drill.level === 0 ? 'Policies by Product Type' : `${drill.product} — Country Breakdown`}
              </div>
              <div className="chart-sub">
                {drill.level === 0 ? 'Click a bar to see country mix for that product' : 'Policies sold per country'}
              </div>
            </div>
          </div>
          <DrillBreadcrumb path={drill.level > 0 ? [drill.product] : []} onNavigate={() => setDrill({ level:0, product:null })}/>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={prodBarData} onClick={d => {
              if (drill.level === 0 && d?.activePayload?.[0]) {
                const prod = d.activePayload[0].payload.name;
                setDrill({ level: 1, product: prod });
              }
            }} style={{ cursor: drill.level === 0 ? 'pointer' : 'default' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} tickFormatter={fmt.axis.count}/>
              <Tooltip formatter={v => [fmt.number(v)]}/>
              <Bar dataKey="policiesSold" name="Policies Sold" radius={[4,4,0,0]}>
                {prodBarData.map((e, i) => (
                  <Cell key={i} fill={PROD_COLORS[e.name] || CC[e.code] || PIE_COLORS[i%5]}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Premium stacked + policies trend */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">New vs Renewal Premium by Country</div>
              <div className="chart-sub">USD thousands</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={premBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} tickFormatter={v => '$'+v+'K'}/>
              <Tooltip formatter={v => ['$'+fmt.number(v*1000)]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="New Premium ($K)"     stackId="a" fill="#3B82F6" radius={[0,0,0,0]}/>
              <Bar dataKey="Renewal Premium ($K)" stackId="a" fill="#10B981" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">Monthly Policies & Persistency Trend</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <ComposedChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="label" tick={TICK} interval={2}/>
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={v=>v+'%'} domain={[60,100]}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar    yAxisId="l" dataKey="policiesSold" name="Policies Sold" fill="#BFDBFE" radius={[3,3,0,0]}/>
              <Line   yAxisId="r" dataKey="persistRate"  name="Persistency %" stroke="#10B981" strokeWidth={2} dot={false}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Product performance table */}
      <div className="chart-card">
        <div className="chart-hdr">
          <div className="chart-title">Product Performance Detail</div>
        </div>
        <DataTable columns={prodTableCols} data={prodTableData} filename="policy-sales-by-product"/>
      </div>
    </>
  );
}
