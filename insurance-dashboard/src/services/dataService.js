/**
 * Data Service Layer
 * ------------------
 * All data access goes through this file. To connect a real backend:
 *   1. Replace `RAW_DATA.filter(...)` in getData() with: await fetch(`/api/data?${new URLSearchParams(filters)}`)
 *   2. Replace helper aggregation functions with API calls as needed.
 *   3. Make all exported functions async if using a real API.
 */
import { RAW_DATA, COUNTRIES } from '../data/dummyData.js';

export { COUNTRIES };
export const YEARS = [2020, 2021, 2022, 2023, 2024];

export function getData({ countries = [], years = [], months = [] } = {}) {
  return RAW_DATA.filter(r => {
    if (countries.length && !countries.includes(r.country)) return false;
    if (years.length    && !years.includes(r.year))        return false;
    if (months.length   && !months.includes(r.month))      return false;
    return true;
  });
}

export function aggregateByCountry(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.country]) {
      map[r.country] = {
        country: r.country, countryName: r.countryName,
        traffic: 0, leads: 0, policiesSold: 0, newPremium: 0,
        totalPremium: 0, campaignBudget: 0, campaigns: 0,
        activeAgents: 0, policiesTarget: 0, premiumTarget: 0,
      };
    }
    const m = map[r.country];
    m.traffic       += r.traffic;
    m.leads         += r.leads;
    m.policiesSold  += r.policiesSold;
    m.newPremium    += r.newPremium;
    m.totalPremium  += r.totalPremium;
    m.campaignBudget+= r.campaignBudget;
    m.campaigns     += r.campaignsRun;
    m.policiesTarget+= r.policiesTarget;
    m.premiumTarget += r.premiumTarget;
    m.activeAgents   = Math.max(m.activeAgents, r.activeAgents);
  });
  return Object.values(map).map(m => ({
    ...m,
    conversionRate:      Math.round((m.policiesSold / m.leads) * 1000) / 10,
    avgPoliciesPerAgent: Math.round((m.policiesSold / m.activeAgents) * 10) / 10,
    campaignROI:         Math.round((m.newPremium / m.campaignBudget) * 10) / 10,
    achievementPolicies: Math.round((m.policiesSold / m.policiesTarget) * 1000) / 10,
    achievementPremium:  Math.round((m.newPremium / m.premiumTarget) * 1000) / 10,
  }));
}

export function aggregateByPeriod(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.date]) {
      map[r.date] = {
        date: r.date, year: r.year, month: r.month, monthName: r.monthName,
        traffic: 0, leads: 0, policiesSold: 0, newPremium: 0,
        totalPremium: 0, campaignBudget: 0,
      };
    }
    const m = map[r.date];
    m.traffic       += r.traffic;
    m.leads         += r.leads;
    m.policiesSold  += r.policiesSold;
    m.newPremium    += r.newPremium;
    m.totalPremium  += r.totalPremium;
    m.campaignBudget+= r.campaignBudget;
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export function getTimeSeriesData(data, metric, countryCodes) {
  const map = {};
  data.forEach(r => {
    if (!map[r.date]) {
      map[r.date] = { date: r.date, year: r.year, month: r.month, monthName: r.monthName };
    }
    map[r.date][r.country] = r[metric];
  });
  return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
}

export function getYearlyComparison(data) {
  const map = {};
  data.forEach(r => {
    if (!map[r.year]) {
      map[r.year] = { year: r.year, traffic: 0, leads: 0, policiesSold: 0, newPremium: 0, totalPremium: 0 };
    }
    const m = map[r.year];
    m.traffic      += r.traffic;
    m.leads        += r.leads;
    m.policiesSold += r.policiesSold;
    m.newPremium   += r.newPremium;
    m.totalPremium += r.totalPremium;
  });
  return Object.values(map).sort((a, b) => a.year - b.year);
}

export function getPolicyTypeBreakdown(data) {
  const map = {};
  data.forEach(r => r.policyBreakdown.forEach(({ type, count }) => {
    map[type] = (map[type] || 0) + count;
  }));
  return Object.entries(map).map(([type, count]) => ({ type, count }));
}

export function getLeadSourceBreakdown(data) {
  const map = {};
  data.forEach(r => r.leadBreakdown.forEach(({ source, count }) => {
    map[source] = (map[source] || 0) + count;
  }));
  return Object.entries(map).map(([source, count]) => ({ source, count }));
}

export function getChannelBreakdown(data) {
  const map = {};
  data.forEach(r => r.channelBreakdown.forEach(({ channel, spend, leads }) => {
    if (!map[channel]) map[channel] = { channel, spend: 0, leads: 0 };
    map[channel].spend += spend;
    map[channel].leads += leads;
  }));
  return Object.values(map);
}
