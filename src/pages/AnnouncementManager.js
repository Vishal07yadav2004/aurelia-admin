import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2, Eye, EyeOff, Clock, Type } from 'lucide-react';
import './AnnouncementManager.css';

const DEFAULT_COUNTDOWN = {
  active: false,
  title: 'Summer Sale',
  endDate: '',
  bgColor: '#E85A2C',
  textColor: '#ffffff',
};

const DEFAULT_MARQUEE = {
  active: false,
  items: [
    'SUMMER SALE IS LIVE - UPTO 70% OFF',
    'FREE SHIPPING ABOVE INR 599',
    'FREE GIFT ON ORDER ABOVE INR 699',
    'COD AVAILABLE',
    'EASY RETURNS',
  ],
  bgColor: '#ffffff',
  textColor: '#1a1a1a',
  speed: 30,
};

export default function AnnouncementManager() {
  const { showToast } = useContext(ToastContext);
  const [countdown, setCountdown] = useState(DEFAULT_COUNTDOWN);
  const [marquee, setMarquee] = useState(DEFAULT_MARQUEE);
  const [saving, setSaving] = useState(false);
  const [newMarqueeItem, setNewMarqueeItem] = useState('');

  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'site', 'countdown_banner'), snap => {
      if (snap.exists()) setCountdown({ ...DEFAULT_COUNTDOWN, ...snap.data() });
    }, () => {});
    const u2 = onSnapshot(doc(db, 'site', 'marquee_banner'), snap => {
      if (snap.exists()) setMarquee({ ...DEFAULT_MARQUEE, ...snap.data() });
    }, () => {});
    return () => { u1(); u2(); };
  }, []);

  const saveCountdown = async () => {
    setSaving(true);
    await setDoc(doc(db, 'site', 'countdown_banner'), countdown);
    setSaving(false);
    showToast('Countdown banner saved ✓');
  };

  const saveMarquee = async () => {
    setSaving(true);
    await setDoc(doc(db, 'site', 'marquee_banner'), marquee);
    setSaving(false);
    showToast('Marquee banner saved ✓');
  };

  const addMarqueeItem = () => {
    if (!newMarqueeItem.trim()) return;
    setMarquee(m => ({ ...m, items: [...m.items, newMarqueeItem.trim()] }));
    setNewMarqueeItem('');
  };

  const removeMarqueeItem = (idx) => {
    setMarquee(m => ({ ...m, items: m.items.filter((_, i) => i !== idx) }));
  };

  const updateMarqueeItem = (idx, val) => {
    setMarquee(m => ({
      ...m,
      items: m.items.map((item, i) => i === idx ? val : item),
    }));
  };

  return (
    <div className="announcement-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Announcements</h1>
          <p className="page-sub">Manage countdown sale banner and running text marquee.</p>
        </div>
      </div>

      {/* COUNTDOWN BANNER */}
      <div className="card ann-section">
        <div className="ann-section-header">
          <h3 className="ann-section-title">
            <Clock size={18} /> Countdown Sale Banner
          </h3>
          <button
            className={`ann-toggle-btn ${countdown.active ? 'active' : ''}`}
            onClick={() => setCountdown(c => ({ ...c, active: !c.active }))}
          >
            {countdown.active ? <><Eye size={14} /> Active</> : <><EyeOff size={14} /> Inactive</>}
          </button>
        </div>

        <p className="ann-hint">
          Shows at the very top of the homepage with a countdown timer.
        </p>

        {/* Preview */}
        <div className="ann-preview" style={{
          background: countdown.bgColor,
          color: countdown.textColor,
          padding: '12px 20px',
          borderRadius: 10,
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
        }}>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{countdown.title || 'Sale Title'}</span>
          <span style={{ fontSize: 13 }}>ending in:</span>
          <div style={{ display: 'flex', gap: 8 }}>
            {['00', '12', '30', '45'].map((n, i) => (
              <div key={i} style={{
                background: 'rgba(0,0,0,0.2)',
                padding: '6px 10px',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 18,
                minWidth: 40,
                textAlign: 'center',
              }}>
                {n}
                <div style={{ fontSize: 9, fontWeight: 400, opacity: 0.7 }}>
                  {['days', 'hours', 'mins', 'secs'][i]}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="ann-form-grid">
          <div className="form-field">
            <label className="field-label">Sale Title</label>
            <input className="field-input" value={countdown.title}
              onChange={e => setCountdown(c => ({ ...c, title: e.target.value }))}
              placeholder="e.g. Summer Sale" />
          </div>
          <div className="form-field">
            <label className="field-label">End Date & Time</label>
            <input className="field-input" type="datetime-local" value={countdown.endDate}
              onChange={e => setCountdown(c => ({ ...c, endDate: e.target.value }))} />
          </div>
          <div className="form-field">
            <label className="field-label">Background Color</label>
            <div className="color-input-row">
              <input type="color" value={countdown.bgColor}
                onChange={e => setCountdown(c => ({ ...c, bgColor: e.target.value }))} />
              <input className="field-input" value={countdown.bgColor}
                onChange={e => setCountdown(c => ({ ...c, bgColor: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label className="field-label">Text Color</label>
            <div className="color-input-row">
              <input type="color" value={countdown.textColor}
                onChange={e => setCountdown(c => ({ ...c, textColor: e.target.value }))} />
              <input className="field-input" value={countdown.textColor}
                onChange={e => setCountdown(c => ({ ...c, textColor: e.target.value }))} />
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={saveCountdown} disabled={saving}>
          {saving ? 'Saving...' : 'Save Countdown Banner'}
        </button>
      </div>

      {/* MARQUEE BANNER */}
      <div className="card ann-section">
        <div className="ann-section-header">
          <h3 className="ann-section-title">
            <Type size={18} /> Running Text Marquee
          </h3>
          <button
            className={`ann-toggle-btn ${marquee.active ? 'active' : ''}`}
            onClick={() => setMarquee(m => ({ ...m, active: !m.active }))}
          >
            {marquee.active ? <><Eye size={14} /> Active</> : <><EyeOff size={14} /> Inactive</>}
          </button>
        </div>

        <p className="ann-hint">
          A horizontal scrolling text strip. Pauses on hover.
        </p>

        {/* Preview */}
        <div className="ann-marquee-preview" style={{
          background: marquee.bgColor,
          color: marquee.textColor,
          padding: '10px 0',
          borderRadius: 10,
          marginBottom: 20,
          overflow: 'hidden',
          position: 'relative',
        }}>
          <div className="ann-marquee-track">
            {[...marquee.items, ...marquee.items].map((item, i) => (
              <span key={i} className="ann-marquee-item">
                <span className="ann-marquee-dash">—</span> {item}
              </span>
            ))}
          </div>
        </div>

        <div className="ann-form-grid" style={{ marginBottom: 16 }}>
          <div className="form-field">
            <label className="field-label">Background Color</label>
            <div className="color-input-row">
              <input type="color" value={marquee.bgColor}
                onChange={e => setMarquee(m => ({ ...m, bgColor: e.target.value }))} />
              <input className="field-input" value={marquee.bgColor}
                onChange={e => setMarquee(m => ({ ...m, bgColor: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label className="field-label">Text Color</label>
            <div className="color-input-row">
              <input type="color" value={marquee.textColor}
                onChange={e => setMarquee(m => ({ ...m, textColor: e.target.value }))} />
              <input className="field-input" value={marquee.textColor}
                onChange={e => setMarquee(m => ({ ...m, textColor: e.target.value }))} />
            </div>
          </div>
          <div className="form-field">
            <label className="field-label">Scroll Speed (seconds)</label>
            <input className="field-input" type="number" min="10" max="120" value={marquee.speed}
              onChange={e => setMarquee(m => ({ ...m, speed: Number(e.target.value) }))} />
          </div>
        </div>

        <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>
          Marquee Items ({marquee.items.length})
        </label>
        <div className="ann-marquee-items">
          {marquee.items.map((item, idx) => (
            <div key={idx} className="ann-marquee-item-row">
              <input className="field-input" value={item}
                onChange={e => updateMarqueeItem(idx, e.target.value)} />
              <button className="ann-item-remove" onClick={() => removeMarqueeItem(idx)}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="ann-add-item-row">
          <input className="field-input" placeholder="Add new item..."
            value={newMarqueeItem} onChange={e => setNewMarqueeItem(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addMarqueeItem()} />
          <button className="btn-secondary" onClick={addMarqueeItem}>
            <Plus size={14} /> Add
          </button>
        </div>

        <button className="btn-primary" onClick={saveMarquee} disabled={saving} style={{ marginTop: 16 }}>
          {saving ? 'Saving...' : 'Save Marquee Banner'}
        </button>
      </div>
    </div>
  );
}