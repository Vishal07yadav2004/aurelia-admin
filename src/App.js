import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProductManager from './pages/ProductManager';
import CategoryManager from './pages/CategoryManager';
import OrdersPage from './pages/OrdersPage';
import './styles/global.css';

export const ToastContext = React.createContext();

export default function App() {
  const [loggedIn, setLoggedIn] = useState(
    localStorage.getItem('aurelia_admin') === 'true'
  );
  const [toast, setToast] = useState({ show: false, msg: '', type: 'success' });

  const showToast = (msg, type = 'success') => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast(t => ({ ...t, show: false })), 3000);
  };

  if (!loggedIn) return <LoginPage onLogin={() => { localStorage.setItem('aurelia_admin','true'); setLoggedIn(true); }} />;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <BrowserRouter>
        <div style={{ display:'flex', minHeight:'100vh' }}>
          <Sidebar onLogout={() => { localStorage.removeItem('aurelia_admin'); setLoggedIn(false); }} />
          <main style={{ marginLeft: 'var(--sidebar-width)', flex:1, padding:'32px', maxWidth:'calc(100vw - 240px)', overflowX:'hidden' }}>
            <Routes>
              <Route path="/"          element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/products"  element={<ProductManager />} />
              <Route path="/categories"element={<CategoryManager />} />
              <Route path="/orders"    element={<OrdersPage />} />
            </Routes>
          </main>
        </div>

        {/* GLOBAL TOAST */}
        <div className={`toast ${toast.type} ${toast.show ? 'show' : ''}`}>
          {toast.type === 'success' ? '✓' : '✕'} &nbsp;{toast.msg}
        </div>
      </BrowserRouter>
    </ToastContext.Provider>
  );
}