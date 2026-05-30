import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2, X, Pencil, GripVertical, Eye } from 'lucide-react';
import './CollectionManager.css';

const DEFAULT_COLLECTIONS = [
  { id: 'bestSellers', title: 'Best Sellers', subtitle: 'Our most loved pieces by customers', link: '/shop?section=bestSellers', tag: 'POPULAR', icon: '⭐', active: true },
  { id: 'newArrivals', title: 'New Arrivals', subtitle: 'Fresh additions to our collection', link: '/shop?section=newArrivals', tag: 'NEW', icon: '✨', active: true },
  { id: 'under99', title: 'Under ₹99', subtitle: 'Affordable elegance for every budget', link: '/shop?maxPrice=99', tag: 'BUDGET', icon: '💎', active: true },
  { id: 'r99to199', title: '₹99 – ₹199', subtitle: 'Beautiful pieces at great value', link: '/shop?minPrice=99&maxPrice=199', tag: 'VALUE', icon: '💍', active: true },
  { id: 'r199to299', title: '₹199 – ₹299', subtitle: 'Premium craftsmanship, mid-range prices', link: '/shop?minPrice=199&maxPrice=299', tag: 'MID-RANGE', icon: '👑', active: true },
  { id: 'r299to399', title: '₹299 – ₹399', subtitle: 'Luxury pieces for special occasions', link: '/shop?minPrice=299&maxPrice=399', tag: 'PREMIUM', icon: '🌟', active: true },
  { id: 'above499', title: '₹499 & Above', subtitle: 'Exclusive high-end fine jewellery', link: '/shop?minPrice=499', tag: 'LUXURY', icon: '♛', active: true },
  { id: 'onSale', title: 'On Sale', subtitle: 'Grab the best deals — limited time offers', link: '/shop?sale=true', tag: 'SALE', icon: '🏷', active: true },
];

const LINK_TYPES = [
  { value: 'section', label: 'Section (Best Sellers / New Arrivals)' },
  { value: 'price', label: 'Price Range' },
  { value: 'sale', label: 'On Sale Products' },
  { value: 'category', label: 'Category' },
  { value: 'custom', label: 'Custom URL' },
];

const ICON_OPTIONS = ['⭐', '✨', '💎', '💍', '👑', '🌟', '♛', '🏷', '🎁', '💝', '🔥', '✦', '♥', '🌸', '💫', '🎀'];

const EMPTY_COLLECTION = {
  title: '',
  subtitle: '',
  tag: '',
  icon: '✨',
  link: '',
  active: true,
  linkType: 'custom',
  section: '',
  minPrice: '',
  maxPrice: '',
  category: '',
};

