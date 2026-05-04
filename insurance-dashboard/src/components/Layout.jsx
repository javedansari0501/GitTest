import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, FileText, Megaphone, Users, UserCircle, Shield,
} from 'lucide-react';
import { useApp } from '../App.jsx';
import { COUNTRIES, DATA_STATS } from '../services/dataService.js';
import PeriodSelector from './PeriodSelector.jsx';
import { periodLabel } from '../services/periodService.js';

const NAV = [
  { path: '/overview', label: 'Overview',             Icon: LayoutDashboard },
  { path: '/traffic',  label: 'Traffic & Leads',      Icon: TrendingUp      },
  { path: '/policy',   label: 'Policy Sales',         Icon: FileText        },
  { path: '/campaign', label: 'Campaign Performance', Icon: Megaphone       },
  { path: '/sales',    label: 'Sales Performance',    Icon: Users           },
  { path: '/customer', label: 'Customer Insights',    Icon: UserCircle      },
];

const TITLES = Object.fromEntries(NAV.map(n => [n.path, n.label]));

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const {
    selectedCountries, setSelectedCountries,
    periodCode, setPeriodCode,
  } = useApp();

  const toggleCountry = code =>
    setSelectedCountries(prev =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter(c => c !== code) : prev
        : [...prev, code]
    );

  const selAll = () => setSelectedCountries(COUNTRIES.map(c => c.code));
  const selNone = () => setSelectedCountries([COUNTRIES[0].code]);

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon"><Shield size={16} color="#fff" /></div>
          <div>
            <div className="brand-title">APAC Insurance</div>
            <div className="brand-sub">Enterprise Analytics</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ path, label, Icon }) => (
            <NavLink
              key={path} to={path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-filters">
          <div className="filter-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <div className="filter-label">Countries</div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={selAll}  style={{ fontSize: 10, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>All</button>
                <button onClick={selNone} style={{ fontSize: 10, color: '#3B82F6', background: 'none', border: 'none', cursor: 'pointer' }}>None</button>
              </div>
            </div>
            <div className="country-chips">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  className={`country-chip${selectedCountries.includes(c.code) ? ' active' : ''}`}
                  style={selectedCountries.includes(c.code)
                    ? { background: c.color + '20', borderColor: c.color + '80' }
                    : {}}
                  onClick={() => toggleCountry(c.code)}
                >
                  <span className="chip-dot" style={{ background: c.color }} />
                  {c.flag} {c.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="top-bar">
          <div className="top-bar-left">
            <h1 className="page-title">{TITLES[pathname] || 'Dashboard'}</h1>
            <span className="data-badge">
              {periodLabel(periodCode)} · {selectedCountries.length} countr{selectedCountries.length === 1 ? 'y' : 'ies'}
            </span>
          </div>
          <div className="top-bar-right">
            <PeriodSelector value={periodCode} onChange={setPeriodCode} />
          </div>
        </div>

        <div className="page-content">{children}</div>

        <div className="data-footer">
          <span><span className="df-dot" />{DATA_STATS.total.toLocaleString()} total records</span>
          <span>Monthly: {DATA_STATS.monthly}</span>
          <span>Regional: {DATA_STATS.regional}</span>
          <span>Customers: {DATA_STATS.customers.toLocaleString()}</span>
          <span>Campaigns: {DATA_STATS.campaigns}</span>
          <span style={{ marginLeft: 'auto' }}>Simulated data · Oct 2024</span>
        </div>
      </main>
    </div>
  );
}
