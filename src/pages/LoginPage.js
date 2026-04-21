import React, { useState } from 'react';
import './LoginPage.css';

import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import app from '../firebase/config'; // adjust path if needed

const auth = getAuth(app);

export default function LoginPage({ onLogin }) {
  const [user, setUser]  = useState('');
  const [pass, setPass]  = useState('');
  const [err, setErr]    = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');

    try {
      await signInWithEmailAndPassword(auth, user, pass);
      onLogin(); // ✅ success
    } catch (error) {
      setErr('Invalid email or password');
    }

    setLoading(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">AURELIA</div>
        <p className="login-sub">Admin Panel</p>

        <form onSubmit={handleLogin} className="login-form">
          <div className="login-field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={user}
              onChange={e => { setUser(e.target.value); setErr(''); }}
              placeholder="admin@aurelia.com"
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
      </div>
    </div>
  );
}