/**
 * Data Service — all data access goes through here.
 * To connect a real backend, replace filter/aggregate functions with API calls.
 */
import {
  MONTHLY_DATA, REGIONAL_DATA, AGENT_TIER_DATA, PRODUCT_DATA,
  CAMPAIGN_DATA, CUSTOMER_DATA, COUNTRIES, DATA_STATS,
} from '../data/dummyData.js';
import { inRange } from './periodService.js';

export { COUNTRIES, DATA_STATS };
export const YEARS = [2020, 2021, 2022, 2023, 2024];
export const AGENT_TIERS  = ['Platinum', 'Gold', 'Silver', 'Bronze'];
export const TIER_COLORS  = { Platinum: '#7C3AED', Gold: '#D97706', Silver: '#6B7280', Bronze: '#92400E' };
export const PROD_COLORS  = { 'Term Life': '#3B82F6', 'Whole Life': '#10B981', Endowment: '#F59E0B', ULIP: '#EF4444', Health: '#8B5CF6' };

// ── Primary filter ──────────────────────────────────────────────────────────
export function getData({ countries = [], period = null } = {}) {
  return MONTHLY_DATA.filter(r => {
    if (countries.length && !countries.includes(r.country)) return false;
    if (period && !inRange(r, period)) return false;
    return true;
  });
}
export function getRegionalData({ countries = [], period = null } = {}) {
  return REGIONAL_DATA.filter(r => {
    if (countries.length && !countries.includes(r.country)) return false;
    if (period && !inRange(r, period)) return false;
    return true;
  });
}
export function getAgentTierData({ countries = [], period = null } = {}) {
  return AGENT_TIER_DATA.filter(r => {
    if (countries.length && !countries.includes(r.country)) return false;
    if (period && !inRange(r, period)) return false;
    return true;
  });
}
export function getProductData({ countries = [], period = null } = {}) {
  return PRODUCT_DATA.filter(r => {
    if (countries.length && !countries.includes(r.country)) return false;
    if (period && !inRange(r, period)) return false;
    return true;
  });
}
export function getCampaigns({ countries = [], years = [] } = {}) {
  return CAMPAIGN_DATA.filter(r => {
    if (countries.length && !countries.includes(r.country)) return false;
    if (years.length    && !years.includes(r.year))        return false;
    return true;
  });
}
export function getCustomers({ countries = [] } = {}) {
  return CUSTOMER_DATA.filter(r =>
    !countries.length || countries.includes(r.country)
  );
}

// ── Aggregations ────────────────────────────────────────────────────────────
export function aggregateByCountry(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.country]) map[r.country] = {
      country: r.country, countryName: r.countryName,
      traffic:0, uniqueVisitors:0, leads:0, qualifiedLeads:0, hotLeads:0,
      policiesSold:0, newPremium:0, renewalPremium:0, totalPremium:0,
      renewalsCollected:0, renewalsDue:0, claimsAmount:0, claimsSubmitted:0, claimsApproved:0,
      campaignBudget:0, campaigns:0, policiesTarget:0, premiumTarget:0, leadsTarget:0,
      activeAgents:0, nps:0, npsN:0, rows:0,
    };
    const m = map[r.country];
    m.traffic          += r.traffic;
    m.uniqueVisitors   += r.uniqueVisitors;
    m.leads            += r.leads;
    m.qualifiedLeads   += r.qualifiedLeads;
    m.hotLeads         += r.hotLeads;
    m.policiesSold     += r.policiesSold;
    m.newPremium       += r.newPremium;
    m.renewalPremium   += r.renewalPremium;
    m.totalPremium     += r.totalPremium;
    m.renewalsCollected+= r.renewalsCollected;
    m.renewalsDue      += r.renewalsDue;
    m.claimsAmount     += r.claimsAmount;
    m.claimsSubmitted  += r.claimsSubmitted;
    m.claimsApproved   += (r.claimsApproved || 0);
    m.campaignBudget   += r.campaignBudget;
    m.campaigns        += r.campaignsRun;
    m.policiesTarget   += r.policiesTarget;
    m.premiumTarget    += r.premiumTarget;
    m.leadsTarget      += r.leadsTarget;
    m.activeAgents      = Math.max(m.activeAgents, r.activeAgents);
    m.nps              += r.nps; m.npsN++;
    m.rows++;
  });
  return Object.values(map).map(m => ({
    ...m,
    conversionRate:       m.leads ? Math.round((m.policiesSold / m.leads) * 1000) / 10 : 0,
    qualifiedRate:        m.leads ? Math.round((m.qualifiedLeads / m.leads) * 1000) / 10 : 0,
    avgPoliciesPerAgent:  m.activeAgents ? Math.round((m.policiesSold / m.activeAgents) * 10) / 10 : 0,
    campaignROI:          m.campaignBudget ? Math.round((m.newPremium / m.campaignBudget) * 10) / 10 : 0,
    achievementPolicies:  m.policiesTarget ? Math.round((m.policiesSold / m.policiesTarget) * 1000) / 10 : 0,
    achievementPremium:   m.premiumTarget  ? Math.round((m.newPremium   / m.premiumTarget)  * 1000) / 10 : 0,
    achievementLeads:     m.leadsTarget    ? Math.round((m.leads        / m.leadsTarget)    * 1000) / 10 : 0,
    avgNPS:               m.npsN ? Math.round(m.nps / m.npsN) : 0,
    claimRatio:           m.newPremium ? Math.round((m.claimsAmount / m.newPremium) * 1000) / 10 : 0,
    persistencyRate:      m.renewalsDue ? Math.round((m.renewalsCollected / m.renewalsDue) * 1000) / 10 : 0,
    costPerLead:          m.leads ? Math.round(m.campaignBudget / m.leads) : 0,
  }));
}

