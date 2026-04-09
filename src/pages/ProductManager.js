import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  onSnapshot, orderBy, query, serverTimestamp
} from 'firebase/firestore';
import { Trash2, Plus, Pencil, Package } from 'lucide-react';
import { ToastContext } from '../App';
import ImageDropzone from '../components/ImageDropzone';
import './ProductManager.css';

const FALLBACK_CATS = ['rings','necklaces','earrings','bracelets','watches','anklets','charms','pendants'];
const SECTIONS = [
  { value: 'bestSellers', label: 'Best Sellers' },
  { value: 'newArrivals', label: 'New Arrivals' },
];
const EMPTY = { name: '', price: '', category: '', section: 'bestSellers', image: '' };

export default function ProductManager() {
  const { showToast } = useContext(ToastContext);
  const [form, setForm]         = useState(EMPTY);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filter, setFilter]     = useState('all');
  const [editId, setEditId]     = useState(null);
  const [loading, setLoading]   = useState(false);

  // ── Real-time products ──
  useEffect(() => {
    const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, snap => {
      setProducts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, () => {});
    return () => unsub();
  }, []);

  // ── Dynamic categories from Firestore ──
  useEffect(() => {
    const allCats = { row1: [], row2: [] };
    const u1 = onSnapshot(doc(db, 'site', 'categories_row1'), s => {
      if (s.exists() && s.data().items) {
        allCats.row1 = s.data().items.map(c => ({ id: c.id, label: c.label }));
        setCategories([...allCats.row1, ...allCats.row2]);
      }
    });
    const u2 = onSnapshot(doc(db, 'site', 'categories_row2'), s => {
      if (s.exists() && s.data().items) {
        allCats.row2 = s.data().items.map(c => ({ id: c.id, label: c.label }));
        setCategories([...allCats.row1, ...allCats.row2]);
      }
    });
    return () => { u1(); u2(); };
  }, []);

  // ── Submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.price || !form.image || !form.category) {
      showToast('Fill all fields and select a category', 'error');
      return;
    }
    setLoading(true);
    try {
      const productData = {
        name:     form.name,
        price:    Number(form.price),
        category: form.category,
        section:  form.section,
        image:    form.image,
      };
      if (editId) {
        await updateDoc(doc(db, 'products', editId), productData);
        showToast('Product updated ✓');
        setEditId(null);
      } else {
        await addDoc(collection(db, 'products'), {
          ...productData,
          createdAt: serverTimestamp(),
        });
        showToast('Product added — live on client! 🚀');
      }
      setForm(EMPTY);
    } catch {
      showToast('Error saving product', 'error');
    }
    setLoading(false);
  };

  const handleEdit = (product) => {
    setForm({
      name:     product.name,
      price:    String(product.price),
      category: product.category || '',
      section:  product.section  || 'bestSellers',
      image:    product.image    || '',
    });
    setEditId(product.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await deleteDoc(doc(db, 'products', id));
    showToast('Product deleted');
    if (editId === id) { setEditId(null); setForm(EMPTY); }
  };

  const cancelEdit = () => { setEditId(null); setForm(EMPTY); };

  const filtered = filter === 'all' ? products : products.filter(p => p.section === filter);

  const catOptions = categories.length > 0
    ? categories
    : FALLBACK_CATS.map(c => ({ id: c, label: c.charAt(0).toUpperCase() + c.slice(1) }));

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
          {editId ? <><Pencil size={17} /> Edit Product</> : <><Plus size={17} /> Add New Product</>}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-field">
              <label className="field-label">Product Name</label>
              <input className="field-input" placeholder="e.g. Diamond Solitaire Ring"
                value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="field-label">Price ($)</label>
              <input className="field-input" type="number" placeholder="e.g. 1299"
                value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
            </div>
            <div className="form-field">
              <label className="field-label">Category</label>
              <select className="field-input" value={form.category}
                onChange={e => setForm({...form, category: e.target.value})}>
                <option value="">— Select category —</option>
                {catOptions.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label className="field-label">Section</label>
              <select className="field-input" value={form.section}
                onChange={e => setForm({...form, section: e.target.value})}>
                {SECTIONS.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* ── DRAG & DROP IMAGE ── */}
          <div className="image-section">
            <ImageDropzone
              label="Product Image"
              value={form.image}
              onChange={url => setForm({ ...form, image: url })}
              folder="aurelia-products"
            />
          </div>

          <div className="form-actions">
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Saving...' : editId ? 'Update Product' : 'Add Product'}
            </button>
            {editId
              ? <button className="btn-secondary" type="button" onClick={cancelEdit}>Cancel Edit</button>
              : <button className="btn-secondary" type="button" onClick={() => setForm(EMPTY)}>Clear</button>
            }
          </div>
        </form>
      </div>

      {/* ── PRODUCT QUEUE ── */}
      <div className="products-list-section">
        <div className="list-header">
          <h3 className="section-heading">All Products</h3>
          <div className="filter-tabs">
            {[
              { key:'all',         label:'All'         },
              { key:'bestSellers', label:'Best Sellers' },
              { key:'newArrivals', label:'New Arrivals' },
            ].map(f => (
              <button key={f.key}
                className={`filter-tab ${filter === f.key ? 'active' : ''}`}
                onClick={() => setFilter(f.key)}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state card">
            <Package size={44} strokeWidth={1} color="#ccc" />
            <p>No products yet</p>
            <span>Products you add will appear here as a live queue</span>
          </div>
        ) : (
          <div className="product-queue">
            {filtered.map(p => (
              <div className={`product-queue-item card ${editId === p.id ? 'editing' : ''}`} key={p.id}>
                <div className="pq-image">
                  {p.image ? <img src={p.image} alt={p.name} /> : <span className="pq-placeholder">?</span>}
                </div>
                <div className="pq-info">
                  <p className="pq-name">{p.name}</p>
                  <div className="pq-meta">
                    <span className="pq-category">{p.category || '—'}</span>
                    <span className={`pq-section ${p.section || ''}`}>
                      {p.section === 'bestSellers' ? 'Best Seller' : p.section === 'newArrivals' ? 'New Arrival' : '—'}
                    </span>
                  </div>
                </div>
                <p className="pq-price">${(p.price || 0).toLocaleString()}</p>
                <div className="pq-actions">
                  <button className="pq-edit" title="Edit" onClick={() => handleEdit(p)}>
                    <Pencil size={15} />
                  </button>
                  <button className="pq-delete" title="Delete" onClick={() => handleDelete(p.id)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}