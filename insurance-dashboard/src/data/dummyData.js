// ─── Seeded RNGs (one per dataset for independent determinism) ────────────────
function mkRng(seed) {
  let s = seed;
  return () => { s = Math.abs((s * 16807) % 2147483647); return (s - 1) / 2147483646; };
}
const rM = mkRng(1337); // monthly
const rR = mkRng(4242); // regional
const rA = mkRng(7777); // agent tier
const rP = mkRng(9999); // product
const rC = mkRng(1234); // campaign
const rX = mkRng(5678); // customer

const n  = (rng, base, v = 0.14) => Math.max(0, base * (1 + (rng() - 0.5) * v * 2));
const ni = (rng, base, v = 0.14) => Math.round(n(rng, base, v));

// ─── Constants ────────────────────────────────────────────────────────────────
export const COUNTRIES = [
  { code: 'IN', name: 'India',      flag: '🇮🇳', color: '#FF6B35',
    regions: ['North India','South India','East India','West India','Central India'],
    rw: [0.28,0.25,0.18,0.22,0.07] },
  { code: 'JP', name: 'Japan',      flag: '🇯🇵', color: '#E63946',
    regions: ['Kanto','Kansai','Chubu','Kyushu','Hokkaido'],
    rw: [0.40,0.25,0.15,0.12,0.08] },
  { code: 'KR', name: 'Korea',      flag: '🇰🇷', color: '#457B9D',
    regions: ['Seoul/Gyeonggi','Busan/South','Incheon','Daegu/N.Gyeongsang','Others'],
    rw: [0.50,0.20,0.12,0.10,0.08] },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', color: '#2DC653',
    regions: ['Dhaka','Chittagong','Rajshahi','Sylhet','Others'],
    rw: [0.45,0.25,0.12,0.10,0.08] },
  { code: 'NP', name: 'Nepal',      flag: '🇳🇵', color: '#9B5DE5',
    regions: ['Kathmandu Valley','Pokhara','Biratnagar','Chitwan','Others'],
    rw: [0.55,0.18,0.12,0.08,0.07] },
];

const P = {
  IN: { traffic:150000,leads:18000,conv:0.21,prem:900, growth:0.20,agents:3000,budget:180000,persist:0.82,claim:0.48,nps:38,pMix:[0.30,0.15,0.20,0.25,0.10],lMix:[0.35,0.25,0.15,0.15,0.10],tw:[0.08,0.22,0.38,0.32] },
  JP: { traffic: 70000,leads: 8500,conv:0.32,prem:4000,growth:0.08,agents:1400,budget:220000,persist:0.91,claim:0.38,nps:45,pMix:[0.25,0.30,0.25,0.10,0.10],lMix:[0.30,0.20,0.10,0.20,0.20],tw:[0.10,0.28,0.38,0.24] },
  KR: { traffic: 50000,leads: 6500,conv:0.30,prem:2500,growth:0.14,agents: 950,budget:140000,persist:0.88,claim:0.41,nps:42,pMix:[0.28,0.22,0.20,0.20,0.10],lMix:[0.40,0.20,0.10,0.15,0.15],tw:[0.09,0.25,0.40,0.26] },
  BD: { traffic: 30000,leads: 4000,conv:0.16,prem: 420,growth:0.25,agents: 750,budget: 50000,persist:0.74,claim:0.55,nps:32,pMix:[0.35,0.20,0.30,0.05,0.10],lMix:[0.20,0.30,0.25,0.20,0.05],tw:[0.05,0.18,0.42,0.35] },
  NP: { traffic: 12000,leads: 1500,conv:0.13,prem: 280,growth:0.22,agents: 300,budget: 18000,persist:0.71,claim:0.58,nps:29,pMix:[0.40,0.20,0.30,0.02,0.08],lMix:[0.15,0.35,0.30,0.15,0.05],tw:[0.04,0.16,0.40,0.40] },
};

