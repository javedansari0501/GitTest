import React, { useMemo, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, ComposedChart, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { useApp } from '../App.jsx';
import {
  getData, getAgentTierData, aggregateByCountry, aggregateByPeriod,
  aggregateByAgentTier, getTimeSeriesData, getYearlyComparison,
  COUNTRIES, AGENT_TIERS, TIER_COLORS,
} from '../services/dataService.js';
import KPICard from '../components/KPICard.jsx';
import DrillBreadcrumb from '../components/DrillBreadcrumb.jsx';
import DataTable from '../components/DataTable.jsx';
import { fmt } from '../utils/formatters.js';

const CC   = Object.fromEntries(COUNTRIES.map(c => [c.code, c.color]));
const TICK = { fontSize: 11, fill: '#64748B' };

export default function SalesPerformance() {
  const { filters, priorFilters, selectedCountries } = useApp();
  const [drill, setDrill] = useState({ level: 0, tier: null });

  const data      = useMemo(() => getData(filters),        [filters]);
  const priorData = useMemo(() => getData(priorFilters),   [priorFilters]);
  const atData    = useMemo(() => getAgentTierData(filters), [filters]);
  const byCtry    = useMemo(() => aggregateByCountry(data),  [data]);
  const byMo      = useMemo(() => aggregateByPeriod(data),   [data]);
  const byTier    = useMemo(() => aggregateByAgentTier(atData), [atData]);
  const yearly    = useMemo(() => getYearlyComparison(data),   [data]);
  const ppaTS     = useMemo(() => getTimeSeriesData(data, 'avgPoliciesPerAgent'), [data]);

  const totals = useMemo(() => {
    const t = data.reduce((a, r) => ({
      policiesSold:   a.policiesSold   + r.policiesSold,
      policiesTarget: a.policiesTarget + r.policiesTarget,
      newPremium:     a.newPremium     + r.newPremium,
      premiumTarget:  a.premiumTarget  + r.premiumTarget,
      newAgents:      a.newAgents      + r.newAgents,
      agentChurn:     a.agentChurn     + r.agentChurn,
      peakAgents:     Math.max(a.peakAgents, r.activeAgents),
    }), { policiesSold:0, policiesTarget:0, newPremium:0, premiumTarget:0, newAgents:0, agentChurn:0, peakAgents:0 });
    t.achPolicies = t.policiesTarget ? (t.policiesSold / t.policiesTarget) * 100 : 100;
    t.achPremium  = t.premiumTarget  ? (t.newPremium   / t.premiumTarget)  * 100 : 100;
    return t;
  }, [data]);

  const priorT = useMemo(() => priorData.reduce((a,r) => ({
    policiesSold: a.policiesSold + r.policiesSold,
    newPremium:   a.newPremium   + r.newPremium,
  }), { policiesSold:0, newPremium:0 }), [priorData]);

  const avgPPA = useMemo(() => {
    const rows = byCtry;
    if (!rows.length) return 0;
    return Math.round((rows.reduce((a,c) => a + c.avgPoliciesPerAgent, 0) / rows.length) * 10) / 10;
  }, [byCtry]);

  // Target vs actual by country
  const targetBar = byCtry.map(c => ({
    name: COUNTRIES.find(x => x.code === c.country)?.flag + ' ' + c.countryName,
    code: c.country,
    'Sold':   c.policiesSold,
    'Target': c.policiesTarget,
    'Ach. %': c.achievementPolicies,
  }));

  // Tier drill-down
  const tierBar = drill.level === 0
    ? AGENT_TIERS.map(tier => {
        const rows = byTier.filter(r => r.tier === tier);
        return {
          tier,
          agentCount:   rows.reduce((a,r) => a + r.agentCount, 0),
          policiesSold: rows.reduce((a,r) => a + r.policiesSold, 0),
          newPremium:   Math.round(rows.reduce((a,r) => a + r.newPremium, 0) / 1000),
          avgPPA:       rows.length ? Math.round((rows.reduce((a,r) => a + r.avgPoliciesPerAgent, 0) / rows.length) * 10) / 10 : 0,
        };
      })
    : byTier.filter(r => r.tier === drill.tier).map(r => ({
        tier: COUNTRIES.find(c => c.code === r.country)?.flag + ' ' + r.countryName,
        code: r.country,
        agentCount: r.agentCount, policiesSold: r.policiesSold,
        newPremium: Math.round(r.newPremium / 1000), avgPPA: r.avgPoliciesPerAgent,
      }));

  // Radar data (indexed performance)
  const maxVals = byCtry.reduce((mx, c) => ({
    policiesSold: Math.max(mx.policiesSold, c.policiesSold),
    newPremium:   Math.max(mx.newPremium,   c.newPremium),
    avgPPA:       Math.max(mx.avgPPA,       c.avgPoliciesPerAgent),
    achievementPolicies: Math.max(mx.achievementPolicies, c.achievementPolicies),
    conversionRate: Math.max(mx.conversionRate, c.conversionRate),
  }), { policiesSold:1, newPremium:1, avgPPA:1, achievementPolicies:1, conversionRate:1 });

  const radarData = ['Volume','Premium','Productivity','Achievement','Conversion'].map(label => {
    const entry = { label };
    byCtry.forEach(c => {
      const meta = COUNTRIES.find(x => x.code === c.country);
      const vals = [c.policiesSold/maxVals.policiesSold, c.newPremium/maxVals.newPremium,
        c.avgPoliciesPerAgent/maxVals.avgPPA, c.achievementPolicies/maxVals.achievementPolicies,
        c.conversionRate/maxVals.conversionRate];
      entry[c.country] = Math.round(vals[['Volume','Premium','Productivity','Achievement','Conversion'].indexOf(label)] * 100);
    });
    return entry;
  });

  // Agent tier table
  const tierTableData = byTier.map(r => ({ ...r }));
  const tierTableCols = [
    { key: 'countryName',         label: 'Country' },
    { key: 'tier',                label: 'Tier' },
    { key: 'agentCount',          label: 'Agents',    render: v => fmt.number(v) },
    { key: 'policiesSold',        label: 'Policies',  render: v => fmt.number(v) },
    { key: 'avgPoliciesPerAgent', label: 'Avg Pol/Agent' },
    { key: 'newPremium',          label: 'Premium',   render: v => fmt.currency(v) },
    { key: 'avgPremiumPerAgent',  label: 'Avg Prem/Agent', render: v => '$'+fmt.number(v) },
    { key: 'avgTrainingHours',    label: 'Avg Training Hrs' },
  ];

  return (
    <>
      <div className="kpi-grid">
        <KPICard label="Policies Sold"     value={fmt.number(totals.policiesSold)}  sub="All agents"          change={fmt.change(totals.policiesSold, priorT.policiesSold)} changeSub="vs prior" achievement={totals.achPolicies} accent="#3B82F6"/>
        <KPICard label="Policy Achievement" value={fmt.percent(totals.achPolicies)} sub="vs target"           accent="#10B981"/>
        <KPICard label="Premium Achievement"value={fmt.percent(totals.achPremium)}  sub="vs target"           accent="#8B5CF6"/>
        <KPICard label="Peak Active Agents" value={fmt.number(totals.peakAgents)}   sub="Max in any month"    accent="#F59E0B"/>
        <KPICard label="Avg Policies/Agent" value={avgPPA}                          sub="Monthly average"     accent="#EF4444"/>
        <KPICard label="Net Agent Growth"   value={fmt.number(totals.newAgents - totals.agentChurn)} sub="Recruits minus churn" accent="#06B6D4"/>
      </div>

      {/* Target vs actual + tier drill */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Policies Sold vs Target by Country</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={targetBar}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="name" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis tick={TICK} tickFormatter={fmt.axis.count}/>
              <Tooltip formatter={v => [fmt.number(v)]}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar dataKey="Target" fill="#E2E8F0" radius={[4,4,0,0]}/>
              <Bar dataKey="Sold"   radius={[4,4,0,0]}>
                {targetBar.map((e,i) => <Cell key={i} fill={CC[e.code]}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div>
              <div className="chart-title">
                {drill.level === 0 ? 'Performance by Agent Tier' : `${drill.tier} Tier — by Country`}
              </div>
              <div className="chart-sub">
                {drill.level === 0 ? 'Click tier to see country breakdown' : ''}
              </div>
            </div>
          </div>
          <DrillBreadcrumb path={drill.level > 0 ? [drill.tier] : []} onNavigate={() => setDrill({ level:0, tier:null })}/>
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={tierBar}
              onClick={d => {
                if (drill.level === 0 && d?.activePayload?.[0]) {
                  const t = d.activePayload[0].payload.tier;
                  if (AGENT_TIERS.includes(t)) setDrill({ level:1, tier:t });
                }
              }}
              style={{ cursor: drill.level === 0 ? 'pointer' : 'default' }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="tier" tick={{ fontSize:10, fill:'#64748B' }}/>
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis yAxisId="r" orientation="right" tick={TICK}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar yAxisId="l" dataKey="policiesSold" name="Policies" radius={[4,4,0,0]}>
                {tierBar.map((e,i) => <Cell key={i} fill={TIER_COLORS[e.tier] || CC[e.code] || '#3B82F6'}/>)}
              </Bar>
              <Bar yAxisId="r" dataKey="avgPPA" name="Avg Pol/Agent" fill="#BFDBFE" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent productivity trend + radar */}
      <div className="charts-row col-2">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Agent Productivity Trend</div>
            <div className="chart-sub">Avg policies per agent per month</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ppaTS.map(r => ({ ...r, label: r.label }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="label" tick={TICK} interval={2}/>
              <YAxis tick={TICK}/>
              <Tooltip formatter={v => [v, 'Pol/Agent']}/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                return <Line key={code} dataKey={code} name={meta?.flag+' '+meta?.name}
                  stroke={CC[code]} strokeWidth={2} dot={false}/>;
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Country Performance Radar (Indexed)</div>
            <div className="chart-sub">100 = best performing country in selection</div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#F1F5F9"/>
              <PolarAngleAxis dataKey="label" tick={{ fontSize:10 }}/>
              <PolarRadiusAxis domain={[0,100]} tick={false} axisLine={false}/>
              {selectedCountries.map(code => {
                const meta = COUNTRIES.find(c => c.code === code);
                return <Radar key={code} dataKey={code} name={meta?.flag+' '+meta?.name}
                  stroke={CC[code]} fill={CC[code]} fillOpacity={0.15}/>;
              })}
              <Legend wrapperStyle={{ fontSize: 11 }}/>
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* YoY trend */}
      <div className="charts-row col-1">
        <div className="chart-card">
          <div className="chart-hdr">
            <div className="chart-title">Year-over-Year Sales Trajectory</div>
          </div>
          <ResponsiveContainer width="100%" height={210}>
            <ComposedChart data={yearly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9"/>
              <XAxis dataKey="year" tick={TICK}/>
              <YAxis yAxisId="l" tick={TICK} tickFormatter={fmt.axis.count}/>
              <YAxis yAxisId="r" orientation="right" tick={TICK} tickFormatter={fmt.axis.currency}/>
              <Tooltip/>
              <Legend wrapperStyle={{ fontSize: 11 }}/>
              <Bar  yAxisId="l" dataKey="policiesSold" name="Policies Sold" fill="#3B82F6" radius={[4,4,0,0]}/>
              <Line yAxisId="r" dataKey="newPremium"   name="New Premium"   stroke="#F59E0B" strokeWidth={2} dot={{ r:3 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Agent tier table */}
      <div className="chart-card">
        <div className="chart-hdr"><div className="chart-title">Agent Tier Performance Detail</div></div>
        <DataTable columns={tierTableCols} data={tierTableData} filename="agent-tier-performance"/>
      </div>
    </>
  );
}
