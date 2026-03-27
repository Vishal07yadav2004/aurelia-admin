import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Upload, Trash2, Plus, X } from 'lucide-react';
import './CategoryManager.css';

const DEFAULT_ROWS = {
  categories_row1: [
    { id:'rings',     label:'Rings',     image:'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&q=80' },
    { id:'necklaces', label:'Necklaces', image:'https://images.unsplash.com/photo-1599459183200-59c7687a0c70?w=600&q=80' },
    { id:'earrings',  label:'Earrings',  image:'https://images.unsplash.com/photo-1573408301185-9519f94815b9?w=600&q=80' },
    { id:'bracelets', label:'Bracelets', image:'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600&q=80' },
  ],
  categories_row2: [
    { id:'watches',  label:'Watches',  image:'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=600&q=80' },
    { id:'anklets',  label:'Anklets',  image:'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80' },
    { id:'charms',   label:'Charms',   image:'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=600&q=80' },
    { id:'pendants', label:'Pendants', image:'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&q=80' },
  ],
};

const EMPTY_NEW = { label: '', image: '', targetRow: 'categories_row1' };

export default function CategoryManager() {
  const { showToast } = useContext(ToastContext);
  const [rows, setRows]       = useState(DEFAULT_ROWS);
  const [showAdd, setShowAdd] = useState(false);
  const [newCat, setNewCat]   = useState(EMPTY_NEW);

  useEffect(() => {
    const unsubs = [];
    Object.keys(DEFAULT_ROWS).forEach(docId => {
      unsubs.push(
        onSnapshot(doc(db, 'site', docId), snap => {
          if (snap.exists() && snap.data().items) {
            setRows(r => ({ ...r, [docId]: snap.data().items }));
          }
        })
      );
    });
    return () => unsubs.forEach(u => u());
  }, []);

  // ── Save helper ──
  const saveRow = async (docId, items) => {
    setRows(r => ({ ...r, [docId]: items }));
    await setDoc(doc(db, 'site', docId), { items });
  };

  // ── ADD ──
  const handleAdd = async () => {
    if (!newCat.label.trim()) {
      showToast('Enter a category name', 'error');
      return;
    }

    const id = newCat.label.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const allItems = [...(rows.categories_row1 || []), ...(rows.categories_row2 || [])];
    if (allItems.find(c => c.id === id)) {
      showToast('A category with this ID already exists', 'error');
      return;
    }

    const newItem = {
      id,
      label: newCat.label.trim(),
      image: newCat.image || 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
    };

    const targetItems = [...(rows[newCat.targetRow] || []), newItem];
    await saveRow(newCat.targetRow, targetItems);

    setNewCat(EMPTY_NEW);
    setShowAdd(false);
    showToast('Category added — live on client! 🚀');
  };

  // ── UPDATE LABEL ──
  const updateLabel = async (docId, idx, newLabel) => {
    if (!newLabel.trim()) return;
    const updated = [...rows[docId]];
    updated[idx] = { ...updated[idx], label: newLabel.trim() };
    await saveRow(docId, updated);
    showToast('Label updated ✓');
  };

  // ── UPDATE IMAGE ──
  const updateImage = async (docId, idx, newUrl) => {
    if (!newUrl) return;
    const updated = [...rows[docId]];
    updated[idx] = { ...updated[idx], image: newUrl };
    await saveRow(docId, updated);
    showToast('Image updated ✓');
  };

  // ── DELETE ──
  const deleteCategory = async (docId, idx) => {
    const cat = rows[docId][idx];
    if (!window.confirm(`Delete "${cat.label}"?`)) return;
    const updated = rows[docId].filter((_, i) => i !== idx);
    await saveRow(docId, updated);
    showToast('Category removed');
  };

  // ── CLOUDINARY ──
  const openCloudinary = (callback) => {
    if (!window.cloudinary) { showToast('Cloudinary widget not loaded', 'error'); return; }
     const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
     const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    window.cloudinary.openUploadWidget(
      {
        cloudName:    cloudName,   
        uploadPreset: uploadPreset,       
        sources: ['local', 'url', 'camera'],
        multiple: false,
        folder: 'aurelia-categories',
      },
      (error, result) => {
        if (!error && result?.event === 'success') callback(result.info.secure_url);
      }
    );
  };

  return (
    <div className="cat-manager">

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-sub">Add, rename, or remove categories. Changes are live instantly.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? <><X size={15}/> Cancel</> : <><Plus size={15}/> Add Category</>}
        </button>
      </div>

      {/* ── ADD FORM ── */}
      {showAdd && (
        <div className="card cat-add-card">
          <h3 className="form-title"><Plus size={17}/> New Category</h3>
          <div className="cat-add-layout">
            <div className="cat-add-preview">
              {newCat.image
                ? <img src={newCat.image} alt="Preview"/>
                : <div className="cat-add-placeholder"><Upload size={28} color="#ccc"/><span>No image</span></div>
              }
            </div>
            <div className="cat-add-fields">
              <div className="form-field">
                <label className="field-label">Category Name</label>
                <input className="field-input" placeholder="e.g. Bangles"
                  value={newCat.label} onChange={e => setNewCat({...newCat, label: e.target.value})}/>
                {newCat.label && (
                  <span className="cat-id-hint">
                    ID: {newCat.label.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'')}
                  </span>
                )}
              </div>
              <div className="form-field">
                <label className="field-label">Add to Row</label>
                <select className="field-input" value={newCat.targetRow}
                  onChange={e => setNewCat({...newCat, targetRow: e.target.value})}>
                  <option value="categories_row1">Row 1 — Main</option>
                  <option value="categories_row2">Row 2 — More</option>
                </select>
              </div>
              <div className="form-field">
                <label className="field-label">Image</label>
                <div className="cat-image-options">
                  <button type="button" className="upload-cloudinary-btn"
                    onClick={() => openCloudinary(url => setNewCat({...newCat, image: url}))}>
                    <Upload size={14}/> Upload
                  </button>
                  <input className="field-input" placeholder="or paste image URL"
                    value={newCat.image} onChange={e => setNewCat({...newCat, image: e.target.value})}/>
                </div>
              </div>
              <button className="btn-primary" type="button" onClick={handleAdd}>Add Category</button>
            </div>
          </div>
        </div>
      )}

      <p className="cat-note">
        💡 First 4 per row show on the homepage grid. All categories appear as Shop page filters. 
        The <strong>ID</strong> is permanent — it links products to this category. 
        You can freely rename the <strong>label</strong>.
      </p>

      {/* ── ROWS ── */}
      {[
        { key: 'categories_row1', title: 'Row 1 — Main Categories' },
        { key: 'categories_row2', title: 'Row 2 — More Categories' },
      ].map(({ key, title }) => (
        <div key={key} className="cat-section">
          <h3 className="section-heading">
            {title} <span className="cat-count">({(rows[key]||[]).length})</span>
          </h3>
          <div className="cat-tiles">
            {(rows[key] || []).map((cat, idx) => (
              <div className="cat-tile card" key={`${cat.id}-${idx}`}>

                {/* Image */}
                <div className="cat-tile-img">
                  <img src={cat.image} alt={cat.label}/>
                  <button className="cat-upload-btn"
                    onClick={() => openCloudinary(url => updateImage(key, idx, url))}>
                    <Upload size={13}/> Upload
                  </button>
                </div>

                {/* Editable label */}
                <input
                  className="cat-label-input"
                  defaultValue={cat.label}
                  key={`label-${cat.id}-${cat.label}`}
                  onBlur={e => {
                    if (e.target.value.trim() && e.target.value !== cat.label) {
                      updateLabel(key, idx, e.target.value);
                    }
                  }}
                  onKeyDown={e => { if (e.key === 'Enter') e.target.blur(); }}
                />

                {/* ID badge */}
                <span className="cat-id-badge">id: {cat.id}</span>

                {/* Image URL */}
                <input
                  className="field-input cat-url-input"
                  placeholder="Image URL"
                  defaultValue={cat.image}
                  key={`img-${cat.id}-${cat.image}`}
                  onBlur={e => {
                    if (e.target.value && e.target.value !== cat.image) {
                      updateImage(key, idx, e.target.value);
                    }
                  }}
                />

                {/* Delete */}
                <button className="cat-delete-btn" onClick={() => deleteCategory(key, idx)}>
                  <Trash2 size={13}/> Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}