const SEA = [0.82,0.78,0.88,0.94,1.02,1.06,1.01,0.96,1.12,1.18,1.24,1.35];
const PROD_TYPES   = ['Term Life','Whole Life','Endowment','ULIP','Health'];
const LEAD_SRCS    = ['Digital/Social','Agent Referral','Walk-in','Phone','Bancassurance'];
const CHANNELS     = ['Digital/Social','TV/Broadcast','Print/OOH','Agent Campaign','Email/SMS'];
const AGENT_TIERS  = ['Platinum','Gold','Silver','Bronze'];
const CH_W         = [0.35,0.25,0.15,0.15,0.10];
const MO_NAMES     = ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// cut-off: data available through Oct 2024
function isValid(y, mo) { return !(y === 2024 && mo > 9); }

// ─── Monthly Primary Dataset (~290 rows) ──────────────────────────────────────
function genMonthly() {
  const rows = [];
  COUNTRIES.forEach(({ code, name }) => {
    const p = P[code];
    for (let y = 2020; y <= 2024; y++) {
      for (let mo = 0; mo < 12; mo++) {
        if (!isValid(y, mo + 1)) continue;
        const mn = (y - 2020) * 12 + mo;
        const gf = Math.pow(1 + p.growth / 12, mn);
        const sf = SEA[mo];

        const traffic    = ni(rM, p.traffic * gf * sf);
        const uniqV      = ni(rM, traffic * n(rM, 0.72, 0.05));
        const leads      = ni(rM, p.leads  * gf * sf);
        const qualL      = ni(rM, leads * n(rM, 0.65, 0.08));
        const hotL       = ni(rM, qualL * n(rM, 0.25, 0.12));
        const conv       = Math.min(0.48, Math.max(0.05, n(rM, p.conv + mn * 0.0005, 0.10)));
        const policies   = ni(rM, leads * conv);
        const avgP       = ni(rM, p.prem * (1 + mn * 0.002), 0.09);
        const newPrem    = policies * avgP;

        const renewDue   = ni(rM, policies * 0.85 * Math.min(y - 2019, 4));
        const persist    = Math.min(0.97, Math.max(0.60, n(rM, p.persist + mn * 0.0003, 0.05)));
        const renewCol   = ni(rM, renewDue * persist);
        const renewPrem  = Math.round(renewCol * avgP * 0.90);
        const lapseRate  = Math.round((1 - persist) * 1000) / 10;

        const claimR     = Math.min(0.80, Math.max(0.22, n(rM, p.claim - mn * 0.001, 0.08)));
        const claimsSub  = ni(rM, policies * 0.12 * sf);
        const claimsApp  = ni(rM, claimsSub * n(rM, 0.88, 0.05));
        const claimsAmt  = Math.round(claimsApp * avgP * claimR * 0.6);
        const tADays     = Math.max(3, ni(rM, 8 - mn * 0.02, 0.12));

        const budget     = ni(rM, p.budget * gf * sf, 0.20);
        const roi        = Math.round(n(rM, 3.5 + mn * 0.04, 0.14) * 10) / 10;
        const campaigns  = ni(rM, 8 * gf * sf, 0.25);
        const agents     = ni(rM, p.agents * Math.pow(1 + 0.10 / 12, mn), 0.05);
        const newAgents  = ni(rM, agents * 0.04, 0.3);
        const agentChurn = ni(rM, agents * 0.02, 0.3);
        const ppa        = agents ? Math.round((policies / agents) * 10) / 10 : 0;
        const achRate    = Math.round(n(rM, 0.94, 0.09) * 1000) / 10;

        const nps        = Math.round(n(rM, p.nps + mn * 0.05, 0.10));
        const csat       = Math.round(n(rM, 3.9 + mn * 0.005, 0.08) * 10) / 10;
        const lostCust   = ni(rM, policies * (1 - persist) * 0.4);

        const polTgt     = ni(rM, policies * 1.08, 0.04);
        const premTgt    = ni(rM, newPrem * 1.08, 0.04);
        const leadsTgt   = ni(rM, leads * 1.08, 0.04);
        const budgetTgt  = Math.round(budget * 1.05);

        const policyBreakdown = PROD_TYPES.map((type, i) => ({
          type,
          count:    Math.max(0, ni(rM, policies * p.pMix[i])),
          premium:  Math.max(0, Math.round(policies * p.pMix[i] * avgP * n(rM, 1, 0.08))),
          lapseRate:Math.round(n(rM, lapseRate * (i === 3 ? 1.3 : i === 4 ? 0.8 : 1), 0.10) * 10) / 10,
        }));

        const leadBreakdown = LEAD_SRCS.map((source, i) => ({
          source,
          count:     Math.max(0, ni(rM, leads * p.lMix[i])),
          qualified: Math.max(0, ni(rM, leads * p.lMix[i] * 0.65)),
          converted: Math.max(0, ni(rM, leads * p.lMix[i] * conv)),
          cost:      Math.round(budget * CH_W[i] / Math.max(1, ni(rM, leads * p.lMix[i]))),
        }));

        const channelBreakdown = CHANNELS.map((channel, i) => ({
          channel,
          spend:       Math.round(budget * CH_W[i] * n(rM, 1, 0.15)),
          leads:       Math.max(0, ni(rM, leads * CH_W[i], 0.20)),
          conversions: Math.max(0, ni(rM, leads * CH_W[i] * conv, 0.25)),
          impressions: Math.round(budget * CH_W[i] * n(rM, 85, 0.3)),
        }));

        rows.push({
          country: code, countryName: name,
          year: y, month: mo + 1, quarter: Math.ceil((mo + 1) / 3),
          monthName: MO_NAMES[mo + 1],
          date: `${y}-${String(mo + 1).padStart(2, '0')}`,

          traffic, uniqueVisitors: uniqV,
          bounceRate: Math.round(n(rM, 42 - mn * 0.05, 0.10) * 10) / 10,
          avgSessionMin: Math.round(n(rM, 3.2 + mn * 0.01, 0.10) * 10) / 10,
          leads, qualifiedLeads: qualL, hotLeads: hotL,
          leadQualityScore: Math.round(n(rM, 65 + mn * 0.05, 0.08)),
          costPerLead: leads ? Math.round(budget / leads) : 0,
          conversionRate: Math.round(conv * 1000) / 10,

          policiesSold: policies, avgPremium: avgP,
          newPremium: Math.round(newPrem),
          renewalsDue: renewDue, renewalsCollected: renewCol,
          renewalPremium: renewPrem,
          totalPremium: Math.round(newPrem) + renewPrem,
          persistencyRate: Math.round(persist * 1000) / 10,
          lapseRate,

          claimsSubmitted: claimsSub, claimsApproved: claimsApp,
          claimsAmount: claimsAmt, claimRatio: Math.round(claimR * 1000) / 10,
          turnaroundDays: tADays,

          campaignBudget: budget, campaignsRun: campaigns,
          campaignROI: roi, budgetTarget: budgetTgt,

          activeAgents: agents, newAgents, agentChurn,
          avgPoliciesPerAgent: ppa, achievementRate: achRate,

          nps, csat, newCustomers: policies, lostCustomers: lostCust,

          policiesTarget: polTgt, premiumTarget: premTgt,
          leadsTarget: leadsTgt,

          policyBreakdown, leadBreakdown, channelBreakdown,
        });
      }
    }
  });
  return rows;
}

