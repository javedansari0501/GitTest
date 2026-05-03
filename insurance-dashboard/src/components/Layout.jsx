import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, TrendingUp, FileText, Megaphone, Users, Shield,
} from 'lucide-react';
import { useFilters } from '../App.jsx';
import { COUNTRIES, YEARS } from '../services/dataService.js';

const NAV = [
  { path: '/overview', label: 'Overview',              Icon: LayoutDashboard },
  { path: '/traffic',  label: 'Traffic & Leads',       Icon: TrendingUp      },
  { path: '/policy',   label: 'Policy Sales',          Icon: FileText        },
  { path: '/campaign', label: 'Campaign Performance',  Icon: Megaphone       },
  { path: '/sales',    label: 'Sales Performance',     Icon: Users           },
];

const PAGE_TITLES = {
  '/overview': 'Overview',
  '/traffic':  'Traffic & Leads',
  '/policy':   'Policy Sales',
  '/campaign': 'Campaign Performance',
  '/sales':    'Sales Performance',
};

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const { selectedCountries, setSelectedCountries, selectedYears, setSelectedYears } = useFilters();

  const toggleCountry = code =>
    setSelectedCountries(prev =>
      prev.includes(code)
        ? prev.length > 1 ? prev.filter(c => c !== code) : prev
        : [...prev, code]
    );

  const toggleYear = year =>
    setSelectedYears(prev =>
      prev.includes(year)
        ? prev.length > 1 ? prev.filter(y => y !== year) : prev
        : [...prev, year].sort((a, b) => a - b)
    );

  const yearRange = `${selectedYears[0]}–${selectedYears[selectedYears.length - 1]}`;
  const ctryLabel = `${selectedCountries.length} of 5 countries`;

  return (
    <div className="layout">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <Shield size={18} color="#fff" />
          </div>
          <div>
            <div className="brand-title">APAC Insurance</div>
            <div className="brand-sub">Analytics Dashboard</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ path, label, Icon }) => (
            <NavLink
              key={path} to={path}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-filters">
          <div className="filter-section">
            <div className="filter-label">Countries</div>
            <div className="country-chips">
              {COUNTRIES.map(c => (
                <button
                  key={c.code}
                  className={`country-chip${selectedCountries.includes(c.code) ? ' active' : ''}`}
                  style={selectedCountries.includes(c.code) ? { background: c.color + '22', borderColor: c.color } : {}}
                  onClick={() => toggleCountry(c.code)}
                >
                  <span className="chip-dot" style={{ background: c.color }} />
                  {c.flag} {c.name}
                </button>
              ))}
            </div>
          </div>

          <div className="filter-section" style={{ marginBottom: 0 }}>
            <div className="filter-label">Years</div>
            <div className="year-chips">
              {YEARS.map(y => (
                <button
                  key={y}
                  className={`year-chip${selectedYears.includes(y) ? ' active' : ''}`}
                  onClick={() => toggleYear(y)}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="top-bar">
          <h1 className="page-title">{PAGE_TITLES[pathname] || 'Dashboard'}</h1>
          <span className="top-badge">{yearRange} · {ctryLabel}</span>
        </div>
        <div className="page-content">{children}</div>
      </main>
    </div>
  );
}
