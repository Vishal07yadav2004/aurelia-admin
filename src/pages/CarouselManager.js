import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2, X } from 'lucide-react';
import ImageDropzone from '../components/ImageDropzone';
import './CarouselManager.css';

const DEFAULT_CAROUSELS = {
  carousel_1: [
    { src:'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=800&q=80', caption:'Timeless Elegance', sub:'Ethically sourced, handcrafted for the modern muse' },
    { src:'https://images.unsplash.com/photo-1588444650733-d0f65bc89f36?w=800&q=80', caption:'Artisan Crafted',   sub:'Every piece tells a story of mastery' },
    { src:'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=800&q=80', caption:'Pure Gold',          sub:'Refined luxury for the discerning few' },
    { src:'https://images.unsplash.com/photo-1630438993803-3e62feba5278?w=800&q=80', caption:'Fine Stones',      sub:'Rare gems, extraordinary beauty' },
  ],
  carousel_2: [
    { src:'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=800&q=80', caption:'The Bridal Edit',  sub:'Celebrate love with pieces crafted for your forever moment' },
    { src:'https://images.unsplash.com/photo-1583292650898-7d22cd27ca6f?w=800&q=80', caption:'Emerald Dreams',   sub:'Vintage-inspired, timelessly elegant' },
    { src:'https://images.unsplash.com/photo-1601121141461-9d6647bef0a1?w=800&q=80', caption:'Bridal Glow',      sub:'Shine on your most precious day' },
    { src:'https://images.unsplash.com/photo-1612366677601-5b9b0cb85f68?w=800&q=80', caption:'Forever Yours',    sub:'Heirlooms crafted to be cherished for generations' },
  ],
};

const EMPTY_SLIDE = { src:'', caption:'', sub:'' };

export default function CarouselManager() {
  const { showToast } = useContext(ToastContext);
  const [carousels, setCarousels] = useState(DEFAULT_CAROUSELS);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    const unsubs = Object.keys(DEFAULT_CAROUSELS).map(key =>
      onSnapshot(doc(db, 'site', key), snap => {
        if (snap.exists() && snap.data().slides?.length) {
          setCarousels(c => ({ ...c, [key]: snap.data().slides }));
        }
      }, () => {})
    );
    return () => unsubs.forEach(u => u());
  }, []);

  const saveCarousel = async (key, slides) => {
    setSaving(s => ({ ...s, [key]: true }));
    setCarousels(c => ({ ...c, [key]: slides }));
    await setDoc(doc(db, 'site', key), { slides });
    setSaving(s => ({ ...s, [key]: false }));
    showToast('Carousel updated — live on client! ✓');
  };

  const updateSlide = (key, idx, field, val) => {
    const updated = [...carousels[key]];
    updated[idx] = { ...updated[idx], [field]: val };
    setCarousels(c => ({ ...c, [key]: updated }));
  };

  const saveSlideField = async (key, idx, field, val) => {
    const updated = [...carousels[key]];
    updated[idx] = { ...updated[idx], [field]: val };
    await setDoc(doc(db, 'site', key), { slides: updated });
    showToast('Updated ✓');
  };

  const addSlide  = (key) => saveCarousel(key, [...carousels[key], { ...EMPTY_SLIDE }]);
  const removeSlide = (key, idx) => {
    if (carousels[key].length <= 2) { showToast('Keep at least 2 slides', 'error'); return; }
    saveCarousel(key, carousels[key].filter((_,i) => i !== idx));
  };

  const LABELS = { carousel_1: 'Carousel 1 — Row 1 Feature Panel', carousel_2: 'Carousel 2 — Row 2 Feature Panel' };

  return (
    <div className="carousel-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Carousel Images</h1>
          <p className="page-sub">Edit the slideshow images in the homepage feature panels. Changes are instant.</p>
        </div>
      </div>

      {Object.keys(DEFAULT_CAROUSELS).map(key => (
        <div key={key} className="card carousel-section">
          <div className="carousel-section-header">
            <h3 className="section-heading">{LABELS[key]}</h3>
            <button className="btn-primary" style={{fontSize:12,padding:'8px 16px'}} onClick={() => addSlide(key)}>
              <Plus size={13}/> Add Slide
            </button>
          </div>

          <div className="carousel-slides-grid">
            {carousels[key].map((slide, idx) => (
              <div className="carousel-slide-card card" key={idx}>
                <div className="carousel-slide-header">
                  <span className="slide-num">Slide {idx + 1}</span>
                  <button className="slide-remove-btn" onClick={() => removeSlide(key, idx)}><Trash2 size={13}/></button>
                </div>

                {/* Image with crop */}
                <ImageDropzone
                  value={slide.src}
                  onChange={url => saveCarousel(key, carousels[key].map((s,i) => i===idx ? {...s,src:url} : s))}
                  folder="aurelia-carousel"
                  aspect={2/3}  /* portrait aspect for carousel panels */
                />

                {/* Caption */}
                <div className="form-field" style={{marginTop:12}}>
                  <label className="field-label">Caption</label>
                  <input className="field-input" value={slide.caption}
                    onChange={e => updateSlide(key, idx, 'caption', e.target.value)}
                    onBlur={e => saveSlideField(key, idx, 'caption', e.target.value)}
                    placeholder="e.g. Timeless Elegance" />
                </div>
                <div className="form-field" style={{marginTop:10}}>
                  <label className="field-label">Sub-text</label>
                  <input className="field-input" value={slide.sub}
                    onChange={e => updateSlide(key, idx, 'sub', e.target.value)}
                    onBlur={e => saveSlideField(key, idx, 'sub', e.target.value)}
                    placeholder="Short description..." />
                </div>
                <p className="form-hint" style={{marginTop:6}}>Click outside field to auto-save text.</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}