// ─── Regional Monthly Dataset (~1,450 rows) ───────────────────────────────────
function genRegional() {
  const rows = [];
  COUNTRIES.forEach(ctry => {
    const p = P[ctry.code];
    for (let y = 2020; y <= 2024; y++) {
      for (let mo = 0; mo < 12; mo++) {
        if (!isValid(y, mo + 1)) continue;
        const mn = (y - 2020) * 12 + mo;
        const gf = Math.pow(1 + p.growth / 12, mn);
        const sf = SEA[mo];
        ctry.regions.forEach((region, ri) => {
          const w     = ctry.rw[ri];
          const leads = ni(rR, p.leads * gf * sf * w, 0.12);
          const conv  = Math.min(0.48, Math.max(0.05, n(rR, p.conv * n(rR, 1 + ri * 0.02, 0.05), 0.10)));
          const pol   = ni(rR, leads * conv);
          const prem  = Math.round(pol * ni(rR, p.prem * (1 + mn * 0.002), 0.08));
          const agents= ni(rR, p.agents * Math.pow(1 + 0.10 / 12, mn) * w, 0.08);
          rows.push({
            country: ctry.code, countryName: ctry.name, region,
            year: y, month: mo + 1, quarter: Math.ceil((mo + 1) / 3),
            date: `${y}-${String(mo + 1).padStart(2, '0')}`,
            leads, policiesSold: pol, newPremium: prem, activeAgents: agents,
            conversionRate: Math.round(conv * 1000) / 10,
            avgPremium: pol ? Math.round(prem / pol) : 0,
          });
        });
      }
    }
  });
  return rows;
}

