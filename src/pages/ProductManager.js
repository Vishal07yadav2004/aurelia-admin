import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';
import {
  Trash2, Plus, Pencil, Package, X,
  Video, Image as ImgIcon, Tag, FileText, FolderTree, Ruler, Check, Palette
} from 'lucide-react';
import { ToastContext } from '../App';
import ImageDropzone from '../components/ImageDropzone';
import { getSizeConfig } from '../data/sizeConfig';
import './ProductManager.css';

const FALLBACK_CATS = [
  'rings','necklaces','earrings','bracelets',
  'watches','anklets','charms','pendants',
];

const FALLBACK_SUBCATS = {
  rings:     ['Gold','Silver','Diamond','Rose Gold','Platinum','Gold Plated','Engagement','Wedding','Statement'],
  necklaces: ['Gold Plated','Sterling Silver','Pearl','Diamond','Chain','Kundan','Choker','Long','Layered'],
  earrings:  ['Studs','Hoops','Drops','Jhumkas','Pearl','Chandbali','Climbers','Threader'],
  bracelets: ['Gold','Silver','Charm','Tennis','Bangle','Kadas','Cuff','Chain','Beaded'],
  watches:   ['Analog','Digital','Chronograph','Smart','Automatic','Luxury','Sport','Quartz'],
  pendants:  ['Gold','Silver','Diamond','Stone','Religious','Initial','Heart'],
  anklets:   ['Gold','Silver','Beaded','Payal','Chain','Charm'],
  charms:    ['Gold','Silver','Enamel','Birthstone','Letter','Symbol'],
};

const CATEGORY_DEFAULTS = {
  watches:   { details:'This timepiece is a masterpiece of horological artistry.', care:'Wind the crown gently every 40 hours if not worn.', shipping:'Fully insured express shipping within 1–2 business days.' },
  rings:     { details:'Crafted from premium materials and finished by hand.', care:'Remove before swimming or using harsh chemicals.', shipping:'Complimentary express shipping on all orders.' },
  necklaces: { details:'A beautifully crafted necklace featuring superior materials.', care:'Store flat or hung to prevent tangling.', shipping:'Express shipping, 1–2 business days.' },
  bracelets: { details:'A meticulously crafted bracelet combining comfort with elegance.', care:'Store flat in the provided box.', shipping:'Fully insured shipping with tracking.' },
  earrings:  { details:'Stunning earrings crafted with attention to detail.', care:'Wipe gently after each wear.', shipping:'Express shipping, 1–2 business days.' },
  pendants:  { details:'An elegant pendant featuring superior craftsmanship.', care:'Polish with a soft cloth.', shipping:'Express shipping, 1–2 business days.' },
  anklets:   { details:'A delicate anklet that adds elegance to every step.', care:'Remove before swimming.', shipping:'Express shipping, 1–2 business days.' },
  charms:    { details:'A meaningful charm crafted with care.', care:'Wipe with a soft cloth after wearing.', shipping:'Express shipping, 1–2 business days.' },
};

const EMPTY = {
  name: '', price: '', category: '',
  subCategories: [],
  section: 'none',
  images: [], video: '',
  salePrice: '', saleEnabled: false,
  sizeStock: {}, customSizes: [], quantity: '',
  hasSize: true,
  sizeNote: '',
  variants: [],
};
const EMPTY_DESC = { details: '', care: '', shipping: '' };

