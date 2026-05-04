import React, { useState, useMemo, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Overview          from './pages/Overview.jsx';
import TrafficLeads      from './pages/TrafficLeads.jsx';
import PolicySales       from './pages/PolicySales.jsx';
import CampaignPerformance from './pages/CampaignPerformance.jsx';
import SalesPerformance  from './pages/SalesPerformance.jsx';
import CustomerInsights  from './pages/CustomerInsights.jsx';
import { COUNTRIES }     from './services/dataService.js';
import { getPeriodRange, getPriorPeriodRange } from './services/periodService.js';

export const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

export default function App() {
  const [selectedCountries, setSelectedCountries] = useState(COUNTRIES.map(c => c.code));
  const [periodCode, setPeriodCode] = useState('YTD');

  const periodRange = useMemo(() => getPeriodRange(periodCode), [periodCode]);
  const priorRange  = useMemo(() => getPriorPeriodRange(periodCode), [periodCode]);

  const filters      = useMemo(() => ({ countries: selectedCountries, period: periodRange }), [selectedCountries, periodRange]);
  const priorFilters = useMemo(() => ({ countries: selectedCountries, period: priorRange  }), [selectedCountries, priorRange]);

  return (
    <AppContext.Provider value={{
      selectedCountries, setSelectedCountries,
      periodCode, setPeriodCode,
      periodRange, priorRange,
      filters, priorFilters,
    }}>
      <Layout>
        <Routes>
          <Route path="/"         element={<Navigate to="/overview" replace />} />
          <Route path="/overview" element={<Overview />} />
          <Route path="/traffic"  element={<TrafficLeads />} />
          <Route path="/policy"   element={<PolicySales />} />
          <Route path="/campaign" element={<CampaignPerformance />} />
          <Route path="/sales"    element={<SalesPerformance />} />
          <Route path="/customer" element={<CustomerInsights />} />
        </Routes>
      </Layout>
    </AppContext.Provider>
  );
}
