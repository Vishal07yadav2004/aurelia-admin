import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, Image, ShoppingBag, FileText, LogOut } from 'lucide-react';
import './Sidebar.css';

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'   },
  { to: '/products',   icon: Package,          label: 'Products'    },
  { to: '/categories', icon: Image,            label: 'Categories'  },
  { to: '/content',    icon: FileText,         label: 'Content'     },
  { to: '/orders',     icon: ShoppingBag,      label: 'Orders'      },
];

export default function Sidebar({ onLogout }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  return (
    <>
      {/* Hamburger button (mobile) */}
      <button
        className={`hamburger-btn ${mobileOpen ? 'open' : ''}`}
        onClick={() => setMobileOpen(v => !v)}
        aria-label="Toggle menu"
      >
        <span />
        <span />
        <span />
      </button>

      {/* Overlay (mobile) */}
      {mobileOpen && (
        <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-logo">
          <span className="logo-text">AURELIA</span>
          <span className="logo-tag">Admin</span>
        </div>

        <nav className="sidebar-nav">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <Icon size={17} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <button className="sidebar-logout" onClick={onLogout}>
          <LogOut size={16} strokeWidth={1.8} />
          <span>Logout</span>
        </button>
      </aside>
    </>
  );
}