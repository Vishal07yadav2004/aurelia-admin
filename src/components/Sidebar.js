import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Package, Image, ShoppingBag, LogOut } from 'lucide-react';
import './Sidebar.css';

const NAV = [
  { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard'  },
  { to: '/products',   icon: Package,          label: 'Products'   },
  { to: '/categories', icon: Image,            label: 'Categories' },
  { to: '/orders',     icon: ShoppingBag,      label: 'Orders'     },
];

export default function Sidebar({ onLogout }) {
  return (
    <aside className="sidebar">
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
  );
}