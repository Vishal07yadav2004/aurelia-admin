import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, serverTimestamp, setDoc, getDoc
} from 'firebase/firestore';
import {
  Trash2, Plus, Pencil, Package, X, Video,
  Image as ImgIcon, Tag, FileText, FolderTree, Ruler, Check
} from 'lucide-react';
import { ToastContext } from '../App';
import ImageDropzone from '../components/ImageDropzone';
import { getSizeConfig } from '../data/sizeConfig';
import { allProducts } from '../data/products';
import './ProductManager.css';

const FALLBACK_CATS = ['rings','necklaces','earrings','bracelets','watches','anklets','charms','pendants'];

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
  name:'', price:'', category:'', subCategory:'', section:'none',
  images:[], video:'', salePrice:'', saleEnabled:false,
  sizeStock:{}, customSizes:[], quantity:'',
};
const EMPTY_DESC = { details:'', care:'', shipping:'' };

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

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'products'), snap => {
      const fbProds = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      fbProds.sort((a, b) => {
        const aTime = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
        const bTime = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
        return bTime - aTime;
      });
      const merged = [
        ...fbProds,
        ...allProducts.filter(d => !fbProds.some(f => f.name?.toLowerCase() === d.name?.toLowerCase()))
      ];
      setProducts(merged);
    }, (err) => {
      console.error('Products listen error:', err);
      setProducts(allProducts);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const allCats = { row1:[], row2:[] };
    const rebuild = () => setCategories([...allCats.row1,...allCats.row2]);
    const u1 = onSnapshot(doc(db,'site','categories_row1'), s => {
      if (s.exists()) { allCats.row1 = s.data().items?.map(c=>({id:c.id,label:c.label}))||[]; rebuild(); }
    });
    const u2 = onSnapshot(doc(db,'site','categories_row2'), s => {
      if (s.exists()) { allCats.row2 = s.data().items?.map(c=>({id:c.id,label:c.label}))||[]; rebuild(); }
    });
    return () => { u1(); u2(); };
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db,'site','sub_categories'), snap => {
      if (snap.exists() && snap.data().map) setSubCatMap(snap.data().map);
    }, () => {});
    return () => unsub();
  }, []);

  const catOptions = categories.length > 0
    ? categories
    : FALLBACK_CATS.map(c => ({ id:c, label:c.charAt(0).toUpperCase()+c.slice(1) }));

  const getSubCats = (catId) => {
    if (!catId) return [];
    const fromFB = subCatMap[catId] || [];
    const fromFallback = FALLBACK_SUBCATS[catId.toLowerCase()] || [];
    return [...new Set([...fromFB, ...fromFallback])];
  };

  const handleCategoryChange = (catId) => {
    setForm(f => ({ ...f, category: catId, subCategory: '', sizeStock: {}, customSizes: [] }));
    if (catId && !editId) {
      const defaults = CATEGORY_DEFAULTS[catId.toLowerCase()];
      if (defaults) setDesc({ details: defaults.details, care: defaults.care, shipping: defaults.shipping });
    }
  };

  const toggleSizeStock = (size) => {
    setForm(f => ({ ...f, sizeStock: { ...f.sizeStock, [size]: f.sizeStock[size] === false ? true : false } }));
  };

  const addCustomSize = () => {
    if (!newCustomSize.trim()) return;
    if (form.customSizes.includes(newCustomSize.trim())) { showToast('Size already exists','error'); return; }
    setForm(f => ({ ...f, customSizes: [...f.customSizes, newCustomSize.trim()], sizeStock: { ...f.sizeStock, [newCustomSize.trim()]: true } }));
    setNewCustomSize('');
  };

  const removeCustomSize = (size) => {
    setForm(f => { const s = { ...f.sizeStock }; delete s[size]; return { ...f, customSizes: f.customSizes.filter(x => x !== size), sizeStock: s }; });
  };

  const quickToggleStock = async (productId, size, currentStatus) => {
    if (typeof productId === 'number') {
      showToast('Seed this product to Firebase first to manage stock', 'error');
      return;
    }
    const product = products.find(p => p.id === productId);
    if (!product) return;
    const newStock = { ...(product.sizeStock || {}), [size]: !currentStatus };
    await updateDoc(doc(db, 'products', String(productId)), { sizeStock: newStock });
    showToast(`Size ${size} ${!currentStatus ? 'in stock' : 'out of stock'} ✓`);
  };

  const seedDefaultProducts = async () => {
    if (!window.confirm('This will add all 16 default products to Firebase so they become fully editable. Continue?')) return;
    setLoading(true);
    try {
      for (const p of allProducts) {
        const alreadyExists = products.some(fb => fb.name?.toLowerCase() === p.name?.toLowerCase() && typeof fb.id === 'string');
        if (!alreadyExists) {
          await addDoc(collection(db, 'products'), {
            name: p.name, price: p.price, category: p.category, subCategory: p.subCategory || '',
            section: p.section || '', images: p.images || [p.image], image: p.image,
            video: '', sizeStock: {}, customSizes: [], quantity: 0, createdAt: serverTimestamp(),
          });
        }
      }
      showToast('All default products added to Firebase! Now fully editable 🎉');
    } catch (err) { console.error(err); showToast('Error seeding products', 'error'); }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validImages = (form.images || []).filter(i => i && i.trim());
    if (!form.name || !form.price || !form.category || validImages.length === 0) {
      showToast('Fill all required fields and add at least one image', 'error'); return;
    }
    setLoading(true);
    try {
      const productData = {
        name: form.name, price: Number(form.price), category: form.category,
        subCategory: form.subCategory || '', section: form.section === 'none' ? '' : form.section,
        images: validImages, image: validImages[0], video: form.video || '',
        sizeStock: form.sizeStock || {}, customSizes: form.customSizes || [],
        quantity: Number(form.quantity) || 0,
        ...(form.saleEnabled && form.salePrice ? { salePrice: Number(form.salePrice) } : { salePrice: null }),
      };

      let savedId = editId;

      if (editId) {
        if (typeof editId === 'number') {
          const ref = await addDoc(collection(db,'products'), { ...productData, createdAt: serverTimestamp() });
          savedId = ref.id;
          showToast('Product saved to Firebase — now fully editable! ✓');
        } else {
          await updateDoc(doc(db,'products',editId), productData);
          showToast('Product updated ✓');
        }
      } else {
        const ref = await addDoc(collection(db,'products'), { ...productData, createdAt: serverTimestamp() });
        savedId = ref.id;
        showToast('Product added — live on client! 🚀');
      }

      if (savedId && typeof savedId === 'string') {
        await setDoc(doc(db,'productDescriptions', savedId), { details: desc.details, care: desc.care, shipping: desc.shipping });
      }

      if (form.subCategory && form.category) {
        const existing = { ...subCatMap };
        if (!existing[form.category]) existing[form.category] = [];
        if (!existing[form.category].includes(form.subCategory)) {
          existing[form.category] = [...existing[form.category], form.subCategory];
          await setDoc(doc(db,'site','sub_categories'), { map: existing });
        }
      }

      setEditId(null); setForm(EMPTY); setDesc(EMPTY_DESC); setActiveFormTab('basic');
    } catch (err) { console.error(err); showToast('Error saving product','error'); }
    setLoading(false);
  };

  const handleEdit = async (p) => {
    setForm({
      name: p.name, price: String(p.price), category: p.category || '',
      subCategory: p.subCategory || '', section: p.section || 'none',
      images: p.images?.length ? p.images : (p.image ? [p.image] : []),
      video: p.video || '',
      salePrice: p.salePrice ? String(p.salePrice) : '', saleEnabled: Boolean(p.salePrice),
      sizeStock: p.sizeStock || {}, customSizes: p.customSizes || [],
      quantity: p.quantity ? String(p.quantity) : '',
    });
    setEditId(p.id);
    setActiveFormTab('basic');
    if (typeof p.id === 'string') {
      try {
        const snap = await getDoc(doc(db,'productDescriptions', p.id));
        if (snap.exists()) { const d = snap.data(); setDesc({ details: d.details||'', care: d.care||'', shipping: d.shipping||'' }); }
        else setDesc(EMPTY_DESC);
      } catch { setDesc(EMPTY_DESC); }
    } else { setDesc(EMPTY_DESC); }
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleDelete = async (id) => {
    if (typeof id === 'number') { showToast('Cannot delete fallback product. Seed to Firebase first.', 'error'); return; }
    if (!window.confirm('Delete this product?')) return;
    await deleteDoc(doc(db,'products',id));
    showToast('Product deleted');
    if (editId === id) { setEditId(null); setForm(EMPTY); setDesc(EMPTY_DESC); }
  };

  const filtered = filter === 'all' ? products
    : filter === 'none' ? products.filter(p => !p.section || p.section === 'none' || p.section === '')
    : products.filter(p => p.section === filter);

  const salePercent = form.saleEnabled && form.price && form.salePrice
    ? Math.round((1 - Number(form.salePrice) / Number(form.price)) * 100) : 0;

  const currentSubCats = getSubCats(form.category);
  const sizeConfig = form.category ? getSizeConfig(form.category) : null;

  // Form tabs — removed 'sizes' material section, kept size stock
  const FORM_TABS = [
    { key:'basic',   label:'Basic Info',        icon: Package  },
    { key:'subcats', label:'Sub-category',       icon: FolderTree },
    { key:'sizes',   label:'Sizes & Stock',      icon: Ruler    },
    { key:'media',   label:'Media',              icon: ImgIcon  },
    { key:'sale',    label:'Sale Pricing',        icon: Tag      },
    { key:'content', label:'Product Content',    icon: FileText },
  ];

  return (
    <div className="product-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">Add, edit and manage your jewellery. Descriptions auto-fill based on category.</p>
        </div>
        <div style={{ display:'flex', gap:10, alignItems:'center' }}>
          <button className="btn-secondary" onClick={seedDefaultProducts} disabled={loading} style={{ fontSize:11, padding:'8px 14px' }}>
            <Plus size={12} /> Seed Defaults
          </button>
          <span className="product-count">{products.length} products</span>
        </div>
      </div>

      <div className="card product-form">
        <h3 className="form-title">
          {editId ? <><Pencil size={17}/> Edit Product</> : <><Plus size={17}/> Add New Product</>}
        </h3>

        <div className="form-tabs">
          {FORM_TABS.map(({ key, label, icon: Icon }) => (
            <button key={key} type="button" className={`form-tab-btn ${activeFormTab===key?'active':''}`} onClick={() => setActiveFormTab(key)}>
              <Icon size={13}/> {label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {activeFormTab === 'basic' && (
            <div className="form-section">
              <div className="form-grid">
                <div className="form-field">
                  <label className="field-label">Product Name *</label>
                  <input className="field-input" placeholder="e.g. Diamond Solitaire Ring"
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="field-label">Price (₹) *</label>
                  <input className="field-input" type="number" placeholder="e.g. 129999"
                    value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="field-label">Quantity / Stock</label>
                  <input className="field-input" type="number" placeholder="e.g. 50"
                    value={form.quantity} onChange={e => setForm({...form, quantity: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="field-label">Category *</label>
                  <select className="field-input" value={form.category} onChange={e => handleCategoryChange(e.target.value)}>
                    <option value="">— Select category —</option>
                    {catOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>
                <div className="form-field" style={{ gridColumn:'1/-1' }}>
                  <label className="field-label">Show in Homepage Section</label>
                  <div className="section-checkboxes">
                    <label className="section-check">
                      <input type="radio" name="section" value="none" checked={form.section === 'none' || !form.section} onChange={() => setForm({...form, section:'none'})} />
                      <span>None (category only)</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="bestSellers" checked={form.section === 'bestSellers'} onChange={() => setForm({...form, section:'bestSellers'})} />
                      <span>⭐ Best Sellers</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="newArrivals" checked={form.section === 'newArrivals'} onChange={() => setForm({...form, section:'newArrivals'})} />
                      <span>✨ New Arrivals</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeFormTab === 'subcats' && (
            <div className="form-section">
              {!form.category ? <p style={{ color:'#aaa', fontStyle:'italic', fontSize:13 }}>Please select a category first.</p> : (
                <>
                  {currentSubCats.length > 0 && (
                    <div className="form-field" style={{ marginBottom:16 }}>
                      <label className="field-label">Quick Select</label>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:6 }}>
                        {currentSubCats.map(sub => (
                          <button key={sub} type="button"
                            style={{ padding:'6px 14px', borderRadius:'100px', border: form.subCategory===sub ? '1.5px solid #1a1a1a' : '1px solid #ddd', background: form.subCategory===sub ? '#1a1a1a' : 'transparent', color: form.subCategory===sub ? '#fff' : '#555', fontFamily:'Jost,sans-serif', fontSize:12, cursor:'pointer' }}
                            onClick={() => setForm(f => ({ ...f, subCategory: f.subCategory===sub ? '' : sub }))}>{sub}</button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="form-field">
                    <label className="field-label">Or enter Custom Sub-category</label>
                    <input className="field-input" placeholder="e.g. Rose Gold, Kundan..."
                      value={form.subCategory} onChange={e => setForm({ ...form, subCategory: e.target.value })} />
                  </div>
                </>
              )}
            </div>
          )}

          {activeFormTab === 'sizes' && (
            <div className="form-section">
              {!form.category ? <p style={{ color:'#aaa', fontStyle:'italic', fontSize:13 }}>Please select a category first.</p> : (
                <>
                  <label className="field-label" style={{ marginBottom:12, display:'block' }}>Standard Sizes — Click to Toggle Stock</label>
                  <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:24 }}>
                    {sizeConfig.sizes.map(size => {
                      const isOut = form.sizeStock[size] === false;
                      return (
                        <button key={size} type="button" onClick={() => toggleSizeStock(size)} style={{ padding:'10px 18px', border: isOut ? '1.5px solid #e74c3c' : '1.5px solid #2d6a4f', background: isOut ? '#fff5f5' : '#f0fdf4', color: isOut ? '#e74c3c' : '#2d6a4f', borderRadius:100, fontFamily:'Jost,sans-serif', fontSize:13, fontWeight:500, cursor:'pointer', display:'flex', alignItems:'center', gap:6, textDecoration: isOut ? 'line-through' : 'none' }}>
                          {isOut ? '✕' : <Check size={13} />} {size}
                        </button>
                      );
                    })}
                  </div>
                  <label className="field-label" style={{ marginBottom:12, display:'block' }}>Add Custom Sizes</label>
                  <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                    <input className="field-input" placeholder='e.g. 13, XXL' value={newCustomSize}
                      onChange={e => setNewCustomSize(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomSize(); } }}
                      style={{ flex:1 }} />
                    <button type="button" className="btn-primary" style={{ padding:'10px 20px' }} onClick={addCustomSize}><Plus size={14} /> Add</button>
                  </div>
                  {form.customSizes.length > 0 && (
                    <div style={{ display:'flex', flexWrap:'wrap', gap:10 }}>
                      {form.customSizes.map(size => (
                        <div key={size} style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', border:'1.5px solid #2d6a4f', background:'#f0fdf4', borderRadius:100 }}>
                          <span style={{ fontSize:13, color:'#2d6a4f' }}>{size}</span>
                          <button type="button" onClick={() => removeCustomSize(size)} style={{ background:'none', border:'none', color:'#999', cursor:'pointer', padding:0 }}><X size={13} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {activeFormTab === 'media' && (
            <div className="form-section">
              <p className="form-hint" style={{ marginBottom:16 }}>
                Upload up to 5 photos at once. First photo is the main image. You can crop each one or use the original.
              </p>

              {/* Multi-image dropzone — replaces individual slots */}
              <ImageDropzone
                value={form.images}
                onChange={imgs => setForm(f => ({ ...f, images: imgs }))}
                folder="aurelia-products"
                aspect={1}
                multi={true}
                maxFiles={5}
                label="Product Photos (up to 5)"
              />

              <div className="form-field" style={{ marginTop:24 }}>
                <label className="field-label"><Video size={12}/> Product Video (Optional)</label>
                <input className="field-input" placeholder="Paste video URL..."
                  value={form.video} onChange={e => setForm({...form, video: e.target.value})} />
              </div>
            </div>
          )}

          {activeFormTab === 'sale' && (
            <div className="form-section">
              <div style={{ background:'#fff8f0', padding:'12px 16px', borderRadius:10, marginBottom:16, fontSize:12, color:'#856404' }}>
                💡 <strong>Tip:</strong> For category-wide sales, use the <strong>Sale Banner</strong> page instead.
              </div>
              <label className="section-check" style={{ marginBottom:20 }}>
                <input type="checkbox" checked={form.saleEnabled}
                  onChange={e => setForm({...form, saleEnabled: e.target.checked, salePrice: ''})} />
                <span style={{ fontWeight:500 }}>Enable Sale Price for this Product</span>
              </label>
              {form.saleEnabled && (
                <div className="form-grid">
                  <div className="form-field">
                    <label className="field-label">Original Price</label>
                    <input className="field-input" value={`₹${form.price || 0}`} readOnly style={{ background:'#f8f8f8', color:'#aaa' }} />
                  </div>
                  <div className="form-field">
                    <label className="field-label">Sale Price (₹) *</label>
                    <input className="field-input" type="number" value={form.salePrice}
                      onChange={e => setForm({...form, salePrice: e.target.value})} />
                  </div>
                </div>
              )}
              {salePercent > 0 && (
                <div style={{ background:'#fff0ee', border:'1px solid #fcd4cf', borderRadius:10, padding:'16px 20px', marginTop:16, display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:28, fontStyle:'italic', color:'#e74c3c' }}>₹{Number(form.salePrice).toLocaleString('en-IN')}</span>
                  <span style={{ fontFamily:'Cormorant Garamond,serif', fontSize:18, color:'#bbb', textDecoration:'line-through' }}>₹{Number(form.price).toLocaleString('en-IN')}</span>
                  <span style={{ background:'#e74c3c', color:'#fff', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:100 }}>-{salePercent}% OFF</span>
                </div>
              )}
            </div>
          )}

          {activeFormTab === 'content' && (
            <div className="form-section">
              <div className="form-field" style={{ marginBottom:16 }}>
                <label className="field-label">Details Tab</label>
                <textarea className="field-input" style={{ minHeight:100 }} placeholder="Materials, craftsmanship..."
                  value={desc.details} onChange={e => setDesc({ ...desc, details: e.target.value })} />
              </div>
              <div className="form-field" style={{ marginBottom:16 }}>
                <label className="field-label">Care Tab</label>
                <textarea className="field-input" style={{ minHeight:80 }} placeholder="How to clean, store..."
                  value={desc.care} onChange={e => setDesc({ ...desc, care: e.target.value })} />
              </div>
              <div className="form-field">
                <label className="field-label">Shipping Tab</label>
                <textarea className="field-input" style={{ minHeight:80 }} placeholder="Shipping times, returns..."
                  value={desc.shipping} onChange={e => setDesc({ ...desc, shipping: e.target.value })} />
              </div>
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
            </button>
            {editId
              ? <button className="btn-secondary" type="button" onClick={() => { setEditId(null); setForm(EMPTY); setDesc(EMPTY_DESC); }}>Cancel Edit</button>
              : <button className="btn-secondary" type="button" onClick={() => { setForm(EMPTY); setDesc(EMPTY_DESC); }}>Clear</button>
            }
          </div>
        </form>
      </div>

      <div className="products-list-section">
        <div className="list-header">
          <h3 className="section-heading">All Products</h3>
          <div className="filter-tabs">
            {[['all','All'],['bestSellers','Best Sellers'],['newArrivals','New Arrivals'],['none','No Section']].map(([key,label]) => (
              <button key={key} className={`filter-tab ${filter===key?'active':''}`} onClick={() => setFilter(key)}>{label}</button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state card"><Package size={44} strokeWidth={1} color="#ccc" /><p>No products here</p></div>
        ) : (
          <div className="product-queue">
            {filtered.map(p => {
              const hasDiscount = p.salePrice && p.salePrice < p.price;
              const pct = hasDiscount ? Math.round((1 - p.salePrice/p.price)*100) : 0;
              const sc = getSizeConfig(p.category);
              const allProductSizes = [...sc.sizes, ...(p.customSizes || [])];
              const outOfStockCount = allProductSizes.filter(s => p.sizeStock?.[s] === false).length;
              const isFirebaseProduct = typeof p.id === 'string';

              return (
                <div className={`product-queue-item card ${editId===p.id?'editing':''}`} key={p.id} style={{ flexDirection:'column', alignItems:'stretch' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:16, width:'100%' }}>
                    <div className="pq-image">
                      {p.image ? <img src={p.image} alt={p.name}/> : <span className="pq-placeholder">?</span>}
                      {p.images?.length > 1 && <span className="pq-img-count">+{p.images.length-1}</span>}
                    </div>
                    <div className="pq-info">
                      <p className="pq-name">
                        {p.name}
                        {!isFirebaseProduct && <span style={{ fontSize:9, color:'#999', background:'#f0f0f0', padding:'2px 6px', borderRadius:4, marginLeft:6 }}>LOCAL</span>}
                      </p>
                      <div className="pq-meta">
                        <span className="pq-category">{p.category||'—'}</span>
                        {p.subCategory && <span className="pq-category" style={{ background:'#e8f4f8', color:'#2d6a9f' }}>{p.subCategory}</span>}
                        {p.section === 'bestSellers' && <span className="pq-section bestSellers">Best Seller</span>}
                        {p.section === 'newArrivals' && <span className="pq-section newArrivals">New Arrival</span>}
                        {outOfStockCount > 0 && <span style={{ fontSize:11, padding:'2px 10px', borderRadius:100, background:'#fff0ee', color:'#e74c3c' }}>{outOfStockCount} size(s) OOS</span>}
                      </div>
                    </div>
                    <div className="pq-price-col">
                      {hasDiscount ? (
                        <><p className="pq-price sale-price">₹{(p.salePrice||0).toLocaleString('en-IN')}</p><p className="pq-orig">₹{(p.price||0).toLocaleString('en-IN')}</p><span className="pq-discount-badge">-{pct}%</span></>
                      ) : <p className="pq-price">₹{(p.price||0).toLocaleString('en-IN')}</p>}
                    </div>
                    <div className="pq-actions">
                      <button className="pq-edit" onClick={() => handleEdit(p)}><Pencil size={15}/></button>
                      <button className="pq-delete" onClick={() => handleDelete(p.id)}><Trash2 size={15}/></button>
                    </div>
                  </div>

                  {p.category && isFirebaseProduct && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f0ece6' }}>
                      <p style={{ fontSize:10, fontWeight:600, letterSpacing:'0.08em', color:'#aaa', marginBottom:8, textTransform:'uppercase' }}>Quick Stock Toggle ({sc.label}):</p>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                        {allProductSizes.map(size => {
                          const isOut = p.sizeStock?.[size] === false;
                          return (
                            <button key={size} onClick={() => quickToggleStock(p.id, size, isOut)} style={{ padding:'4px 10px', fontSize:11, border: isOut ? '1px solid #e74c3c' : '1px solid #2d6a4f', background: isOut ? '#fff5f5' : '#f0fdf4', color: isOut ? '#e74c3c' : '#2d6a4f', borderRadius:100, cursor:'pointer', fontFamily:'Jost,sans-serif', textDecoration: isOut ? 'line-through' : 'none' }}>
                              {size}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {p.category && !isFirebaseProduct && (
                    <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid #f0ece6', display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:11, color:'#999', fontStyle:'italic' }}>⚠️ Local product. Click Edit → Update to save to Firebase for full management.</span>
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