// ─── Agent Tier Monthly Dataset (~1,160 rows) ─────────────────────────────────
const TIER_P = {
  Platinum: { polBase: 32, premMult: 2.1, ach: 0.98, trainH: 12 },
  Gold:     { polBase: 18, premMult: 1.5, ach: 0.93, trainH:  8 },
  Silver:   { polBase:  9, premMult: 1.0, ach: 0.86, trainH:  5 },
  Bronze:   { polBase:  4, premMult: 0.7, ach: 0.72, trainH:  3 },
};
function genAgentTier() {
  const rows = [];
  COUNTRIES.forEach(({ code, name }) => {
    const p = P[code];
    for (let y = 2020; y <= 2024; y++) {
      for (let mo = 0; mo < 12; mo++) {
        if (!isValid(y, mo + 1)) continue;
        const mn = (y - 2020) * 12 + mo;
        const gf = Math.pow(1 + p.growth / 12, mn);
        const sf = SEA[mo];
        const totalAgents = ni(rA, p.agents * Math.pow(1 + 0.10 / 12, mn), 0.05);
        AGENT_TIERS.forEach((tier, ti) => {
          const tp  = TIER_P[tier];
          const tw  = p.tw[ti];
          const cnt = ni(rA, totalAgents * tw, 0.08);
          const pol = ni(rA, cnt * tp.polBase * sf * gf, 0.12);
          const prem= Math.round(pol * ni(rA, p.prem * tp.premMult * (1 + mn * 0.002), 0.10));
          rows.push({
            country: code, countryName: name, tier,
            year: y, month: mo + 1, quarter: Math.ceil((mo + 1) / 3),
            date: `${y}-${String(mo + 1).padStart(2, '0')}`,
            agentCount: cnt, policiesSold: pol, newPremium: prem,
            avgPoliciesPerAgent: cnt ? Math.round((pol / cnt) * 10) / 10 : 0,
            avgPremiumPerAgent:  cnt ? Math.round(prem / cnt) : 0,
            achievementRate: Math.round(n(rA, tp.ach, 0.08) * 1000) / 10,
            trainingHours: Math.round(n(rA, tp.trainH, 0.15)),
          });
        });
      }
    }
  });
  return rows;
}

