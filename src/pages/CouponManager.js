import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp
} from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2, Pencil, X, Ticket, Check, Copy } from 'lucide-react';
import './CouponManager.css';

const EMPTY_COUPON = {
  code: '',
  discountPercent: 10,
  minOrder: 0,
  active: true,
  label: '',
  expiresAt: '',
  maxUses: '',
};

export default function CouponManager() {
  const { showToast } = useContext(ToastContext);
  const [coupons, setCoupons] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_COUPON);
  const [saving, setSaving] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  // Load coupons from Firebase
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'coupons'), snap => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort: active first, then by code
      list.sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1;
        return (a.code || a.id).localeCompare(b.code || b.id);
      });
      setCoupons(list);
    }, () => {});
    return () => unsub();
  }, []);

  const handleSave = async () => {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '');
    if (!code) {
      showToast('Enter a coupon code', 'error');
      return;
    }
    if (code.length < 3) {
      showToast('Code must be at least 3 characters', 'error');
      return;
    }
    if (!form.discountPercent || form.discountPercent < 1 || form.discountPercent > 99) {
      showToast('Discount must be between 1% and 99%', 'error');
      return;
    }

    // Check for duplicate (only when creating new)
    if (!editId && coupons.some(c => c.id === code)) {
      showToast('A coupon with this code already exists', 'error');
      return;
    }

    setSaving(true);
    try {
      const existingCoupon = editId ? coupons.find(c => c.id === editId) : null;

      const data = {
        code,
        discountPercent: Number(form.discountPercent),
        minOrder: Number(form.minOrder) || 0,
        active: form.active !== false,
        label: form.label.trim() || `${form.discountPercent}% off`,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        uses: existingCoupon?.uses || 0,
        ...(form.expiresAt ? { expiresAt: new Date(form.expiresAt) } : { expiresAt: null }),
        updatedAt: serverTimestamp(),
        ...(!editId ? { createdAt: serverTimestamp() } : {}),
      };

      // Document ID = coupon code (so client can look it up directly)
      const docId = editId || code;
      await setDoc(doc(db, 'coupons', docId), data, { merge: true });

      showToast(editId ? 'Coupon updated ✓' : 'Coupon created — ready to use! 🎉');
      setForm(EMPTY_COUPON);
      setShowForm(false);
      setEditId(null);
    } catch (err) {
      console.error(err);
      showToast('Error saving coupon', 'error');
    }
    setSaving(false);
  };

  const handleEdit = (coupon) => {
    setForm({
      code: coupon.code || coupon.id,
      discountPercent: coupon.discountPercent || 10,
      minOrder: coupon.minOrder || 0,
      active: coupon.active !== false,
      label: coupon.label || '',
      expiresAt: coupon.expiresAt
        ? (coupon.expiresAt.toDate ? coupon.expiresAt.toDate().toISOString().split('T')[0] : new Date(coupon.expiresAt).toISOString().split('T')[0])
        : '',
      maxUses: coupon.maxUses || '',
    });
    setEditId(coupon.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm(`Delete coupon "${id}"? This cannot be undone.`)) return;
    await deleteDoc(doc(db, 'coupons', id));
    showToast('Coupon deleted');
    if (editId === id) { setEditId(null); setForm(EMPTY_COUPON); setShowForm(false); }
  };

  const toggleActive = async (coupon) => {
    await setDoc(doc(db, 'coupons', coupon.id), { active: !coupon.active }, { merge: true });
    showToast(coupon.active ? 'Coupon deactivated' : 'Coupon activated ✓');
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(EMPTY_COUPON);
    setShowForm(false);
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedId(code);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeCoupons = coupons.filter(c => c.active !== false);
  const inactiveCoupons = coupons.filter(c => c.active === false);

  return (
    <div className="coupon-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Coupons</h1>
          <p className="page-sub">Create and manage discount codes. Coupons are verified securely at checkout.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); if (showForm) cancelEdit(); }}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Create Coupon</>}
        </button>
      </div>

      {/* Stats */}
      <div className="coupon-stats">
        <div className="coupon-stat-card card">
          <p className="coupon-stat-value">{coupons.length}</p>
          <p className="coupon-stat-label">Total Coupons</p>
        </div>
        <div className="coupon-stat-card card">
          <p className="coupon-stat-value" style={{ color: '#2d6a4f' }}>{activeCoupons.length}</p>
          <p className="coupon-stat-label">Active</p>
        </div>
        <div className="coupon-stat-card card">
          <p className="coupon-stat-value" style={{ color: '#999' }}>{inactiveCoupons.length}</p>
          <p className="coupon-stat-label">Inactive</p>
        </div>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="card coupon-form-card">
          <h3 className="coupon-form-title">
            {editId ? <><Pencil size={16} /> Edit Coupon</> : <><Ticket size={16} /> New Coupon</>}
          </h3>

          <div className="coupon-form-grid">
            <div className="form-field">
              <label className="field-label">Coupon Code *</label>
              <input
                className="field-input coupon-code-input"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value.toUpperCase().replace(/\s/g, '') })}
                placeholder="e.g. WELCOME10"
                disabled={!!editId}
                maxLength={20}
              />
              <p className="form-hint">
                {editId ? 'Code cannot be changed after creation' : 'Uppercase, no spaces. This is what customers type.'}
              </p>
            </div>

            <div className="form-field">
              <label className="field-label">Discount Percentage *</label>
              <div className="coupon-percent-input">
                <input
                  className="field-input"
                  type="number"
                  min="1"
                  max="99"
                  value={form.discountPercent}
                  onChange={e => setForm({ ...form, discountPercent: e.target.value })}
                />
                <span className="percent-symbol">%</span>
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Minimum Order Amount (₹)</label>
              <input
                className="field-input"
                type="number"
                min="0"
                value={form.minOrder}
                onChange={e => setForm({ ...form, minOrder: e.target.value })}
                placeholder="0 = no minimum"
              />
              <p className="form-hint">Set to 0 for no minimum requirement</p>
            </div>

            <div className="form-field">
              <label className="field-label">Expiry Date (optional)</label>
              <input
                className="field-input"
                type="date"
                value={form.expiresAt}
                onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
              <p className="form-hint">Leave empty for no expiry</p>
            </div>

            <div className="form-field">
              <label className="field-label">Label / Description</label>
              <input
                className="field-input"
                value={form.label}
                onChange={e => setForm({ ...form, label: e.target.value })}
                placeholder="e.g. Welcome discount for new customers"
              />
            </div>

            <div className="form-field">
              <label className="field-label">Max Uses (optional)</label>
              <input
                className="field-input"
                type="number"
                min="1"
                value={form.maxUses}
                onChange={e => setForm({ ...form, maxUses: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="coupon-active-toggle">
            <label className="coupon-toggle-label">
              <input
                type="checkbox"
                checked={form.active}
                onChange={e => setForm({ ...form, active: e.target.checked })}
              />
              <span className="coupon-toggle-track" />
              <span>{form.active ? 'Active — customers can use this code' : 'Inactive — code will be rejected at checkout'}</span>
            </label>
          </div>

          {/* Preview */}
          {form.code && (
            <div className="coupon-preview">
              <p className="coupon-preview-label">PREVIEW</p>
              <div className="coupon-preview-card">
                <div className="coupon-preview-left">
                  <span className="coupon-preview-code">{form.code || 'CODE'}</span>
                  <span className="coupon-preview-desc">{form.label || `${form.discountPercent}% off`}</span>
                </div>
                <div className="coupon-preview-right">
                  <span className="coupon-preview-percent">{form.discountPercent}%</span>
                  <span className="coupon-preview-off">OFF</span>
                </div>
              </div>
            </div>
          )}

          <div className="coupon-form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Coupon' : 'Create Coupon'}
            </button>
            <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Coupons List */}
      {coupons.length === 0 ? (
        <div className="card" style={{ padding: 56, textAlign: 'center' }}>
          <Ticket size={44} strokeWidth={1} color="#ccc" />
          <p style={{ color: '#aaa', fontSize: 16, marginTop: 12 }}>No coupons yet</p>
          <p style={{ color: '#ccc', fontSize: 13 }}>Create your first coupon above</p>
        </div>
      ) : (
        <div className="coupon-list">
          {coupons.map(coupon => {
            const isExpired = coupon.expiresAt && (
              (coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt)) < new Date()
            );
            return (
              <div className={`coupon-card card ${!coupon.active ? 'inactive' : ''} ${isExpired ? 'expired' : ''}`} key={coupon.id}>
                <div className="coupon-card-left">
                  <div className="coupon-card-code-row">
                    <span className="coupon-card-code">{coupon.code || coupon.id}</span>
                    <button
                      className="coupon-copy-btn"
                      onClick={() => copyCode(coupon.code || coupon.id)}
                      title="Copy code"
                    >
                      {copiedId === (coupon.code || coupon.id) ? <Check size={12} color="#2d6a4f" /> : <Copy size={12} />}
                    </button>
                    {!coupon.active && <span className="coupon-status-badge inactive-badge">Inactive</span>}
                    {isExpired && <span className="coupon-status-badge expired-badge">Expired</span>}
                    {coupon.active && !isExpired && <span className="coupon-status-badge active-badge">Active</span>}
                  </div>
                  <p className="coupon-card-desc">{coupon.label || `${coupon.discountPercent}% discount`}</p>
                  <div className="coupon-card-meta">
                    {coupon.minOrder > 0 && (
                      <span>Min: ₹{Number(coupon.minOrder).toLocaleString('en-IN')}</span>
                    )}
                    {coupon.expiresAt && (
                      <span>
                        Expires: {(coupon.expiresAt.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt)).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    )}
                    {coupon.maxUses && <span>Max: {coupon.maxUses} uses</span>}
                  </div>
                </div>

                <div className="coupon-card-right">
                  <div className="coupon-card-discount">
                    <span className="coupon-card-percent">{coupon.discountPercent}%</span>
                    <span className="coupon-card-off">OFF</span>
                  </div>
                  <div className="coupon-card-actions">
                    <button className="coupon-action-btn toggle-btn" onClick={() => toggleActive(coupon)} title={coupon.active ? 'Deactivate' : 'Activate'}>
                      {coupon.active ? '⏸' : '▶'}
                    </button>
                    <button className="coupon-action-btn edit-btn" onClick={() => handleEdit(coupon)} title="Edit">
                      <Pencil size={13} />
                    </button>
                    <button className="coupon-action-btn delete-btn" onClick={() => handleDelete(coupon.id)} title="Delete">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info card */}
      <div className="card coupon-info-card">
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, marginBottom: 10 }}>How Coupons Work</h3>
        <ul className="coupon-info-list">
          <li>Customers enter the code at checkout in the "Promo code" field</li>
          <li>The code is verified securely against Firebase — <strong>never exposed in client source code</strong></li>
          <li>If the coupon is inactive, expired, or doesn't meet minimum order — it's rejected automatically</li>
          <li>You can deactivate a coupon anytime without deleting it (pause/resume)</li>
          <li>The document ID in Firestore = the coupon code (case-insensitive on client side)</li>
        </ul>
      </div>
    </div>
  );
}