export default function ProductManager() {
  const { showToast } = useContext(ToastContext);
  const [form, setForm]             = useState(EMPTY);
  const [desc, setDesc]             = useState(EMPTY_DESC);
  const [products, setProducts]     = useState([]);
  const [categories, setCategories] = useState([]);
  const [subCatMap, setSubCatMap]   = useState({});
  const [filter, setFilter]         = useState('all');
  const [editId, setEditId]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('basic');
  const [newCustomSize, setNewCustomSize] = useState('');
  const [nextProductNum, setNextProductNum] = useState(1);

  // Load only Firebase products — no fallback seed data
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), snap => {
      const fbProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fbProds.sort((a, b) => {
        const aT = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bT = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bT - aT;
      });
      setProducts(fbProds);
      // Next product number = highest existing + 1
      const nums = fbProds
        .map(p => p.productNum)
        .filter(n => typeof n === 'number');
      setNextProductNum(nums.length > 0 ? Math.max(...nums) + 1 : 1);
    }, (err) => {
      console.error('Products error:', err);
      setProducts([]);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const allCats = { row1: [], row2: [] };
    const rebuild = () => setCategories([...allCats.row1, ...allCats.row2]);
    const u1 = onSnapshot(doc(db, 'site', 'categories_row1'), s => {
      if (s.exists()) { allCats.row1 = s.data().items?.map(c => ({ id: c.id, label: c.label })) || []; rebuild(); }
    });
    const u2 = onSnapshot(doc(db, 'site', 'categories_row2'), s => {
      if (s.exists()) { allCats.row2 = s.data().items?.map(c => ({ id: c.id, label: c.label })) || []; rebuild(); }
    });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site', 'sub_categories'), snap => {
      if (snap.exists() && snap.data().map) setSubCatMap(snap.data().map);
    }, () => {});
    return () => unsub();
  }, []);

  const catOptions = categories.length > 0
    ? categories
    : FALLBACK_CATS.map(c => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

  const getSubCats = (catId) => {
    if (!catId) return [];
    const fromFB = subCatMap[catId] || [];
    const fromFallback = FALLBACK_SUBCATS[catId.toLowerCase()] || [];
    return [...new Set([...fromFB, ...fromFallback])];
  };

  const handleCategoryChange = (catId) => {
    setForm(f => ({ ...f, category: catId, subCategories: [], sizeStock: {}, customSizes: [] }));
    if (catId && !editId) {
      const defaults = CATEGORY_DEFAULTS[catId.toLowerCase()];
      if (defaults) setDesc({ ...defaults });
    }
  };

  const toggleSubCategory = (sub) => {
    setForm(f => {
      const current = f.subCategories || [];
      return {
        ...f,
        subCategories: current.includes(sub)
          ? current.filter(s => s !== sub)
          : [...current, sub],
      };
    });
  };

  // ── Numeric per-size stock helpers ──
  const getStockValue = (value) => {
    if (value === false) return 0;
    if (value === true || value === undefined || value === null || value === '') return '';
    return Number(value) || 0;
  };

  const updateSizeStock = (size, value) => {
    const stock = Math.max(0, Number(value) || 0);

    setForm(f => ({
      ...f,
      sizeStock: {
        ...f.sizeStock,
        [size]: stock,
      },
    }));
  };

  const markSizeOutOfStock = (size) => {
    setForm(f => ({
      ...f,
      sizeStock: {
        ...f.sizeStock,
        [size]: 0,
      },
    }));
  };

  // Compatibility toggle (still used for quick toggling) — now sets a numeric quantity
  const toggleSizeStock = (size) => {
    setForm(f => {
      const current = getStockValue(f.sizeStock?.[size]);
      const fallbackQty = Number(f.quantity) || 1;

      return {
        ...f,
        sizeStock: {
          ...f.sizeStock,
          [size]: current > 0 ? 0 : fallbackQty,
        },
      };
    });
  };

  const addCustomSize = () => {
    if (!newCustomSize.trim()) return;
    if ((form.customSizes || []).includes(newCustomSize.trim())) {
      showToast('Size already exists', 'error');
      return;
    }

    setForm(f => ({
      ...f,
      customSizes: [...(f.customSizes || []), newCustomSize.trim()],
      sizeStock: {
        ...f.sizeStock,
        [newCustomSize.trim()]: Number(f.quantity) || 1,
      },
    }));

    setNewCustomSize('');
  };

  const removeCustomSize = (size) => {
    setForm(f => {
      const s = { ...f.sizeStock };
      delete s[size];
      return { ...f, customSizes: (f.customSizes || []).filter(x => x !== size), sizeStock: s };
    });
  };

  const quickToggleStock = async (productId, size, currentStatus) => {
    if (typeof productId === 'number') {
      showToast('Cannot manage stock for local product', 'error'); return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newStock = { ...(product.sizeStock || {}), [size]: !currentStatus };
    await updateDoc(doc(db, 'products', String(productId)), { sizeStock: newStock });
    showToast(`Size ${size} ${!currentStatus ? 'in stock' : 'out of stock'} ✓`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validImages = (form.images || []).filter(i => i && i.trim());

    const hasBase64 = validImages.some(i => i.startsWith('data:'));
    if (hasBase64) {
      showToast('Image not uploaded yet — please wait for upload to complete or use a URL', 'error');
      return;
    }

    if (!form.name || !form.price || !form.category || validImages.length === 0) {
      showToast('Fill all required fields and add at least one image', 'error'); return;
    }

    setLoading(true);
    try {
      // Resolve productNum for edit vs new
      const existingProduct = editId ? products.find(p => p.id === editId) : null;
      const resolvedProductNum = editId
        ? (existingProduct?.productNum || nextProductNum)
        : nextProductNum;
      const resolvedSKU = `SKU-${String(resolvedProductNum).padStart(3, '0')}`;

      const normalisedSizeStock = Object.fromEntries(
        Object.entries(form.sizeStock || {}).map(([size, value]) => {
          if (value === false) return [size, 0];
          if (value === true) return [size, Number(form.quantity) || 0];
          return [size, Math.max(0, Number(value) || 0)];
        })
      );

      const totalSizeStock = Object.values(normalisedSizeStock).reduce(
        (sum, value) => sum + (Number(value) || 0),
        0
      );

      const productData = {
        name: form.name,
        price: Number(form.price),
        category: form.category,
        subCategories: form.subCategories || [],
        subCategory: (form.subCategories || []).join(', '),
        section: form.section === 'none' ? '' : form.section,
        images: validImages,
        image: validImages[0],
        video: form.video || '',
        sizeStock: normalisedSizeStock,
        customSizes: form.customSizes || [],
        quantity: form.hasSize !== false ? totalSizeStock : Number(form.quantity) || 0,
        hasSize: form.hasSize !== false,
        sizeNote: form.sizeNote || '',
        variants: (form.variants || []).filter(v => v.name || (v.images || []).length > 0),
        productNum: resolvedProductNum,
        productSKU: resolvedSKU,
        ...(form.saleEnabled && form.salePrice
          ? { salePrice: Number(form.salePrice) }
          : { salePrice: null }),
      };

      let savedId = editId;

      if (editId) {
        if (typeof editId === 'number') {
          const ref = await addDoc(collection(db, 'products'), {
            ...productData, createdAt: serverTimestamp(),
          });
          savedId = ref.id;
          showToast('Product saved to Firebase ✓');
        } else {
          await updateDoc(doc(db, 'products', editId), productData);
          showToast('Product updated ✓');
        }
      } else {
        const ref = await addDoc(collection(db, 'products'), {
          ...productData, createdAt: serverTimestamp(),
        });
        savedId = ref.id;
        showToast('Product added — live on client! 🚀');
      }

      if (savedId && typeof savedId === 'string') {
        await setDoc(doc(db, 'productDescriptions', savedId), {
          details: desc.details, care: desc.care, shipping: desc.shipping,
        });
      }

      if ((form.subCategories || []).length > 0 && form.category) {
        const existing = { ...subCatMap };
        if (!existing[form.category]) existing[form.category] = [];
        const newOnes = (form.subCategories || []).filter(
          s => !existing[form.category].includes(s)
        );
        if (newOnes.length > 0) {
          existing[form.category] = [...existing[form.category], ...newOnes];
          await setDoc(doc(db, 'site', 'sub_categories'), { map: existing });
        }
      }

      setEditId(null); setForm(EMPTY); setDesc(EMPTY_DESC); setActiveFormTab('basic');
    } catch (err) {
      console.error(err);
      showToast('Error saving product — ' + err.message, 'error');
    }
    setLoading(false);
  };

  const handleEdit = async (p) => {
    setForm({
      name: p.name || '',
      price: String(p.price || ''),
      category: p.category || '',
      subCategories: p.subCategories?.length
        ? p.subCategories
        : p.subCategory
          ? p.subCategory.split(',').map(s => s.trim()).filter(Boolean)
          : [],
      section: p.section || 'none',
      images: p.images?.length ? p.images : (p.image ? [p.image] : []),
      video: p.video || '',
      salePrice: p.salePrice ? String(p.salePrice) : '',
      saleEnabled: Boolean(p.salePrice),
      sizeStock: p.sizeStock || {},
      customSizes: p.customSizes || [],
      quantity: p.quantity ? String(p.quantity) : '',
      hasSize: p.hasSize !== false,
      sizeNote: p.sizeNote || '',
      variants: p.variants || [],
    });
    setEditId(p.id);
    setActiveFormTab('basic');

    if (typeof p.id === 'string') {
      try {
        const snap = await getDoc(doc(db, 'productDescriptions', p.id));
        if (snap.exists()) {
          const d = snap.data();
          setDesc({ details: d.details || '', care: d.care || '', shipping: d.shipping || '' });
        } else setDesc(EMPTY_DESC);
      } catch { setDesc(EMPTY_DESC); }
    } else { setDesc(EMPTY_DESC); }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (typeof id === 'number') {
      showToast('Cannot delete local product', 'error'); return;
    }
    if (!window.confirm('Delete this product permanently?')) return;
    await deleteDoc(doc(db, 'products', id));
    showToast('Product deleted');
    if (editId === id) { setEditId(null); setForm(EMPTY); setDesc(EMPTY_DESC); }
  };

  const filtered = filter === 'all' ? products
    : filter === 'none' ? products.filter(p => !p.section || p.section === '')
    : products.filter(p => p.section === filter);

  const salePercent = form.saleEnabled && form.price && form.salePrice
    ? Math.round((1 - Number(form.salePrice) / Number(form.price)) * 100) : 0;

  const currentSubCats = getSubCats(form.category);
  const sizeConfig = form.category ? getSizeConfig(form.category) : null;

  const FORM_TABS = [
    { key: 'basic',    label: 'Basic Info',      icon: Package    },
    { key: 'subcats',  label: 'Sub-category',    icon: FolderTree },
    { key: 'sizes',    label: 'Sizes & Stock',   icon: Ruler      },
    { key: 'variants', label: 'Variants',        icon: Palette    },
    { key: 'media',    label: 'Media',           icon: ImgIcon    },
    { key: 'sale',     label: 'Sale Pricing',    icon: Tag        },
    { key: 'content',  label: 'Product Content', icon: FileText   },
  ];

  return (
    <div className="product-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">Add, edit and manage your jewellery.</p>
        </div>
        <span className="product-count">{products.length} products</span>
      </div>

      <div className="card product-form">
        <h3 className="form-title">
          {editId ? <><Pencil size={17} /> Edit Product</> : <><Plus size={17} /> Add New Product</>}
        </h3>

        <div className="form-tabs">
          {FORM_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button"
              className={`form-tab-btn ${activeFormTab === key ? 'active' : ''}`}
              onClick={() => setActiveFormTab(key)}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── BASIC INFO ── */}
          {activeFormTab === 'basic' && (
            <div className="form-section">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">Product Name *</label>
                  <input className="field-input" placeholder="e.g. Diamond Solitaire Ring"
                    value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="field-label">Price (₹) *</label>
                  <input className="field-input" type="number" placeholder="e.g. 1299"
                    value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="field-label">Quantity / Stock</label>
                  <input className="field-input" type="number" placeholder="e.g. 50"
                    value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="form-field">
                  <label className="field-label">Category *</label>
                  <select className="field-input" value={form.category}
                    onChange={e => handleCategoryChange(e.target.value)}>
                    <option value="">— Select category —</option>
                    {catOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-field" style={{ gridColumn: '1/-1' }}>
                  <label className="field-label">Show in Homepage Section</label>
                  <div className="section-checkboxes">
                    <label className="section-check">
                      <input type="radio" name="section" value="none"
                        checked={!form.section || form.section === 'none'}
                        onChange={() => setForm({ ...form, section: 'none' })} />
                      <span>None (category only)</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="bestSellers"
                        checked={form.section === 'bestSellers'}
                        onChange={() => setForm({ ...form, section: 'bestSellers' })} />
                      <span>⭐ Best Sellers</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="newArrivals"
                        checked={form.section === 'newArrivals'}
                        onChange={() => setForm({ ...form, section: 'newArrivals' })} />
                      <span>✨ New Arrivals</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="combo"
                        checked={form.section === 'combo'}
                        onChange={() => setForm({ ...form, section: 'combo' })} />
                      <span>🎁 Combo</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SUB-CATEGORIES (multi-select) ── */}
          {activeFormTab === 'subcats' && (
            <div className="form-section">
              {!form.category
                ? <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 13 }}>Please select a category first.</p>
                : (
                  <>
                    <div style={{
                      background: '#f0fdf4', border: '1px solid #c3e6cb',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 18,
                      fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#2d6a4f',
                    }}>
                      ✓ You can select <strong>multiple sub-categories</strong> for one product.
                      {(form.subCategories || []).length > 0 && (
                        <span> Selected: <strong>{form.subCategories.join(', ')}</strong></span>
                      )}
                    </div>

                    {currentSubCats.length > 0 && (
                      <div className="form-field" style={{ marginBottom: 18 }}>
                        <label className="field-label" style={{ marginBottom: 10, display: 'block' }}>
                          Select Sub-categories (tap to toggle)
                        </label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {currentSubCats.map(sub => {
                            const selected = (form.subCategories || []).includes(sub);
                            return (
                              <button
                                key={sub}
                                type="button"
                                onClick={() => toggleSubCategory(sub)}
                                style={{
                                  padding: '7px 16px',
                                  borderRadius: 100,
                                  border: selected ? '1.5px solid #1a1a1a' : '1px solid #ddd',
                                  background: selected ? '#1a1a1a' : '#fff',
                                  color: selected ? '#fff' : '#555',
                                  fontFamily: 'Jost, sans-serif',
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  transition: 'all 0.15s',
                                }}
                              >
                                {selected && <Check size={11} />}
                                {sub}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <div className="form-field">
                      <label className="field-label">Add Custom Sub-category</label>
                      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                        <input
                          className="field-input"
                          placeholder="e.g. Polki, Meenakari..."
                          value={form.subCategories?._customInput || ''}
                          onChange={e => setForm(f => ({
                            ...f,
                            subCategories: Object.assign(
                              [...(f.subCategories || [])],
                              { _customInput: e.target.value }
                            ),
                          }))}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (form.subCategories?._customInput || '').trim();
                              if (val) toggleSubCategory(val);
                            }
                          }}
                          style={{ flex: 1 }}
                        />
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '10px 18px' }}
                          onClick={() => {
                            const val = (form.subCategories?._customInput || '').trim();
                            if (val) toggleSubCategory(val);
                          }}
                        >
                          <Plus size={13} /> Add
                        </button>
                      </div>
                    </div>

                    {(form.subCategories || []).filter(s => !currentSubCats.includes(s)).length > 0 && (
                      <div style={{ marginTop: 14 }}>
                        <p className="field-label" style={{ marginBottom: 8 }}>Custom Added</p>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {(form.subCategories || [])
                            .filter(s => !currentSubCats.includes(s))
                            .map(sub => (
                              <div key={sub} style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '6px 12px', borderRadius: 100,
                                border: '1.5px solid #1a1a1a', background: '#1a1a1a',
                                color: '#fff',
                              }}>
                                <span style={{ fontSize: 12 }}>{sub}</span>
                                <button
                                  type="button"
                                  onClick={() => toggleSubCategory(sub)}
                                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', padding: 0 }}
                                >
                                  <X size={12} />
                                </button>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
            </div>
          )}

          {/* ── SIZES & STOCK ── */}
          {activeFormTab === 'sizes' && (
            <div className="form-section">
              <div style={{
                background: '#f9f7f3', padding: '14px 18px', borderRadius: 10,
                marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <label className="section-check" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={form.hasSize}
                    onChange={e => setForm(f => ({ ...f, hasSize: e.target.checked }))}
                  />
                  <span style={{ fontWeight: 500 }}>This product has size options</span>
                </label>
              </div>

              {form.hasSize ? (
                <>
                  {!form.category ? (
                    <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 13 }}>
                      Please select a category first.
                    </p>
                  ) : (
                    <>
                      <label className="field-label" style={{ marginBottom: 12, display: 'block' }}>
                        Standard Sizes - Enter Available Stock
                      </label>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
                        {sizeConfig.sizes.map(size => {
                          const stock = getStockValue(form.sizeStock?.[size]);
                          const isOut = Number(stock) <= 0;

                          return (
                            <div key={size} style={{
                              border: isOut ? '1.5px solid #e74c3c' : '1.5px solid #2d6a4f',
                              background: isOut ? '#fff5f5' : '#f0fdf4',
                              borderRadius: 12,
                              padding: 12,
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <strong style={{
                                  fontFamily: 'Jost,sans-serif',
                                  fontSize: 13,
                                  color: isOut ? '#e74c3c' : '#2d6a4f',
                                }}>
                                  {size}
                                </strong>

                                <button
                                  type="button"
                                  onClick={() => markSizeOutOfStock(size)}
                                  style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#e74c3c',
                                    fontSize: 11,
                                    cursor: 'pointer',
                                  }}
                                >
                                  OOS
                                </button>
                              </div>

                              <input
                                className="field-input"
                                type="number"
                                min="0"
                                placeholder="Stock"
                                value={stock}
                                onChange={e => updateSizeStock(size, e.target.value)}
                              />

                              <p style={{
                                marginTop: 6,
                                fontSize: 11,
                                color: isOut ? '#e74c3c' : '#2d6a4f',
                                fontFamily: 'Jost,sans-serif',
                              }}>
                                {isOut ? 'Out of stock' : `${stock} available`}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      <label className="field-label" style={{ marginBottom: 12, display: 'block' }}>Add Custom Sizes</label>
                      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                        <input className="field-input" placeholder='e.g. 13, XXL'
                          value={newCustomSize} onChange={e => setNewCustomSize(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                          style={{ flex: 1 }} />
                        <button type="button" className="btn-primary" style={{ padding: '10px 20px' }} onClick={addCustomSize}>
                          <Plus size={14} /> Add
                        </button>
                      </div>
                      {(form.customSizes || []).length > 0 && (
                        <div>
                          {(form.customSizes || []).map(size => {
                            const stock = getStockValue(form.sizeStock?.[size]);

                            return (
                              <div key={size} style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 100px auto',
                                gap: 8,
                                alignItems: 'center',
                                marginBottom: 8,
                              }}>
                                <span style={{ fontFamily: 'Jost,sans-serif', fontSize: 13 }}>
                                  {size}
                                </span>

                                <input
                                  className="field-input"
                                  type="number"
                                  min="0"
                                  value={stock}
                                  onChange={e => updateSizeStock(size, e.target.value)}
                                />

                                <button type="button" className="btn-secondary" onClick={() => removeCustomSize(size)}>
                                  Remove
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </>
              ) : (
                <div className="form-field">
                  <label className="field-label">Size Note (Optional)</label>
                  <input
                    className="field-input"
                    placeholder="e.g. One Size, Adjustable, Fits all wrist sizes..."
                    value={form.sizeNote}
                    onChange={e => setForm(f => ({ ...f, sizeNote: e.target.value }))}
                  />
                  <p className="form-hint">
                    This text will show instead of size buttons on the product page.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── VARIANTS ── */}
          {activeFormTab === 'variants' && (
            <div className="form-section">
              <div style={{
                background: '#f0fdf4', border: '1px solid #c3e6cb', borderRadius: 10,
                padding: '12px 16px', marginBottom: 18, fontSize: 12, color: '#2d6a4f',
                fontFamily: 'Jost, sans-serif',
              }}>
                ✓ Variants are different colors/styles of the same product. Each variant can have its own images.
              </div>

              {(form.variants || []).map((variant, idx) => (
                <div key={idx} className="variant-card">
                  <div className="variant-header">
                    <span className="variant-num">Variant {idx + 1}</span>
                    <button type="button" className="variant-remove"
                      onClick={() => setForm(f => ({
                        ...f,
                        variants: f.variants.filter((_, i) => i !== idx),
                      }))}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <div className="variant-form-row">
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="field-label">Variant Name</label>
                      <input className="field-input" placeholder="e.g. Gold, Silver, Red..."
                        value={variant.name}
                        onChange={e => {
                          const updated = [...form.variants];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setForm(f => ({ ...f, variants: updated }));
                        }} />
                    </div>
                    <div className="form-field" style={{ flex: 1 }}>
                      <label className="field-label">Color Code (optional)</label>
                      <div className="color-input-row">
                        <input type="color" value={variant.color || '#cccccc'}
                          onChange={e => {
                            const updated = [...form.variants];
                            updated[idx] = { ...updated[idx], color: e.target.value };
                            setForm(f => ({ ...f, variants: updated }));
                          }} />
                        <input className="field-input" value={variant.color || ''}
                          onChange={e => {
                            const updated = [...form.variants];
                            updated[idx] = { ...updated[idx], color: e.target.value };
                            setForm(f => ({ ...f, variants: updated }));
                          }}
                          placeholder="#000000" />
                      </div>
                    </div>
                  </div>
                  <div className="form-field" style={{ marginTop: 12 }}>
                    <label className="field-label">Variant Images</label>
                    <ImageDropzone
                      value={variant.images || []}
                      onChange={imgs => {
                        const updated = [...form.variants];
                        updated[idx] = { ...updated[idx], images: imgs };
                        setForm(f => ({ ...f, variants: updated }));
                      }}
                      folder="kanyamaa-variants"
                      aspect={1}
                      multi={true}
                      maxFiles={5}
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setForm(f => ({
                  ...f,
                  variants: [...(f.variants || []), { name: '', color: '', images: [] }],
                }))}
                style={{ marginTop: 12 }}
              >
                <Plus size={14} /> Add Variant
              </button>
            </div>
          )}

          {/* ── MEDIA ── */}
          {activeFormTab === 'media' && (
            <div className="form-section">
              <div style={{
                background: '#fff8f0', padding: '10px 14px', borderRadius: 10,
                marginBottom: 14, fontSize: 12, color: '#856404',
                fontFamily: 'Jost, sans-serif',
              }}>
                ⚠️ Images are uploaded to Cloudinary. Do <strong>not</strong> save until the upload spinner finishes.
                Storing raw file data will exceed Firestore limits.
              </div>
              <ImageDropzone
                value={form.images}
                onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
                folder="kanyamaa-products"
                aspect={1}
                multi={true}
                maxFiles={5}
                label="Product Photos (up to 5)"
              />
              <div className="form-field" style={{ marginTop: 24 }}>
                <label className="field-label"><Video size={12} /> Product Video (Optional)</label>
                <input className="field-input" placeholder="Paste video URL..."
                  value={form.video} onChange={e => setForm({ ...form, video: e.target.value })} />
              </div>
            </div>
          )}

          {/* ── SALE PRICING ── */}
          {activeFormTab === 'sale' && (
            <div className="form-section">
              <div style={{ background: '#fff8f0', padding: '12px 16px', borderRadius: 10, marginBottom: 16, fontSize: 12, color: '#856404' }}>
                💡 For category-wide sales use the <strong>Sale Banner</strong> page.
              </div>
              <label className="section-check" style={{ marginBottom: 20 }}>
                <input type="checkbox" checked={form.saleEnabled}
                  onChange={e => setForm({ ...form, saleEnabled: e.target.checked, salePrice: '' })} />
                <span style={{ fontWeight: 500 }}>Enable Sale Price for this Product</span>
              </label>
              {form.saleEnabled && (
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">Original Price</label>
                    <input className="field-input" value={`₹${form.price || 0}`} readOnly
                      style={{ background: '#f8f8f8', color: '#aaa' }} />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Sale Price (₹) *</label>
                    <input className="field-input" type="number" value={form.salePrice}
                      onChange={e => setForm({ ...form, salePrice: e.target.value })} />
                  </div>
                </div>
              )}
              {salePercent > 0 && (
                <div style={{ background: '#fff0ee', border: '1px solid #fcd4cf', borderRadius: 10, padding: '16px 20px', marginTop: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 28, fontStyle: 'italic', color: '#e74c3c' }}>₹{Number(form.salePrice).toLocaleString('en-IN')}</span>
                  <span style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 18, color: '#bbb', textDecoration: 'line-through' }}>₹{Number(form.price).toLocaleString('en-IN')}</span>
                  <span style={{ background: '#e74c3c', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 100 }}>-{salePercent}% OFF</span>
                </div>
              )}
            </div>
          )}

          {/* ── CONTENT ── */}
          {activeFormTab === 'content' && (
            <div className="form-section">
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label className="field-label">Details Tab</label>
                <textarea className="field-input" style={{ minHeight: 100 }}
                  placeholder="Materials, craftsmanship..."
                  value={desc.details} onChange={e => setDesc({ ...desc, details: e.target.value })} />
              </div>
              <div className="form-field" style={{ marginBottom: 16 }}>
                <label className="field-label">Care Tab</label>
                <textarea className="field-input" style={{ minHeight: 80 }}
                  placeholder="How to clean, store..."
                  value={desc.care} onChange={e => setDesc({ ...desc, care: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Shipping Tab</label>
                <textarea className="field-input" style={{ minHeight: 80 }}
                  placeholder="Shipping times, returns..."
                  value={desc.shipping} onChange={e => setDesc({ ...desc, shipping: e.target.value })} />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
            </button>
            {editId
              ? <button className="btn-secondary" type="button"
                  onClick={() => { setEditId(null); setForm(EMPTY); setDesc(EMPTY_DESC); }}>
                  Cancel Edit
                </button>
              : <button className="btn-secondary" type="button"
                  onClick={() => { setForm(EMPTY); setDesc(EMPTY_DESC); }}>
                  Clear
                </button>
            }
          </div>
        </form>
      </div>

      {/* ── PRODUCT LIST ── */}
      <div className="products-list-section">
        <div className="list-header">
          <h3 className="section-heading">All Products</h3>
          <div className="filter-tabs">
            {[
              ['all', 'All'],
              ['bestSellers', 'Best Sellers'],
              ['newArrivals', 'New Arrivals'],
              ['combo', 'Combo'],
              ['none', 'No Section'],
            ].map(([key, label]) => (
              <button key={key} className={`filter-tab ${filter === key ? 'active' : ''}`}
                onClick={() => setFilter(key)}>{label}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state card">
            <Package size={44} strokeWidth={1} color="#ccc" />
            <p>No products here</p>
            <span>Add your first product using the form above</span>
          </div>
        ) : (
          <div className="product-queue">
            {filtered.map(p => {
              const hasDiscount = p.salePrice && p.salePrice < p.price;
              const pct = hasDiscount ? Math.round((1 - p.salePrice / p.price) * 100) : 0;
              const sc = getSizeConfig(p.category);
              const allProductSizes = [...sc.sizes, ...(p.customSizes || [])];
              const outOfStockCount = allProductSizes.filter(s => Number(p.sizeStock?.[s] || 0) <= 0).length;
              const totalStock = p.hasSize !== false
                ? allProductSizes.reduce((sum, s) => sum + (Number(p.sizeStock?.[s]) || 0), 0)
                : Number(p.quantity) || 0;

              return (
                <div
                  className={`product-queue-item card ${editId === p.id ? 'editing' : ''}`}
                  key={p.id}
                  style={{ flexDirection: 'column', alignItems: 'stretch' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, width: '100%' }}>
                    <div className="pq-image">
                      {p.image
                        ? <img src={p.image} alt={p.name} />
                        : <span className="pq-placeholder">?</span>}
                      {(p.images?.length || 0) > 1 && (
                        <span className="pq-img-count">+{p.images.length - 1}</span>
                      )}
                    </div>
                    <div className="pq-info">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <p className="pq-name">{p.name}</p>
                        {(p.productSKU || p.productNum) && (
                          <span style={{
                            fontFamily: 'monospace', fontSize: 10, color: '#bbb',
                            background: '#f5f5f5', padding: '1px 6px', borderRadius: 4,
                            letterSpacing: '0.05em',
                          }}>
                            {p.productSKU || `SKU-${String(p.productNum).padStart(3, '0')}`}
                          </span>
                        )}
                      </div>
                      <div className="pq-meta">
                        <span className="pq-category">{p.category || '—'}</span>
                        {(p.subCategories?.length > 0
                          ? p.subCategories
                          : p.subCategory ? [p.subCategory] : []
                        ).map(sub => (
                          <span key={sub} className="pq-category"
                            style={{ background: '#e8f4f8', color: '#2d6a9f' }}>{sub}</span>
                        ))}
                        {p.section === 'bestSellers' && <span className="pq-section bestSellers">Best Seller</span>}
                        {p.section === 'newArrivals' && <span className="pq-section newArrivals">New Arrival</span>}
                        {p.section === 'combo' && (
                          <span className="pq-section" style={{ background: '#fff3e0', color: '#e65100' }}>🎁 Combo</span>
                        )}
                        {outOfStockCount > 0 && (
                          <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 100, background: '#fff0ee', color: '#e74c3c' }}>
                            {outOfStockCount} OOS
                          </span>
                        )}
                        <span style={{
                          fontSize: 11,
                          padding: '2px 10px',
                          borderRadius: 100,
                          background: totalStock > 0 ? '#f0fdf4' : '#fff0ee',
                          color: totalStock > 0 ? '#2d6a4f' : '#e74c3c',
                        }}>
                          Stock: {totalStock}
                        </span>
                      </div>
                    </div>
                    <div className="pq-price-col">
                      {hasDiscount ? (
                        <>
                          <p className="pq-price sale-price">₹{(p.salePrice || 0).toLocaleString('en-IN')}</p>
                          <p className="pq-orig">₹{(p.price || 0).toLocaleString('en-IN')}</p>
                          <span className="pq-discount-badge">-{pct}%</span>
                        </>
                      ) : (
                        <p className="pq-price">₹{(p.price || 0).toLocaleString('en-IN')}</p>
                      )}
                    </div>
                    <div className="pq-actions">
                      <button className="pq-edit" onClick={() => handleEdit(p)}><Pencil size={15} /></button>
                      <button className="pq-delete" onClick={() => handleDelete(p.id)}><Trash2 size={15} /></button>
                    </div>
                  </div>

                  {/* Quick stock toggle */}
                  {p.category && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #f0ece6' }}>
                      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: '#aaa', marginBottom: 8, textTransform: 'uppercase' }}>
                        Quick Stock ({sc.label}):
                      </p>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {allProductSizes.map(size => {
                          const isOut = Number(p.sizeStock?.[size] || 0) <= 0;
                          return (
                            <button key={size} onClick={() => quickToggleStock(p.id, size, isOut)} style={{
                              padding: '4px 10px', fontSize: 11,
                              border: isOut ? '1px solid #e74c3c' : '1px solid #2d6a4f',
                              background: isOut ? '#fff5f5' : '#f0fdf4',
                              color: isOut ? '#e74c3c' : '#2d6a4f',
                              borderRadius: 100, cursor: 'pointer',
                              fontFamily: 'Jost,sans-serif',
                              textDecoration: isOut ? 'line-through' : 'none',
                            }}>
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}