// ─── Product Monthly Dataset (~1,450 rows) ────────────────────────────────────
const PROD_P = {
  'Term Life':  { mult: 0.7,  lapse: 0.10, claim: 0.35, grow: 0.15 },
  'Whole Life': { mult: 1.5,  lapse: 0.06, claim: 0.30, grow: 0.08 },
  'Endowment':  { mult: 1.2,  lapse: 0.08, claim: 0.25, grow: 0.10 },
  'ULIP':       { mult: 1.8,  lapse: 0.14, claim: 0.20, grow: 0.18 },
  'Health':     { mult: 0.9,  lapse: 0.12, claim: 0.55, grow: 0.22 },
};
function genProduct() {
  const rows = [];
  COUNTRIES.forEach(({ code, name }) => {
    const p = P[code];
    for (let y = 2020; y <= 2024; y++) {
      for (let mo = 0; mo < 12; mo++) {
        if (!isValid(y, mo + 1)) continue;
        const mn  = (y - 2020) * 12 + mo;
        const gf  = Math.pow(1 + p.growth / 12, mn);
        const sf  = SEA[mo];
        const tot = ni(rP, p.leads * gf * sf * p.conv);
        PROD_TYPES.forEach((prod, pi) => {
          const pp  = PROD_P[prod];
          const pgf = Math.pow(1 + pp.grow / 12, mn);
          const pol = ni(rP, tot * p.pMix[pi] * pgf, 0.12);
          const prem= Math.round(pol * ni(rP, p.prem * pp.mult * (1 + mn * 0.002), 0.10));
          rows.push({
            country: code, countryName: name, product: prod,
            year: y, month: mo + 1, quarter: Math.ceil((mo + 1) / 3),
            date: `${y}-${String(mo + 1).padStart(2, '0')}`,
            policiesSold: pol, newPremium: prem,
            lapseRate:   Math.round(n(rP, pp.lapse, 0.12)  * 1000) / 10,
            claimRatio:  Math.round(n(rP, pp.claim, 0.10)  * 1000) / 10,
            renewalRate: Math.round(n(rP, 1 - pp.lapse, 0.08) * 1000) / 10,
            avgPremium:  pol ? Math.round(prem / pol) : 0,
          });
        });
      }
    }
  });
  return rows;
}

// ─── Individual Campaign Dataset (~500 records) ───────────────────────────────
const CAMP_TYPES = ['Brand Awareness','Lead Generation','Product Launch','Retention','Seasonal Promo','Cross-sell/Upsell'];
const CAMP_CHANS = ['Digital/Social','Television','Print & OOH','Email/SMS','Outdoor','Integrated 360°'];
function genCampaigns() {
  const rows = [];
  let id = 1001;
  COUNTRIES.forEach(({ code, name }) => {
    const p = P[code];
    for (let y = 2020; y <= 2024; y++) {
      const count = y === 2024 ? 14 : 20;
      for (let c = 0; c < count; c++) {
        const smRaw = Math.floor(rC() * 11) + 1;
        const sm    = Math.max(1, Math.min(smRaw, 12));
        const dur   = Math.max(1, Math.round(rC() * 3) + 1);
        const em    = Math.min(12, sm + dur);
        if (y === 2024 && sm > 10) continue;
        const budget     = ni(rC, p.budget * 0.55, 0.40);
        const leads      = ni(rC, p.leads * dur * 0.38, 0.30);
        const conv       = n(rC, p.conv, 0.15);
        const conversions= ni(rC, leads * conv);
        const revenue    = Math.round(conversions * ni(rC, p.prem, 0.10));
        const roi        = budget > 0 ? Math.round((revenue / budget) * 10) / 10 : 0;
        const ti         = Math.min(Math.floor(rC() * CAMP_TYPES.length), CAMP_TYPES.length - 1);
        const ci         = Math.min(Math.floor(rC() * CAMP_CHANS.length), CAMP_CHANS.length - 1);
        const status     = y < 2024 ? 'Completed' : (sm + dur > 10 ? 'Active' : 'Completed');
        rows.push({
          id: `CAM-${id++}`, country: code, countryName: name,
          name: `${name} — ${CAMP_TYPES[ti]} ${y}-${String(c + 1).padStart(2, '0')}`,
          type: CAMP_TYPES[ti], channel: CAMP_CHANS[ci], year: y,
          startDate: `${y}-${String(sm).padStart(2,'0')}-01`,
          endDate:   `${y}-${String(em).padStart(2,'0')}-28`,
          budget: Math.round(budget),
          impressions: Math.round(budget * n(rC, 82, 0.30)),
          clicks:      Math.round(budget * n(rC,  4, 0.30)),
          leads: Math.max(0, Math.round(leads)),
          conversions: Math.max(0, Math.round(conversions)),
          revenue: Math.max(0, revenue),
          roi: Math.max(0, roi),
          cpl: leads > 0 ? Math.round(budget / leads) : 0,
          ctr: budget > 0 ? Math.round((leads / Math.round(budget * n(rC, 82, 0.30))) * 10000) / 100 : 0,
          status,
        });
      }
    }
  });
  return rows;
}