export function aggregateByPeriod(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.date]) map[r.date] = {
      date: r.date, year: r.year, month: r.month, quarter: r.quarter, monthName: r.monthName,
      traffic:0, leads:0, qualifiedLeads:0, policiesSold:0,
      newPremium:0, renewalPremium:0, totalPremium:0,
      campaignBudget:0, claimsAmount:0, policiesTarget:0, premiumTarget:0, activeAgents:0,
    };
    const m = map[r.date];
    m.traffic        += r.traffic;
    m.leads          += r.leads;
    m.qualifiedLeads += r.qualifiedLeads;
    m.policiesSold   += r.policiesSold;
    m.newPremium     += r.newPremium;
    m.renewalPremium += r.renewalPremium;
    m.totalPremium   += r.totalPremium;
    m.campaignBudget += r.campaignBudget;
    m.claimsAmount   += r.claimsAmount;
    m.policiesTarget += r.policiesTarget;
    m.premiumTarget  += r.premiumTarget;
    m.activeAgents   += r.activeAgents;
  });
  return Object.values(map)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(m => ({ ...m, label: `${m.monthName}'${String(m.year).slice(2)}` }));
}

export function aggregateByRegion(regData) {
  const map = {};
  regData.forEach(r => {
    const k = `${r.country}|${r.region}`;
    if (!map[k]) map[k] = {
      country: r.country, countryName: r.countryName, region: r.region,
      leads:0, policiesSold:0, newPremium:0, activeAgents:0, rows:0,
    };
    const m = map[k];
    m.leads        += r.leads;
    m.policiesSold += r.policiesSold;
    m.newPremium   += r.newPremium;
    m.activeAgents  = Math.max(m.activeAgents, r.activeAgents);
    m.rows++;
  });
  return Object.values(map).map(m => ({
    ...m,
    conversionRate: m.leads ? Math.round((m.policiesSold / m.leads) * 1000) / 10 : 0,
    avgPremium:     m.policiesSold ? Math.round(m.newPremium / m.policiesSold) : 0,
  }));
}

export function aggregateByAgentTier(atData) {
  const map = {};
  atData.forEach(r => {
    const k = `${r.country}|${r.tier}`;
    if (!map[k]) map[k] = {
      country: r.country, countryName: r.countryName, tier: r.tier,
      agentCount:0, policiesSold:0, newPremium:0, trainingHours:0, rows:0,
    };
    const m = map[k];
    m.agentCount   += r.agentCount;
    m.policiesSold += r.policiesSold;
    m.newPremium   += r.newPremium;
    m.trainingHours+= r.trainingHours;
    m.rows++;
  });
  return Object.values(map).map(m => ({
    ...m,
    avgPoliciesPerAgent: m.agentCount ? Math.round((m.policiesSold / m.agentCount) * 10) / 10 : 0,
    avgPremiumPerAgent:  m.agentCount ? Math.round(m.newPremium / m.agentCount) : 0,
    avgTrainingHours:    m.rows ? Math.round(m.trainingHours / m.rows) : 0,
  }));
}