export default function CollectionManager() {
  const { showToast } = useContext(ToastContext);
  const [collections, setCollections] = useState(DEFAULT_COLLECTIONS);
  const [showForm, setShowForm] = useState(false);
  const [editIdx, setEditIdx] = useState(null);
  const [form, setForm] = useState(EMPTY_COLLECTION);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);

  // Load collections from Firebase
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site', 'collections_page'), snap => {
      if (snap.exists() && snap.data().items?.length) {
        setCollections(snap.data().items);
      }
    }, () => {});
    return () => unsub();
  }, []);

  // Load categories for dropdown
  useEffect(() => {
    const cats = { row1: [], row2: [] };
    const rebuild = () => setCategories([...cats.row1, ...cats.row2]);
    const u1 = onSnapshot(doc(db, 'site', 'categories_row1'), s => {
      if (s.exists() && s.data().items) { cats.row1 = s.data().items; rebuild(); }
    });
    const u2 = onSnapshot(doc(db, 'site', 'categories_row2'), s => {
      if (s.exists() && s.data().items) { cats.row2 = s.data().items; rebuild(); }
    });
    return () => { u1(); u2(); };
  }, []);

  // Save to Firebase
  const saveCollections = async (items) => {
    setSaving(true);
    setCollections(items);
    await setDoc(doc(db, 'site', 'collections_page'), { items });
    setSaving(false);
    showToast('Collections updated — live on client! ✓');
  };

  // Build the link from form fields
  const buildLink = () => {
    switch (form.linkType) {
      case 'section':
        return `/shop?section=${form.section}`;
      case 'price':
        if (form.minPrice && form.maxPrice) return `/shop?minPrice=${form.minPrice}&maxPrice=${form.maxPrice}`;
        if (form.minPrice) return `/shop?minPrice=${form.minPrice}`;
        if (form.maxPrice) return `/shop?maxPrice=${form.maxPrice}`;
        return '/shop';
      case 'sale':
        return '/shop?sale=true';
      case 'category':
        return `/shop?cat=${form.category}`;
      case 'custom':
      default:
        return form.link || '/shop';
    }
  };

  // Parse link back to form fields for editing
  const parseLinkToForm = (col) => {
    const link = col.link || '';
    let linkType = 'custom';
    let section = '';
    let minPrice = '';
    let maxPrice = '';
    let category = '';

    if (link.includes('section=bestSellers')) { linkType = 'section'; section = 'bestSellers'; }
    else if (link.includes('section=newArrivals')) { linkType = 'section'; section = 'newArrivals'; }
    else if (link.includes('sale=true')) { linkType = 'sale'; }
    else if (link.includes('cat=')) { linkType = 'category'; category = link.split('cat=')[1]?.split('&')[0] || ''; }
    else if (link.includes('minPrice=') || link.includes('maxPrice=')) {
      linkType = 'price';
      const params = new URLSearchParams(link.split('?')[1] || '');
      minPrice = params.get('minPrice') || '';
      maxPrice = params.get('maxPrice') || '';
    }

    return { ...col, linkType, section, minPrice, maxPrice, category };
  };

  const handleAdd = () => {
    if (!form.title.trim()) { showToast('Enter a title', 'error'); return; }
    if (!form.tag.trim()) { showToast('Enter a tag label', 'error'); return; }

    const newItem = {
      id: form.title.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9₹-]/g, ''),
      title: form.title.trim(),
      subtitle: form.subtitle.trim(),
      tag: form.tag.trim().toUpperCase(),
      icon: form.icon,
      link: buildLink(),
      active: form.active,
    };

    if (editIdx !== null) {
      const updated = [...collections];
      updated[editIdx] = { ...updated[editIdx], ...newItem, id: updated[editIdx].id };
      saveCollections(updated);
    } else {
      saveCollections([...collections, newItem]);
    }

    setForm(EMPTY_COLLECTION);
    setShowForm(false);
    setEditIdx(null);
  };

  const handleEdit = (idx) => {
    const col = collections[idx];
    setForm(parseLinkToForm(col));
    setEditIdx(idx);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (idx) => {
    if (!window.confirm(`Delete "${collections[idx].title}"?`)) return;
    saveCollections(collections.filter((_, i) => i !== idx));
    if (editIdx === idx) { setEditIdx(null); setForm(EMPTY_COLLECTION); setShowForm(false); }
  };

  const toggleActive = (idx) => {
    const updated = [...collections];
    updated[idx] = { ...updated[idx], active: !updated[idx].active };
    saveCollections(updated);
  };

  const moveUp = (idx) => {
    if (idx === 0) return;
    const updated = [...collections];
    [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
    saveCollections(updated);
  };

  const moveDown = (idx) => {
    if (idx === collections.length - 1) return;
    const updated = [...collections];
    [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
    saveCollections(updated);
  };

  const cancelEdit = () => {
    setEditIdx(null);
    setForm(EMPTY_COLLECTION);
    setShowForm(false);
  };

  return (
    <div className="collection-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Collections</h1>
          <p className="page-sub">Manage the Collections page cards. Reorder, add, edit, or hide collections. Changes are live instantly.</p>
        </div>
        <button className="btn-primary" onClick={() => { setShowForm(!showForm); if (showForm) cancelEdit(); }}>
          {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> Add Collection</>}
        </button>
      </div>

      {/* ADD / EDIT FORM */}
      {showForm && (
        <div className="card cm-form-card">
          <h3 className="cm-form-title">
            {editIdx !== null ? <><Pencil size={16} /> Edit Collection</> : <><Plus size={16} /> New Collection</>}
          </h3>

          <div className="cm-form-grid">
            <div className="form-field">
              <label className="field-label">Title *</label>
              <input className="field-input" value={form.title}
                onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="e.g. Under ₹99" />
            </div>

            <div className="form-field">
              <label className="field-label">Tag Label *</label>
              <input className="field-input" value={form.tag}
                onChange={e => setForm({ ...form, tag: e.target.value.toUpperCase() })}
                placeholder="e.g. BUDGET" maxLength={12} />
            </div>

            <div className="form-field" style={{ gridColumn: '1 / -1' }}>
              <label className="field-label">Subtitle / Description</label>
              <input className="field-input" value={form.subtitle}
                onChange={e => setForm({ ...form, subtitle: e.target.value })}
                placeholder="e.g. Affordable elegance for every budget" />
            </div>

            <div className="form-field">
              <label className="field-label">Icon</label>
              <div className="cm-icon-grid">
                {ICON_OPTIONS.map(icon => (
                  <button key={icon} type="button"
                    className={`cm-icon-btn ${form.icon === icon ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, icon })}>
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-field">
              <label className="field-label">Link Type *</label>
              <select className="field-input" value={form.linkType}
                onChange={e => setForm({ ...form, linkType: e.target.value })}>
                {LINK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
          </div>

          {/* Dynamic link fields based on type */}
          <div className="cm-link-fields">
            {form.linkType === 'section' && (
              <div className="form-field">
                <label className="field-label">Section</label>
                <select className="field-input" value={form.section}
                  onChange={e => setForm({ ...form, section: e.target.value })}>
                  <option value="">Select</option>
                  <option value="bestSellers">Best Sellers</option>
                  <option value="newArrivals">New Arrivals</option>
                </select>
              </div>
            )}

            {form.linkType === 'price' && (
              <div style={{ display: 'flex', gap: 14 }}>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="field-label">Min Price (₹)</label>
                  <input className="field-input" type="number" value={form.minPrice}
                    onChange={e => setForm({ ...form, minPrice: e.target.value })}
                    placeholder="0" />
                </div>
                <div className="form-field" style={{ flex: 1 }}>
                  <label className="field-label">Max Price (₹)</label>
                  <input className="field-input" type="number" value={form.maxPrice}
                    onChange={e => setForm({ ...form, maxPrice: e.target.value })}
                    placeholder="Leave empty for no max" />
                </div>
              </div>
            )}

            {form.linkType === 'category' && (
              <div className="form-field">
                <label className="field-label">Category</label>
                <select className="field-input" value={form.category}
                  onChange={e => setForm({ ...form, category: e.target.value })}>
                  <option value="">Select category</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
            )}

            {form.linkType === 'custom' && (
              <div className="form-field">
                <label className="field-label">Custom Link</label>
                <input className="field-input" value={form.link}
                  onChange={e => setForm({ ...form, link: e.target.value })}
                  placeholder="/shop or /collections or any URL" />
              </div>
            )}

            {form.linkType === 'sale' && (
              <p style={{ fontSize: 12, color: '#2d6a4f', fontStyle: 'italic' }}>
                ✓ This will show only products with active discounts
              </p>
            )}
          </div>

          {/* Preview */}
          <div className="cm-preview">
            <p className="cm-preview-label">PREVIEW</p>
            <div className="cm-preview-card">
              <span className="cm-preview-icon">{form.icon}</span>
              <span className="cm-preview-tag">{form.tag || 'TAG'}</span>
              <p className="cm-preview-title">{form.title || 'Collection Title'}</p>
              <p className="cm-preview-sub">{form.subtitle || 'Description goes here'}</p>
              <span className="cm-preview-link">Explore →</span>
            </div>
          </div>

          <div className="cm-form-actions">
            <button className="btn-primary" onClick={handleAdd} disabled={saving}>
              {saving ? 'Saving...' : editIdx !== null ? 'Update Collection' : 'Add Collection'}
            </button>
            <button className="btn-secondary" onClick={cancelEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* COLLECTIONS LIST */}
      <div className="cm-list">
        {collections.length === 0 ? (
          <div className="card" style={{ padding: 56, textAlign: 'center' }}>
            <p style={{ color: '#aaa', fontSize: 16 }}>No collections yet</p>
            <p style={{ color: '#ccc', fontSize: 13 }}>Click "Add Collection" to create your first one</p>
          </div>
        ) : (
          collections.map((col, idx) => (
            <div className={`cm-card card ${!col.active ? 'cm-card-inactive' : ''}`} key={col.id || idx}>
              <div className="cm-card-left">
                <div className="cm-card-order">
                  <button className="cm-order-btn" onClick={() => moveUp(idx)} disabled={idx === 0}>↑</button>
                  <span className="cm-order-num">{idx + 1}</span>
                  <button className="cm-order-btn" onClick={() => moveDown(idx)} disabled={idx === collections.length - 1}>↓</button>
                </div>
                <span className="cm-card-icon">{col.icon}</span>
                <div className="cm-card-info">
                  <div className="cm-card-title-row">
                    <span className="cm-card-title">{col.title}</span>
                    <span className="cm-card-tag">{col.tag}</span>
                    {!col.active && <span className="cm-card-hidden">HIDDEN</span>}
                  </div>
                  <p className="cm-card-sub">{col.subtitle}</p>
                  <p className="cm-card-link-display">{col.link}</p>
                </div>
              </div>
              <div className="cm-card-actions">
                <button className="cm-action-btn toggle-btn" onClick={() => toggleActive(idx)}
                  title={col.active ? 'Hide' : 'Show'}>
                  {col.active ? <Eye size={14} /> : '👁‍🗨'}
                </button>
                <button className="cm-action-btn edit-btn" onClick={() => handleEdit(idx)} title="Edit">
                  <Pencil size={13} />
                </button>
                <button className="cm-action-btn delete-btn" onClick={() => handleDelete(idx)} title="Delete">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <div className="card cm-info">
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, marginBottom: 10 }}>How Collections Work</h3>
        <ul className="cm-info-list">
          <li>Each card links to a filtered view of the Shop page</li>
          <li><strong>Section</strong> type shows products marked as Best Sellers or New Arrivals in Product Manager</li>
          <li><strong>Price Range</strong> type filters products by their price automatically</li>
          <li><strong>On Sale</strong> shows only products with active discounts</li>
          <li><strong>Category</strong> links to a specific product category</li>
          <li>Use the ↑↓ arrows to reorder how cards appear on the client site</li>
          <li>Toggle the eye icon to hide/show a collection without deleting it</li>
        </ul>
      </div>
    </div>
  );
}