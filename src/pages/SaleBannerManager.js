import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot, collection, query, orderBy } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Check, X, Search } from 'lucide-react';
import { allProducts } from '../data/products';
import './SaleBannerManager.css';

const DEFAULT = {
  active: false,
  text: '',
  bgColor: '#7B1C3E',
  textColor: '#ffffff',
  discountPercent: 0,
  categories: [],
  productIds: [],
  saleMode: 'categories', // 'categories' or 'products' or 'all'
};

const PRESETS = [
  { label:'Deep Rose',    bgColor:'#7B1C3E', textColor:'#fff' },
  { label:'Gold',         bgColor:'#B8860B', textColor:'#fff' },
  { label:'Midnight',     bgColor:'#1a1a2e', textColor:'#fff' },
  { label:'Forest',       bgColor:'#2d6a4f', textColor:'#fff' },
  { label:'Coral',        bgColor:'#e74c3c', textColor:'#fff' },
  { label:'Warm Amber',   bgColor:'#c0392b', textColor:'#fff' },
];

const FALLBACK_CATS = ['rings','necklaces','earrings','bracelets','watches','anklets','charms','pendants'];

export default function SaleBannerManager() {
  const { showToast } = useContext(ToastContext);
  const [banner, setBanner] = useState(DEFAULT);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(true);
  const [allCats, setAllCats] = useState([]);
  const [allFbProducts, setAllFbProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');

  // Load sale banner config
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site', 'sale_banner'), snap => {
      if (snap.exists()) {
        setBanner({ ...DEFAULT, ...snap.data() });
      }
    });
    return () => unsub();
  }, []);

  // Load categories
  useEffect(() => {
    const allCatsRef = { row1: [], row2: [] };
    const rebuild = () => {
      const combined = [...allCatsRef.row1, ...allCatsRef.row2];
      if (combined.length > 0) {
        setAllCats(combined.map(c => ({ id: c.id, label: c.label })));
      } else {
        setAllCats(FALLBACK_CATS.map(c => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) })));
      }
    };
    const u1 = onSnapshot(doc(db, 'site', 'categories_row1'), s => {
      if (s.exists()) { allCatsRef.row1 = s.data().items || []; rebuild(); }
      else { rebuild(); }
    });
    const u2 = onSnapshot(doc(db, 'site', 'categories_row2'), s => {
      if (s.exists()) { allCatsRef.row2 = s.data().items || []; rebuild(); }
    });
    return () => { u1(); u2(); };
  }, []);

  // Load all products
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      const fb = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Merge with static products
      const merged = [
        ...fb,
        ...allProducts.filter(d => !fb.some(f => f.name?.toLowerCase() === d.name?.toLowerCase()))
      ];
      setAllFbProducts(merged);
    });
    return () => unsub();
  }, []);

  const save = async () => {
    if (!banner.text.trim()) {
      showToast('Please enter banner text', 'error');
      return;
    }
    if (banner.active && banner.discountPercent <= 0) {
      showToast('Please set a discount percentage', 'error');
      return;
    }
    setSaving(true);
    await setDoc(doc(db, 'site', 'sale_banner'), banner);
    setSaving(false);
    showToast(banner.active ? `Sale LIVE — ${banner.discountPercent}% off ${banner.saleMode === 'all' ? 'all products' : banner.saleMode === 'categories' ? banner.categories.length + ' categories' : banner.productIds.length + ' products'}! 🚀` : 'Banner hidden ✓');
  };

  const toggleCategory = (catId) => {
    setBanner(b => ({
      ...b,
      categories: b.categories.includes(catId)
        ? b.categories.filter(c => c !== catId)
        : [...b.categories, catId],
    }));
  };

  const toggleProduct = (pid) => {
    const pidStr = String(pid);
    setBanner(b => ({
      ...b,
      productIds: b.productIds.includes(pidStr)
        ? b.productIds.filter(p => p !== pidStr)
        : [...b.productIds, pidStr],
    }));
  };

  const selectAllInCategory = (catId) => {
    const idsInCat = allFbProducts
      .filter(p => p.category === catId)
      .map(p => String(p.id));
    setBanner(b => ({
      ...b,
      productIds: [...new Set([...b.productIds, ...idsInCat])],
    }));
    showToast(`Added ${idsInCat.length} products from ${catId}`);
  };

  const filteredProducts = allFbProducts.filter(p =>
    !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())
  );

  // Calculate affected products
  const affectedCount = (() => {
    if (banner.saleMode === 'all') return allFbProducts.length;
    if (banner.saleMode === 'categories') {
      return allFbProducts.filter(p => banner.categories.includes(p.category)).length;
    }
    return banner.productIds.length;
  })();

  return (
    <div className="sale-banner-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Sale Banner</h1>
          <p className="page-sub">Configure announcement banner + auto-apply discount to selected products.</p>
        </div>
      </div>

      {/* Live preview */}
      {preview && banner.text && (
        <div className="sbm-preview-bar" style={{ background: banner.bgColor, color: banner.textColor }}>
          🏷 {banner.text} {banner.discountPercent > 0 && `· ${banner.discountPercent}% OFF`} &nbsp;<span className="sbm-preview-cta">SHOP NOW →</span>
        </div>
      )}

      <div className="card sbm-card">
        {/* Toggle */}
        <div className="sbm-toggle-row">
          <div>
            <p className="sbm-toggle-label">Sale Status</p>
            <p className="sbm-toggle-sub">
              {banner.active 
                ? `🟢 LIVE — ${banner.discountPercent}% off applied to ${affectedCount} product(s)` 
                : '⚫ Hidden — sale not active'}
            </p>
          </div>
          <label className="toggle-switch">
            <input type="checkbox" checked={banner.active} onChange={e => setBanner({ ...banner, active: e.target.checked })} />
            <span className="toggle-track" />
          </label>
        </div>

        {/* Text */}
        <div className="form-field" style={{ marginTop: 20 }}>
          <label className="field-label">Banner Text *</label>
          <input className="field-input" placeholder="e.g. ✨ FESTIVE SALE — Up to 47% off"
            value={banner.text} onChange={e => setBanner({ ...banner, text: e.target.value })} />
        </div>

        {/* Discount */}
        <div className="form-field" style={{ marginTop: 16 }}>
          <label className="field-label">Discount Percentage *</label>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <input
              type="number"
              min="0" max="99"
              className="field-input"
              style={{ width: 100 }}
              value={banner.discountPercent}
              onChange={e => setBanner({ ...banner, discountPercent: Math.min(99, Math.max(0, Number(e.target.value))) })}
            />
            <span style={{ fontSize: 18, color: '#666' }}>%</span>
            <span style={{ fontSize: 13, color: '#888', fontStyle: 'italic' }}>
              Applied automatically to selected products
            </span>
          </div>
        </div>

        {/* Sale Mode */}
        <div className="form-field" style={{ marginTop: 20 }}>
          <label className="field-label">Apply Sale To *</label>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
            {[
              { v: 'all', l: '🌐 All Products' },
              { v: 'categories', l: '📁 Selected Categories' },
              { v: 'products', l: '🎯 Specific Products' },
            ].map(opt => (
              <button key={opt.v} type="button"
                onClick={() => setBanner({ ...banner, saleMode: opt.v })}
                style={{
                  padding: '10px 18px',
                  borderRadius: 100,
                  border: banner.saleMode === opt.v ? '1.5px solid #1a1a1a' : '1px solid #ddd',
                  background: banner.saleMode === opt.v ? '#1a1a1a' : '#fff',
                  color: banner.saleMode === opt.v ? '#fff' : '#555',
                  fontFamily: 'Jost,sans-serif', fontSize: 13, cursor: 'pointer',
                }}>
                {opt.l}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Selection */}
        {banner.saleMode === 'categories' && (
          <div className="form-field" style={{ marginTop: 20, padding: 16, background: '#f9f7f3', borderRadius: 10 }}>
            <label className="field-label" style={{ marginBottom: 12, display: 'block' }}>
              Select Categories for Sale ({banner.categories.length} selected)
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allCats.map(cat => {
                const isSelected = banner.categories.includes(cat.id);
                const productsInCat = allFbProducts.filter(p => p.category === cat.id).length;
                return (
                  <button key={cat.id} type="button"
                    onClick={() => toggleCategory(cat.id)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 100,
                      border: isSelected ? '1.5px solid #2d6a4f' : '1px solid #ddd',
                      background: isSelected ? '#f0fdf4' : '#fff',
                      color: isSelected ? '#2d6a4f' : '#555',
                      fontFamily: 'Jost,sans-serif', fontSize: 13,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                    }}>
                    {isSelected && <Check size={13} />}
                    {cat.label}
                    <span style={{ fontSize: 11, color: '#999' }}>({productsInCat})</span>
                  </button>
                );
              })}
            </div>
            {banner.categories.length > 0 && (
              <p style={{ marginTop: 12, fontSize: 12, color: '#2d6a4f' }}>
                ✓ {affectedCount} products will get {banner.discountPercent}% off
              </p>
            )}
          </div>
        )}

        {/* Products Selection */}
        {banner.saleMode === 'products' && (
          <div className="form-field" style={{ marginTop: 20, padding: 16, background: '#f9f7f3', borderRadius: 10 }}>
            <label className="field-label" style={{ marginBottom: 12, display: 'block' }}>
              Select Products for Sale ({banner.productIds.length} selected)
            </label>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: 12 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#999' }} />
              <input className="field-input" style={{ paddingLeft: 36 }}
                placeholder="Search products..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)} />
            </div>

            {/* Quick add by category */}
            <div style={{ marginBottom: 14, padding: '10px 14px', background: '#fff', borderRadius: 8 }}>
              <p style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>QUICK ADD:</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {allCats.map(cat => (
                  <button key={cat.id} type="button"
                    onClick={() => selectAllInCategory(cat.id)}
                    style={{
                      padding: '4px 12px', borderRadius: 100,
                      border: '1px solid #ddd', background: '#fff',
                      fontSize: 11, cursor: 'pointer', color: '#666',
                      fontFamily: 'Jost,sans-serif',
                    }}>
                    + All {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Products list */}
            <div style={{ maxHeight: 400, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredProducts.map(p => {
                const isSelected = banner.productIds.includes(String(p.id));
                return (
                  <div key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      border: isSelected ? '1.5px solid #2d6a4f' : '1px solid #eee',
                      background: isSelected ? '#f0fdf4' : '#fff',
                      cursor: 'pointer',
                    }}>
                    <div style={{
                      width: 18, height: 18, borderRadius: 4,
                      border: isSelected ? '2px solid #2d6a4f' : '2px solid #ccc',
                      background: isSelected ? '#2d6a4f' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {isSelected && <Check size={11} color="#fff" strokeWidth={3} />}
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 6, overflow: 'hidden', background: '#f0ece6', flexShrink: 0 }}>
                      {p.image && <img src={p.image} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 13, color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.name}</p>
                      <p style={{ fontSize: 11, color: '#999' }}>{p.category} · ₹{(p.price || 0).toLocaleString('en-IN')}</p>
                    </div>
                    {isSelected && banner.discountPercent > 0 && (
                      <span style={{ fontSize: 11, color: '#e74c3c', fontWeight: 600 }}>
                        ₹{Math.round((p.price || 0) * (1 - banner.discountPercent / 100)).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {banner.saleMode === 'all' && (
          <div style={{ marginTop: 16, padding: 14, background: '#fff8f0', borderRadius: 10, fontSize: 13, color: '#856404' }}>
            ⚠️ Sale will apply to <strong>ALL {allFbProducts.length} products</strong> in the store.
          </div>
        )}

        {/* Color presets */}
        <div className="form-field" style={{ marginTop: 24 }}>
          <label className="field-label">Banner Color</label>
          <div className="sbm-presets">
            {PRESETS.map(p => (
              <button key={p.label}
                className={`sbm-preset-btn ${banner.bgColor === p.bgColor ? 'active' : ''}`}
                style={{ background: p.bgColor }}
                onClick={() => setBanner({ ...banner, bgColor: p.bgColor, textColor: p.textColor })}
                title={p.label}
              />
            ))}
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="field-label">Custom BG</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={banner.bgColor} onChange={e => setBanner({ ...banner, bgColor: e.target.value })}
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                <input className="field-input" value={banner.bgColor} onChange={e => setBanner({ ...banner, bgColor: e.target.value })} style={{ fontFamily: 'monospace', fontSize: 13 }} />
              </div>
            </div>
            <div className="form-field" style={{ flex: 1 }}>
              <label className="field-label">Text Color</label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="color" value={banner.textColor} onChange={e => setBanner({ ...banner, textColor: e.target.value })}
                  style={{ width: 40, height: 36, border: 'none', borderRadius: 8, cursor: 'pointer', padding: 2 }} />
                <input className="field-input" value={banner.textColor} onChange={e => setBanner({ ...banner, textColor: e.target.value })} style={{ fontFamily: 'monospace', fontSize: 13 }} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
          <button className="btn-primary" onClick={save} disabled={saving || !banner.text.trim()}>
            {saving ? 'Saving...' : banner.active ? '🚀 Save & Go Live' : 'Save Changes'}
          </button>
          <button className="btn-secondary" onClick={() => setPreview(p => !p)}>
            {preview ? 'Hide Preview' : '👁 Preview'}
          </button>
        </div>
      </div>

      <div className="card sbm-info-card">
        <h3 style={{ fontFamily: 'Cormorant Garamond', fontSize: 18, marginBottom: 10 }}>How it works</h3>
        <ul className="sbm-info-list">
          <li>Set the <strong>discount percentage</strong> (e.g. 47%)</li>
          <li>Choose <strong>which products</strong> get the discount: all, by category, or specific products</li>
          <li>When <strong>active</strong>, prices on the client site automatically update — original price gets a strikethrough, new discounted price shows in red</li>
          <li>Toggle <strong>off</strong> to instantly remove the sale (prices return to normal)</li>
          <li>This works independently from per-product sale prices (which still take priority)</li>
        </ul>
      </div>
    </div>
  );
}