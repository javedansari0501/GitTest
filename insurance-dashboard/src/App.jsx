import React, { useState, createContext, useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Overview from './pages/Overview.jsx';
import TrafficLeads from './pages/TrafficLeads.jsx';
import PolicySales from './pages/PolicySales.jsx';
import CampaignPerformance from './pages/CampaignPerformance.jsx';
import SalesPerformance from './pages/SalesPerformance.jsx';
import { COUNTRIES, YEARS } from './services/dataService.js';

export const FilterContext = createContext(null);
export const useFilters = () => useContext(FilterContext);

export default function App() {
  const [selectedCountries, setSelectedCountries] = useState(COUNTRIES.map(c => c.code));
  const [selectedYears, setSelectedYears] = useState([...YEARS]);

  const filters = { countries: selectedCountries, years: selectedYears, months: [] };

  return (
    <FilterContext.Provider value={{ selectedCountries, setSelectedCountries, selectedYears, setSelectedYears, filters }}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/overview" replace />} />
          <Route path="/overview"  element={<Overview />} />
          <Route path="/traffic"   element={<TrafficLeads />} />
          <Route path="/policy"    element={<PolicySales />} />
          <Route path="/campaign"  element={<CampaignPerformance />} />
          <Route path="/sales"     element={<SalesPerformance />} />
        </Routes>
      </Layout>
    </FilterContext.Provider>
  );
}
