import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp
} from 'firebase/firestore';
import { Trash2, Plus, Pencil, Package, X, Video, Image as ImgIcon, Tag } from 'lucide-react';
import { ToastContext } from '../App';
import ImageDropzone from '../components/ImageDropzone';
import './ProductManager.css';

const FALLBACK_CATS = ['rings','necklaces','earrings','bracelets','watches','anklets','charms','pendants'];
const EMPTY = { name:'', price:'', category:'', section:'none', images:[''], video:'', salePrice:'', saleEnabled:false };

export default function ProductManager() {
  const { showToast } = useContext(ToastContext);
  const [form, setForm]         = useState(EMPTY);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter]     = useState('all');
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(false);
  const [activeFormTab, setActiveFormTab] = useState('basic'); // basic | media | sale

  // Live products
  useEffect(() => {
    const q = query(collection(db,'products'), orderBy('createdAt','desc'));
    return onSnapshot(q, snap => setProducts(snap.docs.map(d => ({ id:d.id, ...d.data() }))));
  }, []);

  // Dynamic categories
  useEffect(() => {
    const allCats = { row1:[], row2:[] };
    const rebuild = () => setCategories([...allCats.row1,...allCats.row2]);
    const u1 = onSnapshot(doc(db,'site','categories_row1'), s => { if (s.exists()) { allCats.row1 = s.data().items?.map(c=>({id:c.id,label:c.label}))||[]; rebuild(); }});
    const u2 = onSnapshot(doc(db,'site','categories_row2'), s => { if (s.exists()) { allCats.row2 = s.data().items?.map(c=>({id:c.id,label:c.label}))||[]; rebuild(); }});
    return () => { u1(); u2(); };
  }, []);

  const catOptions = categories.length > 0 ? categories : FALLBACK_CATS.map(c => ({ id:c, label:c.charAt(0).toUpperCase()+c.slice(1) }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validImages = form.images.filter(i => i && i.trim());
    if (!form.name || !form.price || !form.category || validImages.length === 0) {
      showToast('Fill all fields, select category, and add at least one image', 'error'); return;
    }
    setLoading(true);
    try {
      const productData = {
        name:     form.name,
        price:    Number(form.price),
        category: form.category,
        section:  form.section === 'none' ? '' : form.section,
        images:   validImages,
        image:    validImages[0], // backward compat
        video:    form.video || '',
        ...(form.saleEnabled && form.salePrice ? { salePrice: Number(form.salePrice) } : { salePrice: null }),
      };
      if (editId) {
        await updateDoc(doc(db,'products',editId), productData);
        showToast('Product updated ✓');
        setEditId(null);
      } else {
        await addDoc(collection(db,'products'), { ...productData, createdAt: serverTimestamp() });
        showToast('Product added — live on client! 🚀');
      }
      setForm(EMPTY);
    } catch { showToast('Error saving product','error'); }
    setLoading(false);
  };

  const handleEdit = (p) => {
    setForm({
      name:        p.name,
      price:       String(p.price),
      category:    p.category || '',
      section:     p.section  || 'none',
      images:      p.images?.length ? p.images : [p.image||''],
      video:       p.video   || '',
      salePrice:   p.salePrice ? String(p.salePrice) : '',
      saleEnabled: Boolean(p.salePrice),
    });
    setEditId(p.id);
    setActiveFormTab('basic');
    window.scrollTo({ top:0, behavior:'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteDoc(doc(db,'products',id));
    showToast('Product deleted');
    if (editId === id) { setEditId(null); setForm(EMPTY); }
  };

  // Image management
  const addImageSlot   = () => setForm(f => ({ ...f, images: [...f.images, ''] }));
  const removeImageSlot = (i) => setForm(f => ({ ...f, images: f.images.filter((_,idx) => idx !== i) }));
  const updateImage    = (i, url) => setForm(f => { const imgs = [...f.images]; imgs[i] = url; return { ...f, images: imgs }; });

  const filtered = filter === 'all' ? products : filter === 'none' ? products.filter(p => !p.section || p.section === 'none' || p.section === '') : products.filter(p => p.section === filter);

  const salePercent = form.saleEnabled && form.price && form.salePrice
    ? Math.round((1 - Number(form.salePrice) / Number(form.price)) * 100)
    : 0;

  return (
    <div className="product-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-sub">Add, edit and manage your jewellery collection.</p>
        </div>
        <span className="product-count">{products.length} products</span>
      </div>

      {/* ── FORM ── */}
      <div className="card product-form">
        <h3 className="form-title">
          {editId ? <><Pencil size={17}/> Edit Product</> : <><Plus size={17}/> Add New Product</>}
        </h3>

        {/* Form tabs */}
        <div className="form-tabs">
          {[['basic','Basic Info'],['media','Media (Photos/Video)'],['sale','Sale Pricing']].map(([key,label]) => (
            <button key={key} type="button"
              className={`form-tab-btn ${activeFormTab===key?'active':''}`}
              onClick={() => setActiveFormTab(key)}>
              {key==='media' && <ImgIcon size={13}/>}
              {key==='sale'  && <Tag size={13}/>}
              {label}
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
                    value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="field-label">Price ($) *</label>
                  <input className="field-input" type="number" placeholder="e.g. 1299"
                    value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div className="form-field">
                  <label className="field-label">Category *</label>
                  <select className="field-input" value={form.category}
                    onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="">— Select category —</option>
                    {catOptions.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </div>

                {/* Section checkbox — FEATURE 7 */}
                <div className="form-field">
                  <label className="field-label">Show in Homepage Section</label>
                  <div className="section-checkboxes">
                    <label className="section-check">
                      <input type="radio" name="section" value="none"
                        checked={form.section === 'none' || !form.section}
                        onChange={() => setForm({...form, section:'none'})} />
                      <span>None (category only)</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="bestSellers"
                        checked={form.section === 'bestSellers'}
                        onChange={() => setForm({...form, section:'bestSellers'})} />
                      <span>⭐ Best Sellers carousel</span>
                    </label>
                    <label className="section-check">
                      <input type="radio" name="section" value="newArrivals"
                        checked={form.section === 'newArrivals'}
                        onChange={() => setForm({...form, section:'newArrivals'})} />
                      <span>✨ New Arrivals carousel</span>
                    </label>
                  </div>
                  <p className="form-hint">If None, product appears in Shop but not in homepage carousels.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── MEDIA ── */}
          {activeFormTab === 'media' && (
            <div className="form-section">
              <p className="form-hint" style={{marginBottom:16}}>
                Add up to 5 photos. First photo is the main product image. Video is optional.
              </p>

              {/* Images */}
              <label className="field-label" style={{marginBottom:12,display:'block'}}>
                Product Photos * (drag to reorder — first = main image)
              </label>
              <div className="media-grid">
                {form.images.map((img, i) => (
                  <div className="media-slot" key={i}>
                    <div className="media-slot-header">
                      <span className="media-slot-num">{i === 0 ? '⭐ Main' : `Photo ${i+1}`}</span>
                      {i > 0 && (
                        <button type="button" className="media-remove-btn" onClick={() => removeImageSlot(i)}>
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <ImageDropzone
                      value={img}
                      onChange={url => updateImage(i, url)}
                      folder="aurelia-products"
                      aspect={1}
                    />
                  </div>
                ))}
                {form.images.length < 5 && (
                  <button type="button" className="media-add-slot" onClick={addImageSlot}>
                    <ImgIcon size={20} color="#ccc" />
                    <span>Add Photo</span>
                  </button>
                )}
              </div>

              {/* Video */}
              <div className="form-field" style={{marginTop:24}}>
                <label className="field-label"><Video size={12} style={{verticalAlign:'middle',marginRight:4}}/>Product Video (Optional)</label>
                <input className="field-input" placeholder="Paste video URL (MP4, YouTube embed, etc.)"
                  value={form.video} onChange={e => setForm({...form, video: e.target.value})} />
                <p className="form-hint">Video appears as the last thumbnail on the product page. Client can play it inline.</p>
              </div>
            </div>
          )}

          {/* ── SALE ── */}
          {activeFormTab === 'sale' && (
            <div className="form-section">
              <label className="section-check" style={{marginBottom:20}}>
                <input type="checkbox" checked={form.saleEnabled}
                  onChange={e => setForm({...form, saleEnabled: e.target.checked, salePrice: ''})} />
                <span style={{fontWeight:500}}>Enable Sale Price for this product</span>
              </label>

              {form.saleEnabled && (
                <div className="sale-section">
                  <div className="form-grid">
                    <div className="form-field">
                      <label className="field-label">Original Price</label>
                      <input className="field-input" value={`$${form.price || 0}`} readOnly style={{background:'#f8f8f8',color:'#aaa'}} />
                    </div>
                    <div className="form-field">
                      <label className="field-label">Sale Price ($) *</label>
                      <input className="field-input" type="number" placeholder="e.g. 799"
                        value={form.salePrice} onChange={e => setForm({...form, salePrice: e.target.value})} />
                    </div>
                  </div>

                  {salePercent > 0 && (
                    <div className="sale-preview-box">
                      <div className="sale-preview-label">Preview on client site:</div>
                      <div className="sale-preview-prices">
                        <span className="sale-preview-new">${Number(form.salePrice).toLocaleString()}</span>
                        <span className="sale-preview-old">${Number(form.price).toLocaleString()}</span>
                        <span className="sale-preview-pct">-{salePercent}% OFF</span>
                      </div>
                    </div>
                  )}

                  {Number(form.salePrice) >= Number(form.price) && form.salePrice && (
                    <p style={{color:'#e74c3c', fontSize:12, marginTop:8}}>⚠️ Sale price must be less than original price.</p>
                  )}
                </div>
              )}

              {!form.saleEnabled && (
                <p style={{color:'#aaa', fontStyle:'italic', fontSize:13}}>Enable sale to set a discounted price. The discount % and strikethrough original price will show on the client site.</p>
              )}
            </div>
          )}

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
            </button>
            {editId
              ? <button className="btn-secondary" type="button" onClick={() => { setEditId(null); setForm(EMPTY); }}>Cancel Edit</button>
              : <button className="btn-secondary" type="button" onClick={() => setForm(EMPTY)}>Clear</button>
            }
          </div>
        </form>
      </div>

      {/* ── PRODUCT LIST ── */}
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
          <div className="empty-state card">
            <Package size={44} strokeWidth={1} color="#ccc" />
            <p>No products here</p>
            <span>Add products using the form above</span>
          </div>
        ) : (
          <div className="product-queue">
            {filtered.map(p => {
              const hasDiscount = p.salePrice && p.salePrice < p.price;
              const pct = hasDiscount ? Math.round((1 - p.salePrice/p.price)*100) : 0;
              return (
                <div className={`product-queue-item card ${editId===p.id?'editing':''}`} key={p.id}>
                  <div className="pq-image">
                    {p.image ? <img src={p.image} alt={p.name}/> : <span className="pq-placeholder">?</span>}
                    {p.images?.length > 1 && <span className="pq-img-count">+{p.images.length-1}</span>}
                    {p.video && <span className="pq-has-video">▶</span>}
                  </div>
                  <div className="pq-info">
                    <p className="pq-name">{p.name}</p>
                    <div className="pq-meta">
                      <span className="pq-category">{p.category||'—'}</span>
                      {p.section === 'bestSellers' && <span className="pq-section bestSellers">Best Seller</span>}
                      {p.section === 'newArrivals' && <span className="pq-section newArrivals">New Arrival</span>}
                      {(!p.section || p.section === 'none' || p.section === '') && <span className="pq-section none">No Section</span>}
                    </div>
                  </div>
                  <div className="pq-price-col">
                    {hasDiscount ? (
                      <>
                        <p className="pq-price sale-price">${(p.salePrice||0).toLocaleString()}</p>
                        <p className="pq-orig">${(p.price||0).toLocaleString()}</p>
                        <span className="pq-discount-badge">-{pct}%</span>
                      </>
                    ) : (
                      <p className="pq-price">${(p.price||0).toLocaleString()}</p>
                    )}
                  </div>
                  <div className="pq-actions">
                    <button className="pq-edit" title="Edit" onClick={() => handleEdit(p)}><Pencil size={15}/></button>
                    <button className="pq-delete" title="Delete" onClick={() => handleDelete(p.id)}><Trash2 size={15}/></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}