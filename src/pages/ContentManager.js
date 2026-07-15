import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp, addDoc, updateDoc, writeBatch
} from 'firebase/firestore';
import { ToastContext } from '../App';
import { Pencil, Trash2, Plus, X, Star } from 'lucide-react';
import { allProducts } from '../data/products';
import './ContentManager.css';

/* ────────── PRODUCT DESCRIPTIONS ────────── */
function DescriptionsTab({ products }) {
  const { showToast } = useContext(ToastContext);
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState('details');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ details: '', care: '', shipping: '' });
  const [liveData, setLiveData] = useState({});

  // Listen to ALL productDescriptions
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'productDescriptions'), snap => {
      const map = {};
      snap.docs.forEach(d => { map[d.id] = d.data(); });
      setLiveData(map);
    });
    return () => unsub();
  }, []);

  // When product selected, prefill form from Firestore or defaults
  useEffect(() => {
    if (!selected) return;
    const existing = liveData[String(selected.id)] || {};
    setForm({
      details:  existing.details  || '',
      care:     existing.care     || '',
      shipping: existing.shipping || '',
    });
  }, [selected, liveData]);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'productDescriptions', String(selected.id)), {
        details:  form.details,
        care:     form.care,
        shipping: form.shipping,
      });
      showToast('Descriptions saved — live instantly! ✓');
    } catch {
      showToast('Error saving', 'error');
    }
    setSaving(false);
  };

  const handleClear = async () => {
    if (!selected) return;
    if (!window.confirm('Reset to default descriptions?')) return;
    await deleteDoc(doc(db, 'productDescriptions', String(selected.id)));
    showToast('Reset to defaults');
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const TAB_LABELS = { details: 'Details', care: 'Care', shipping: 'Shipping' };

  return (
    <div className="desc-layout">
      {/* LEFT: product picker */}
      <div className="card product-picker">
        <p className="picker-title">Select Product</p>
        <p className="picker-sub">Choose a product to edit its descriptions</p>
        <input
          className="field-input picker-search"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="product-pick-list">
          {filteredProducts.map(p => (
            <div
              key={p.id}
              className={`pick-item ${selected?.id === p.id ? 'active' : ''}`}
              onClick={() => { setSelected(p); setActiveTab('details'); }}
            >
              <div className="pick-img">
                {p.image && <img src={p.image} alt={p.name} />}
              </div>
              <div className="pick-info">
                <p className="pick-name">{p.name}</p>
                <p className="pick-price">₹{(p.price || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT: editor */}
      <div className="card desc-editor">
        {!selected ? (
          <div className="desc-no-selection">
            <p>No product selected</p>
            <span>Pick a product from the left to edit its tab descriptions</span>
          </div>
        ) : (
          <>
            <p className="desc-editor-title">{selected.name}</p>
            <p className="desc-editor-sub">
              Editing: Details / Care / Shipping tabs shown on the product page
            </p>

            {/* Tab selector */}
            <div className="desc-tabs">
              {Object.keys(TAB_LABELS).map(tab => (
                <button
                  key={tab}
                  className={`desc-tab-btn ${activeTab === tab ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Active textarea */}
            <textarea
              className="desc-textarea"
              placeholder={`Enter ${TAB_LABELS[activeTab]} description...`}
              value={form[activeTab]}
              rows={8}
              onChange={e => setForm({ ...form, [activeTab]: e.target.value })}
            />
            <p className="desc-char-count">{(form[activeTab] || '').length} characters</p>

            {/* Actions */}
            <div className="desc-actions">
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save All Tabs'}
              </button>
              <button className="btn-secondary" onClick={handleClear}>
                Reset to Defaults
              </button>
            </div>

            {/* Preview all 3 tabs at once */}
            <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid #f0ece6' }}>
              <p className="field-label" style={{ marginBottom: 14 }}>All Tabs Preview</p>
              <div className="desc-all-tabs">
                {Object.entries(TAB_LABELS).map(([key, label]) => (
                  <div key={key} className="desc-all-field">
                    <span className="desc-field-label">{label}</span>
                    <p style={{ fontSize: 12, color: form[key] ? '#555' : '#ccc', lineHeight: 1.7, fontStyle: form[key] ? 'normal' : 'italic' }}>
                      {form[key] || `(will show default ${label.toLowerCase()} text)`}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────── REVIEWS ────────── */
const EMPTY_REVIEW = { name: '', location: '', text: '', stars: 5 };

function ReviewsTab() {
  const { showToast } = useContext(ToastContext);
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]   = useState(null);
  const [form, setForm]       = useState(EMPTY_REVIEW);
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'reviews'), orderBy('order', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (!form.name.trim() || !form.text.trim()) {
      showToast('Name and review text required', 'error');
      return;
    }
    setSaving(true);
    try {
      const data = {
        name:     form.name.trim(),
        location: form.location.trim(),
        text:     form.text.trim(),
        stars:    form.stars,
      };
      if (editId) {
        await updateDoc(doc(db, 'reviews', editId), data);
        showToast('Review updated ✓');
        setEditId(null);
      } else {
        const maxOrder = reviews.reduce((m, r) => Math.max(m, r.order || 0), 0);
        await addDoc(collection(db, 'reviews'), { ...data, order: maxOrder + 1, createdAt: serverTimestamp() });
        showToast('Review added — live instantly! 🚀');
      }
      setForm(EMPTY_REVIEW);
      setShowForm(false);
    } catch {
      showToast('Error saving review', 'error');
    }
    setSaving(false);
  };

  const handleEdit = (r) => {
    setForm({ name: r.name, location: r.location || '', text: r.text, stars: r.stars || 5 });
    setEditId(r.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review?')) return;
    await deleteDoc(doc(db, 'reviews', id));
    showToast('Review deleted');
    if (editId === id) { setEditId(null); setForm(EMPTY_REVIEW); setShowForm(false); }
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY_REVIEW); setShowForm(false); };

  return (
    <div className="reviews-manager">
      {/* Header */}
      <div className="page-header" style={{ marginBottom: 16 }}>
        <div>
          <p style={{ fontSize: 13, color: '#999' }}>
            {reviews.length} review{reviews.length !== 1 ? 's' : ''} · Changes are live instantly
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); if (showForm) cancelEdit(); }}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Review</>}
        </button>
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="card review-form-card">
          <p className="review-form-title">
            {editId ? <><Pencil size={16} /> Edit Review</> : <><Plus size={16} /> New Review</>}
          </p>

          {/* Stars */}
          <div>
            <p className="field-label" style={{ marginBottom: 8 }}>Rating</p>
            <div className="review-form-stars">
              {[1, 2, 3, 4, 5].map(n => (
                <button
                  key={n}
                  type="button"
                  className={`review-form-star ${n <= form.stars ? 'lit' : ''}`}
                  onClick={() => setForm({ ...form, stars: n })}
                >★</button>
              ))}
            </div>
          </div>

          <div className="review-form-grid">
            <div className="form-field">
              <label className="field-label">Customer Name</label>
              <input className="field-input" placeholder="e.g. Sarah Jenkins"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="form-field">
              <label className="field-label">Location</label>
              <input className="field-input" placeholder="e.g. New York, NY"
                value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>

          <div className="form-field">
            <label className="field-label">Review Text</label>
            <textarea
              className="desc-textarea"
              placeholder='"The quality was absolutely breathtaking..."'
              value={form.text}
              rows={4}
              onChange={e => setForm({ ...form, text: e.target.value })}
            />
          </div>

          <div className="review-form-actions">
            <button className="btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : editId ? 'Update Review' : 'Add Review'}
            </button>
            <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* Reviews grid */}
      {reviews.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: 'center' }}>
          <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 14 }}>
            No reviews yet. Add reviews above — they'll appear live on the homepage.
          </p>
        </div>
      ) : (
        <div className="reviews-grid-admin">
          {reviews.map(r => (
            <div className={`card review-admin-card ${editId === r.id ? 'editing' : ''}`} key={r.id}>
              <div className="review-card-top">
                <div className="review-stars-row">
                  {[1,2,3,4,5].map(n => (
                    <span key={n} style={{ fontSize: 14, color: n <= (r.stars||5) ? '#1a1a1a' : '#ddd' }}>★</span>
                  ))}
                </div>
                <div className="review-card-actions">
                  <button className="rev-edit-btn" onClick={() => handleEdit(r)} title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button className="rev-delete-btn" onClick={() => handleDelete(r.id)} title="Delete">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="review-admin-text">{r.text}</p>
              <div className="review-admin-author">
                <p className="review-admin-name">{r.name}</p>
                {r.location && <p className="review-admin-loc">{r.location}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ────────── TRUST BADGES ────────── */
const BADGE_ICON_OPTIONS = [
  { value: 'truck',   label: '🚚 Truck — Free Shipping'  },
  { value: 'returns', label: '↩ Returns arrow'           },
  { value: 'shield',  label: '🛡 Shield — Authentic'     },
  { value: 'cod',     label: '💳 Card — COD Available'   },
];

const DEFAULT_BADGES_ADMIN = [
  { iconKey: 'truck',   label: 'Free Shipping', sub: 'On orders above ₹999' },
  { iconKey: 'returns', label: 'Easy Returns',  sub: '7-day return policy'   },
  { iconKey: 'shield',  label: 'Authentic',     sub: 'Certified jewellery'   },
  { iconKey: 'cod',     label: 'COD Available', sub: 'Pay on delivery'       },
];

function BadgesTab({ products }) {
  const { showToast } = useContext(ToastContext);
  const [selected, setSelected] = useState(null);
  const [badges, setBadges]     = useState(DEFAULT_BADGES_ADMIN);
  const [saving, setSaving]     = useState(false);
  const [search, setSearch]     = useState('');
  const [liveUnsub, setLiveUnsub] = useState(null);

  // When product selected, subscribe to its badges doc
  useEffect(() => {
    // Clean up previous listener
    if (liveUnsub) { liveUnsub(); setLiveUnsub(null); }
    if (!selected) return;

    const unsub = onSnapshot(
      doc(db, 'productBadges', String(selected.id)),
      snap => {
        if (snap.exists() && snap.data().badges?.length) {
          setBadges(snap.data().badges);
        } else {
          setBadges(DEFAULT_BADGES_ADMIN);
        }
      },
      (err) => {
        console.error('Badges listen error:', err);
        setBadges(DEFAULT_BADGES_ADMIN);
      }
    );
    setLiveUnsub(() => unsub);

    return () => unsub();
  }, [selected?.id]);

  const updateBadge = (idx, field, value) => {
    setBadges(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const cleanedBadges = () => badges.map(b => ({
    iconKey: b.iconKey || 'truck',
    label: b.label.trim(),
    sub: b.sub?.trim() || '',
  }));

  const validateBadges = () => {
    if (badges.some(b => !b.label?.trim())) {
      showToast('All badges must have a label', 'error');
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    if (!selected) {
      showToast('Select a product first', 'error');
      return;
    }

    if (!validateBadges()) return;

    setSaving(true);
    try {
      // Use the correct Firestore collection: productBadges
      await setDoc(
        doc(db, 'productBadges', String(selected.id)),
        {
          badges: cleanedBadges(),
        }
      );
      showToast('Trust badges saved ✓');
    } catch (err) {
      console.error('Save badges error:', err);
      showToast(`Error: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const handleApplyToAll = async () => {
    if (!selected) return;
    if (!validateBadges()) return;
    if (!window.confirm(`Apply these trust badges to all ${products.length} products? This will replace each product's current trust badges.`)) return;

    const uniqueProducts = Array.from(new Map(products.map(product => [String(product.id), product])).values());
    setSaving(true);
    try {
      const badgeData = cleanedBadges();
      for (let start = 0; start < uniqueProducts.length; start += 500) {
        const batch = writeBatch(db);
        uniqueProducts.slice(start, start + 500).forEach(product => {
          batch.set(doc(db, 'productBadges', String(product.id)), { badges: badgeData });
        });
        await batch.commit();
      }
      showToast(`Trust badges applied to ${uniqueProducts.length} products ✓`);
    } catch (err) {
      console.error('Apply badges to all products error:', err);
      showToast(`Error: ${err.message}`, 'error');
    }
    setSaving(false);
  };

  const handleReset = async () => {
    setBadges(DEFAULT_BADGES_ADMIN);
    // Optionally also clear from Firestore so it reverts to default on client
    if (selected) {
      try {
        await setDoc(
          doc(db, 'productBadges', String(selected.id)),
          { badges: DEFAULT_BADGES_ADMIN }
        );
        showToast('Badges reset to defaults ✓');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const ICON_PREVIEW = { truck: '🚚', returns: '↩', shield: '🛡', cod: '💳' };

  return (
    <div className="desc-layout">

      {/* LEFT: product picker */}
      <div className="card product-picker">
        <p className="picker-title">Select Product</p>
        <p className="picker-sub">Edit one product, then optionally apply those badges to every product.</p>
        <input
          className="field-input picker-search"
          placeholder="Search products..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <div className="product-pick-list">
          {filteredProducts.map(p => (
            <div
              key={p.id}
              className={`pick-item ${selected?.id === p.id ? 'active' : ''}`}
              onClick={() => setSelected(p)}
            >
              <div className="pick-img">
                {p.image && <img src={p.image} alt={p.name} />}
              </div>
              <div className="pick-info">
                <p className="pick-name">{p.name}</p>
                <p className="pick-price">₹{(p.price || 0).toLocaleString('en-IN')}</p>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 13, padding: '12px 0' }}>
              No products found
            </p>
          )}
        </div>
      </div>

      {/* RIGHT: badge editor */}
      <div className="card desc-editor">
        {!selected ? (
          <div className="desc-no-selection">
            <p>No product selected</p>
            <span>Pick a product from the left to edit its trust badges</span>
          </div>
        ) : (
          <>
            <p className="desc-editor-title">{selected.name}</p>
            <p className="desc-editor-sub" style={{ marginBottom: 18 }}>
              4 trust badge slots shown in a 2×2 grid on the product page.
            </p>

            {/* Live 2x2 preview matching client layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 14,
              padding: 16,
              background: '#f9f7f3',
              borderRadius: 10,
              borderTop: '1px solid #f0ece6',
              marginBottom: 22,
            }}>
              {badges.map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{ICON_PREVIEW[b.iconKey] || '✦'}</span>
                  <div>
                    <div style={{
                      fontFamily: 'Jost,sans-serif', fontSize: 13,
                      fontWeight: 600, color: '#1a1a1a',
                    }}>
                      {b.label || '—'}
                    </div>
                    <div style={{
                      fontFamily: 'Jost,sans-serif', fontSize: 11, color: '#888',
                    }}>
                      {b.sub || '—'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Edit each badge */}
            {badges.map((badge, idx) => (
              <div key={idx} style={{
                border: '1px solid #e8e5e0',
                borderRadius: 10,
                padding: 16,
                marginBottom: 12,
                background: '#fff',
              }}>
                <p className="field-label" style={{ marginBottom: 10 }}>
                  Badge {idx + 1}
                  <span style={{
                    marginLeft: 8, fontSize: 16,
                    verticalAlign: 'middle',
                  }}>
                    {ICON_PREVIEW[badge.iconKey] || '?'}
                  </span>
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="form-field">
                    <label className="field-label" style={{ fontSize: 9 }}>Icon</label>
                    <select
                      className="field-input"
                      value={badge.iconKey || 'truck'}
                      onChange={e => updateBadge(idx, 'iconKey', e.target.value)}
                    >
                      {BADGE_ICON_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label className="field-label" style={{ fontSize: 9 }}>Bold Label *</label>
                    <input
                      className="field-input"
                      value={badge.label || ''}
                      onChange={e => updateBadge(idx, 'label', e.target.value)}
                      placeholder="e.g. Free Shipping"
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                    <label className="field-label" style={{ fontSize: 9 }}>Sub Text (grey)</label>
                    <input
                      className="field-input"
                      value={badge.sub || ''}
                      onChange={e => updateBadge(idx, 'sub', e.target.value)}
                      placeholder="e.g. On orders above ₹999"
                    />
                  </div>
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 8, paddingTop: 16, borderTop: '1px solid #f0ece6' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Badges'}
              </button>
              <button className="btn-secondary" onClick={handleApplyToAll} disabled={saving}>
                Apply to All Products
              </button>
              <button className="btn-secondary" onClick={handleReset} disabled={saving}>
                Reset to Defaults
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ────────── MAIN COMPONENT ────────── */
function ShippingChargesTab({ products }) {
  const { showToast } = useContext(ToastContext);
  const [selected, setSelected] = useState(null);
  const [charge, setCharge] = useState('0');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!selected) return undefined;
    return onSnapshot(doc(db, 'productShippingCharges', String(selected.id)), snap => {
      setCharge(String(snap.exists() ? Number(snap.data().charge || 0) : 0));
    }, () => setCharge('0'));
  }, [selected?.id]);

  const readCharge = () => {
    const value = Number(charge);
    if (!Number.isFinite(value) || value < 0) {
      showToast('Shipping charge must be zero or more', 'error');
      return null;
    }
    return value;
  };
  const save = async () => {
    if (!selected) return showToast('Select a product first', 'error');
    const value = readCharge();
    if (value === null) return;
    setSaving(true);
    try {
      await setDoc(doc(db, 'productShippingCharges', String(selected.id)), { charge: value });
      showToast('Shipping charge saved');
    } catch (err) {
      console.error(err);
      showToast('Could not save shipping charge', 'error');
    }
    setSaving(false);
  };
  const applyToAll = async () => {
    if (!selected) return;
    const value = readCharge();
    if (value === null) return;
    const uniqueProducts = Array.from(new Map(products.map(product => [String(product.id), product])).values());
    if (!window.confirm(`Apply a Rs. ${value} shipping charge to all ${uniqueProducts.length} products?`)) return;
    setSaving(true);
    try {
      for (let start = 0; start < uniqueProducts.length; start += 500) {
        const batch = writeBatch(db);
        uniqueProducts.slice(start, start + 500).forEach(product => batch.set(doc(db, 'productShippingCharges', String(product.id)), { charge: value }));
        await batch.commit();
      }
      showToast(`Shipping charge applied to ${uniqueProducts.length} products`);
    } catch (err) {
      console.error(err);
      showToast('Could not apply shipping charge to all products', 'error');
    }
    setSaving(false);
  };
  const filteredProducts = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  return <div className="desc-layout">
    <div className="card product-picker">
      <p className="picker-title">Select Product</p>
      <p className="picker-sub">Set a charge for one product, or apply it to every product.</p>
      <input className="field-input picker-search" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      <div className="product-pick-list">{filteredProducts.map(p => <div key={p.id} className={`pick-item ${selected?.id === p.id ? 'active' : ''}`} onClick={() => setSelected(p)}><div className="pick-img">{p.image && <img src={p.image} alt={p.name} />}</div><div className="pick-info"><p className="pick-name">{p.name}</p><p className="pick-price">Rs. {(p.price || 0).toLocaleString('en-IN')}</p></div></div>)}</div>
    </div>
    <div className="card desc-editor">
      {!selected ? <div className="desc-no-selection"><p>No product selected</p><span>Pick a product to edit its shipping charge</span></div> : <><p className="desc-editor-title">{selected.name}</p><p className="desc-editor-sub">This amount is stored per product. Set 0 for free shipping.</p><div className="form-field" style={{ maxWidth: 280 }}><label className="field-label">Shipping Charge</label><input className="field-input" type="number" min="0" step="1" value={charge} onChange={e => setCharge(e.target.value)} /></div><div className="desc-actions"><button className="btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Charge'}</button><button className="btn-secondary" onClick={applyToAll} disabled={saving}>Apply to All Products</button></div></>}
    </div>
  </div>;
}

export default function ContentManager() {
  const [tab, setTab] = useState('descriptions');
  const [allProds, setAllProds] = useState(allProducts);

  // Merge Firebase products with static ones
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      if (snap.empty) { setAllProds(allProducts); return; }
      const fbProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const merged = [
        ...fbProds,
        ...allProducts.filter(d => !fbProds.some(f => f.name?.toLowerCase() === d.name?.toLowerCase()))
      ];
      setAllProds(merged);
    }, () => {});
    return () => unsub();
  }, []);

  return (
    <div className="content-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Content</h1>
          <p className="page-sub">Edit product descriptions and customer reviews — changes go live instantly.</p>
        </div>
      </div>

      {/* Top tabs */}
      <div className="cm-tabs">
        <button className={`cm-tab ${tab === 'descriptions' ? 'active' : ''}`} onClick={() => setTab('descriptions')}>
          Product Descriptions
        </button>
        <button className={`cm-tab ${tab === 'reviews' ? 'active' : ''}`} onClick={() => setTab('reviews')}>
          Reviews
        </button>
        <button className={`cm-tab ${tab === 'badges' ? 'active' : ''}`} onClick={() => setTab('badges')}>
          Trust Badges
        </button>
        <button className={`cm-tab ${tab === 'shippingCharges' ? 'active' : ''}`} onClick={() => setTab('shippingCharges')}>
          Shipping Charges
        </button>
      </div>

      {tab === 'descriptions' && <DescriptionsTab products={allProds} />}
      {tab === 'reviews' && <ReviewsTab />}
      {tab === 'badges' && <BadgesTab products={allProds} />}
      {tab === 'shippingCharges' && <ShippingChargesTab products={allProds} />}
    </div>
  );
}
