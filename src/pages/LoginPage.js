import React, { useState } from 'react';
import './LoginPage.css';

import { getAuth, signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import app from '../firebase/config'; // adjust path if needed

const auth = getAuth(app);

export default function LoginPage({ onLogin }) {
  const [user, setUser]  = useState('');
  const [pass, setPass]  = useState('');
  const [err, setErr]    = useState('');
  const [loading, setLoading] = useState(false);
  const [resetMode, setResetMode] = useState(false);
  const [resetSent, setResetSent] = useState(false);

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

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    const email = user.trim();
    if (!email) {
      setErr('Enter your admin email address first.');
      return;
    }

    setLoading(true);
    setErr('');
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (error) {
      // Keep the response generic so the app does not reveal registered emails.
    }
    setResetSent(true);
    setLoading(false);
  };

  const openReset = () => {
    setErr('');
    setResetSent(false);
    setResetMode(true);
  };

  const closeReset = () => {
    setErr('');
    setResetSent(false);
    setResetMode(false);
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo">Kanyamaa </div>
        <p className="login-sub">Admin Panel</p>

        <form onSubmit={resetMode ? handlePasswordReset : handleLogin} className="login-form">
          <div className="login-field">
            <label className="field-label">Email</label>
            <input
              className="field-input"
              type="email"
              value={user}
              onChange={e => { setUser(e.target.value); setErr(''); setResetSent(false); }}
              placeholder="admin@aurelia.com"
              autoFocus
            />
          </div>

          {!resetMode && <div className="login-field">
            <label className="field-label">Password</label>
            <input
              className="field-input"
              type="password"
              value={pass}
              onChange={e => { setPass(e.target.value); setErr(''); }}
              placeholder="••••••••"
            />
          </div>}

          {!resetMode && <button className="forgot-password-btn" type="button" onClick={openReset}>
            Forgot password?
          </button>}

          {err && <p className="login-err">{err}</p>}
          {resetSent && <p className="login-success">If this email is registered, a password-reset link has been sent. Check your inbox and spam folder.</p>}

          <button className="btn-primary login-btn" type="submit" disabled={loading}>
            {loading ? (resetMode ? 'Sending link...' : 'Signing in...') : (resetMode ? 'Send reset link' : 'Sign In')}
          </button>
          {resetMode && <button className="back-to-login-btn" type="button" onClick={closeReset} disabled={loading}>Back to sign in</button>}
        </form>
      </div>
    </div>
  );
}
