import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, doc, setDoc, deleteDoc, onSnapshot,
  query, orderBy, serverTimestamp, addDoc, updateDoc
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
                <p className="pick-price">${(p.price || 0).toLocaleString()}</p>
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

/* ────────── MAIN COMPONENT ────────── */
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
      </div>

      {tab === 'descriptions' ? <DescriptionsTab products={allProds} /> : <ReviewsTab />}
    </div>
  );
}