// ─── Customer Dataset (~10,000 records) ──────────────────────────────────────
const SEGMENTS   = ['HNI','Mass Affluent','Mass Market'];
const SEG_W      = [0.10, 0.30, 0.60];
const GENDERS    = ['Male','Female'];
const CUST_CHANS = ['Digital','Agent','Walk-in','Referral','Bancassurance'];
function genCustomers() {
  const rows = [];
  let id = 90001;
  COUNTRIES.forEach(ctry => {
    const p = P[ctry.code];
    const count = { IN: 2500, JP: 2000, KR: 2000, BD: 2000, NP: 1500 }[ctry.code];
    for (let i = 0; i < count; i++) {
      const segI    = SEG_W[0] > rX() ? 0 : SEG_W[1] > rX() ? 1 : 2;
      const premMult= [3.5, 1.8, 0.75][segI];
      const prem    = ni(rX, p.prem * premMult, 0.30);
      const prodI   = Math.min(Math.floor(rX() * 5), 4);
      const joinY   = 2020 + Math.floor(rX() * 5);
      const joinM   = Math.floor(rX() * 12) + 1;
      const churnP  = [0.04, 0.10, 0.20][segI];
      const status  = rX() < churnP ? 'Lapsed' : rX() < 0.03 ? 'Suspended' : 'Active';
      const age     = 25 + Math.round(rX() * 40);
      const nps     = Math.round(n(rX, p.nps + [15, 5, -5][segI], 0.20));
      const riI     = Math.min(Math.floor(rX() * ctry.regions.length), ctry.regions.length - 1);
      const chI     = Math.min(Math.floor(rX() * CUST_CHANS.length), CUST_CHANS.length - 1);
      rows.push({
        id: `CUST-${id++}`,
        country: ctry.code, countryName: ctry.name,
        region: ctry.regions[riI],
        segment: SEGMENTS[segI],
        gender: GENDERS[rX() < 0.52 ? 0 : 1],
        age,
        product: PROD_TYPES[prodI],
        annualPremium: prem,
        joinYear: Math.min(joinY, 2024),
        joinMonth: joinM,
        joinDate: `${Math.min(joinY,2024)}-${String(joinM).padStart(2,'0')}-01`,
        status,
        nps: Math.min(100, Math.max(-100, nps)),
        claimsCount: Math.round(rX() * 2),
        channel: CUST_CHANS[chI],
        lifetimeValue: Math.round(prem * (2025 - Math.min(joinY, 2024)) * n(rX, 0.92, 0.08)),
      });
    }
  });
  return rows;
}

// ─── Exports ──────────────────────────────────────────────────────────────────
export const MONTHLY_DATA    = genMonthly();
export const REGIONAL_DATA   = genRegional();
export const AGENT_TIER_DATA = genAgentTier();
export const PRODUCT_DATA    = genProduct();
export const CAMPAIGN_DATA   = genCampaigns();
export const CUSTOMER_DATA   = genCustomers();

export const DATA_STATS = {
  total:     MONTHLY_DATA.length + REGIONAL_DATA.length + AGENT_TIER_DATA.length +
             PRODUCT_DATA.length + CAMPAIGN_DATA.length + CUSTOMER_DATA.length,
  monthly:   MONTHLY_DATA.length,
  regional:  REGIONAL_DATA.length,
  agentTier: AGENT_TIER_DATA.length,
  product:   PRODUCT_DATA.length,
  campaigns: CAMPAIGN_DATA.length,
  customers: CUSTOMER_DATA.length,
};
