// Seeded deterministic RNG (LCG) — replace generateData() body with an API fetch
// when connecting to a real backend.
function createRng(seed) {
  let s = seed;
  return () => {
    s = Math.abs((s * 16807) % 2147483647);
    return (s - 1) / 2147483646;
  };
}

const rng = createRng(42);
const noise = (base, v = 0.15) => base * (1 + (rng() - 0.5) * v * 2);

export const COUNTRIES = [
  { code: 'IN', name: 'India',      flag: '🇮🇳', color: '#FF6B35' },
  { code: 'JP', name: 'Japan',      flag: '🇯🇵', color: '#E63946' },
  { code: 'KR', name: 'Korea',      flag: '🇰🇷', color: '#457B9D' },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', color: '#2DC653' },
  { code: 'NP', name: 'Nepal',      flag: '🇳🇵', color: '#9B5DE5' },
];

const PROFILES = {
  IN: { traffic: 120000, leads: 15000, conv: 0.20, premium: 800,  growth: 0.18, agents: 2500, budget: 150000, pMix: [0.30,0.15,0.20,0.25,0.10], lMix: [0.35,0.25,0.15,0.15,0.10] },
  JP: { traffic:  60000, leads:  7000, conv: 0.30, premium: 3500, growth: 0.08, agents: 1200, budget: 200000, pMix: [0.25,0.30,0.25,0.10,0.10], lMix: [0.30,0.20,0.10,0.20,0.20] },
  KR: { traffic:  40000, leads:  5000, conv: 0.28, premium: 2200, growth: 0.12, agents:  800, budget: 120000, pMix: [0.28,0.22,0.20,0.20,0.10], lMix: [0.40,0.20,0.10,0.15,0.15] },
  BD: { traffic:  25000, leads:  3000, conv: 0.15, premium:  350, growth: 0.22, agents:  600, budget:  40000, pMix: [0.35,0.20,0.30,0.05,0.10], lMix: [0.20,0.30,0.25,0.20,0.05] },
  NP: { traffic:  10000, leads:  1200, conv: 0.12, premium:  250, growth: 0.20, agents:  250, budget:  15000, pMix: [0.40,0.20,0.30,0.02,0.08], lMix: [0.15,0.35,0.30,0.15,0.05] },
};

const SEASONAL     = [0.85,0.80,0.90,0.95,1.00,1.05,1.00,0.95,1.10,1.15,1.20,1.30];
const POLICY_TYPES = ['Term Life','Whole Life','Endowment','ULIP','Health'];
const LEAD_SOURCES = ['Digital','Agent Referral','Walk-in','Phone','Bancassurance'];
const CHANNELS     = ['Digital/Social','TV/Broadcast','Print/OOH','Agent Campaign','Email/SMS'];
const CH_WEIGHTS   = [0.35,0.25,0.15,0.15,0.10];

function generateData() {
  const rows = [];
  COUNTRIES.forEach(({ code, name }) => {
    const p = PROFILES[code];
    for (let year = 2020; year <= 2024; year++) {
      for (let mo = 0; mo < 12; mo++) {
        const n = (year - 2020) * 12 + mo;
        const gf = Math.pow(1 + p.growth / 12, n);
        const sf = SEASONAL[mo];

        const traffic       = Math.round(noise(p.traffic * gf * sf));
        const leads         = Math.round(noise(p.leads * gf * sf));
        const conv          = Math.min(0.48, Math.max(0.05, noise(p.conv + n * 0.0005, 0.12)));
        const policiesSold  = Math.round(leads * conv);
        const avgPremium    = Math.round(noise(p.premium * (1 + n * 0.002), 0.10));
        const newPremium    = policiesSold * avgPremium;
        const renewalBase   = policiesSold * 0.65 * Math.min(year - 2019, 3);
        const renewalPol    = Math.round(noise(renewalBase, 0.10));
        const renewalPrem   = Math.round(renewalPol * avgPremium * 0.88);
        const budget        = Math.round(noise(p.budget * gf * sf, 0.20));
        const roi           = Math.round(noise(3.2 + n * 0.03, 0.15) * 10) / 10;
        const campaigns     = Math.round(noise(6 * gf * sf, 0.25));
        const agents        = Math.round(noise(p.agents * Math.pow(1 + 0.10 / 12, n), 0.05));
        const achievement   = Math.round(noise(0.93, 0.10) * 1000) / 10;

        rows.push({
          country: code, countryName: name,
          year, month: mo + 1,
          monthName: new Date(2020, mo, 1).toLocaleString('en', { month: 'short' }),
          date: `${year}-${String(mo + 1).padStart(2, '0')}`,

          traffic, leads,
          conversionRate: Math.round(conv * 1000) / 10,

          policiesSold, avgPremium,
          newPremium:    Math.round(newPremium),
          renewalPolicies: renewalPol,
          renewalPremium: renewalPrem,
          totalPremium:  Math.round(newPremium) + renewalPrem,

          campaignBudget: budget,
          campaignsRun:   campaigns,
          campaignROI:    roi,

          activeAgents: agents,
          avgPoliciesPerAgent: Math.round((policiesSold / agents) * 10) / 10,
          achievementRate: achievement,

          leadsTarget:    Math.round(leads    * noise(1.08, 0.04)),
          policiesTarget: Math.round(policiesSold * noise(1.08, 0.04)),
          premiumTarget:  Math.round(newPremium   * noise(1.08, 0.04)),

          policyBreakdown: POLICY_TYPES.map((type, i) => ({
            type, count: Math.max(0, Math.round(noise(policiesSold * p.pMix[i], 0.15))),
          })),
          leadBreakdown: LEAD_SOURCES.map((source, i) => ({
            source, count: Math.max(0, Math.round(noise(leads * p.lMix[i], 0.15))),
          })),
          channelBreakdown: CHANNELS.map((channel, i) => ({
            channel,
            spend: Math.round(budget * CH_WEIGHTS[i] * noise(1, 0.15)),
            leads: Math.max(0, Math.round(leads * CH_WEIGHTS[i] * noise(1, 0.20))),
          })),
        });
      }
    }
  });
  return rows;
}

export const RAW_DATA = generateData();