export function aggregateByProduct(pdData) {
  const map = {};
  pdData.forEach(r => {
    const k = `${r.country}|${r.product}`;
    if (!map[k]) map[k] = {
      country: r.country, countryName: r.countryName, product: r.product,
      policiesSold:0, newPremium:0, lapseRate:0, claimRatio:0, renewalRate:0, rows:0,
    };
    const m = map[k];
    m.policiesSold += r.policiesSold;
    m.newPremium   += r.newPremium;
    m.lapseRate    += r.lapseRate;
    m.claimRatio   += r.claimRatio;
    m.renewalRate  += r.renewalRate;
    m.rows++;
  });
  return Object.values(map).map(m => ({
    ...m,
    lapseRate:   Math.round((m.lapseRate  / m.rows) * 10) / 10,
    claimRatio:  Math.round((m.claimRatio / m.rows) * 10) / 10,
    renewalRate: Math.round((m.renewalRate/ m.rows) * 10) / 10,
    avgPremium:  m.policiesSold ? Math.round(m.newPremium / m.policiesSold) : 0,
  }));
}

export function getLeadSourceBreakdown(data) {
  const map = {};
  data.forEach(r => r.leadBreakdown.forEach(({ source, count, qualified, converted, cost }) => {
    if (!map[source]) map[source] = { source, count:0, qualified:0, converted:0, totalCost:0 };
    map[source].count     += count;
    map[source].qualified += qualified;
    map[source].converted += converted;
    map[source].totalCost += cost;
  }));
  return Object.values(map).map(m => ({
    ...m,
    qualifiedRate:  m.count ? Math.round((m.qualified / m.count)  * 1000) / 10 : 0,
    conversionRate: m.count ? Math.round((m.converted / m.count)  * 1000) / 10 : 0,
    cpl:            m.count ? Math.round(m.totalCost  / m.count)           : 0,
  }));
}

export function getChannelBreakdown(data) {
  const map = {};
  data.forEach(r => r.channelBreakdown.forEach(({ channel, spend, leads, conversions, impressions }) => {
    if (!map[channel]) map[channel] = { channel, spend:0, leads:0, conversions:0, impressions:0 };
    map[channel].spend       += spend;
    map[channel].leads       += leads;
    map[channel].conversions += conversions;
    map[channel].impressions += impressions;
  }));
  return Object.values(map).map(m => ({
    ...m,
    cpl: m.leads       ? Math.round(m.spend / m.leads)  : 0,
    ctr: m.impressions ? Math.round((m.leads / m.impressions) * 10000) / 100 : 0,
    cvr: m.leads       ? Math.round((m.conversions / m.leads) * 1000) / 10   : 0,
  }));
}

export function getPolicyTypeBreakdown(data) {
  const map = {};
  data.forEach(r => r.policyBreakdown.forEach(({ type, count, premium, lapseRate }) => {
    if (!map[type]) map[type] = { type, count:0, premium:0, lapseRate:0, rows:0 };
    map[type].count    += count;
    map[type].premium  += premium;
    map[type].lapseRate+= lapseRate;
    map[type].rows++;
  }));
  return Object.values(map).map(m => ({
    ...m,
    avgPremium: m.count ? Math.round(m.premium / m.count) : 0,
    lapseRate:  Math.round((m.lapseRate / m.rows) * 10) / 10,
  }));
}

export function getTimeSeriesData(data, metric) {
  const map = {};
  data.forEach(r => {
    if (!map[r.date]) map[r.date] = {
      date: r.date, year: r.year, month: r.month, monthName: r.monthName,
      label: `${r.monthName}'${String(r.year).slice(2)}`,
    };
    map[r.date][r.country] = r[metric];
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export function getSparkline(data, metric, country) {
  return data
    .filter(r => r.country === country)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map(r => ({ v: r[metric] || 0 }));
}

export function getYearlyComparison(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.year]) map[r.year] = {
      year: r.year, traffic:0, leads:0, policiesSold:0, newPremium:0, totalPremium:0,
    };
    const m = map[r.year];
    m.traffic      += r.traffic;
    m.leads        += r.leads;
    m.policiesSold += r.policiesSold;
    m.newPremium   += r.newPremium;
    m.totalPremium += r.totalPremium;
  });
  return Object.values(map).sort((a, b) => a.year - b.year);
}

// Heatmap: returns { [countryCode]: { [dateKey]: achievementRate } }
export function getAchievementHeatmap(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.country]) map[r.country] = {};
    const ach = r.policiesTarget
      ? Math.round((r.policiesSold / r.policiesTarget) * 1000) / 10
      : 100;
    map[r.country][r.date] = ach;
  });
  return map;
}
