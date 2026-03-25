import React, { useState } from 'react';
import './LoginPage.css';

// Simple hardcoded credentials — change these to whatever you want
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'aurelia2024';

export default function LoginPage({ onLogin }) {
  const [user, setUser]  = useState('');
  const [pass, setPass]  = useState('');
  const [err, setErr]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        onLogin();
      } else {
        setErr('Invalid username or password');
        setLoading(false);
      }
    }, 600);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">AURELIA</div>
        <p className="login-sub">Admin Panel</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label className="field-label">Username</label>
            <input
              className="field-input"
              type="text"
              value={user}
              onChange={e => { setUser(e.target.value); setErr(''); }}
              placeholder="admin"
              autoFocus
            />
          </div>
          <div className="login-field">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setErr(''); }}
              placeholder="••••••••"
            />
          </div>
          {err && <p className="login-err">{err}</p>}
          <button className="btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="login-hint">Default: admin / aurelia2024</p>
      </div>
    </div>
  );
}