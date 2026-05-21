import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2, X, Eye } from 'lucide-react';
import ImageDropzone from '../components/ImageDropzone';
import './HeroManager.css';

const DEFAULT_HERO = {
  images: [
    'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=1200&q=90',
    'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=1200&q=90',
    'https://images.unsplash.com/photo-1519741347686-c1e0aadf4611?w=1200&q=90',
  ],
  eyebrow: 'NEW SEASON COLLECTION',
  headingLine1: 'Where every',
  headingLine2: 'gem holds',
  headingLine3: 'a story.',
  italicWord: 'gem',
  subtext: 'Handcrafted for the moments that take your breath away. Ethically sourced, masterfully designed, forever yours.',
  btnPrimaryText: 'SHOP COLLECTION',
  btnGhostText: 'THE GIFT GUIDE',
  sideLabel: 'KANYAMAA COLLECTIONS FINE JEWELLERY — EST. 1994',
  stats: [
    { value: '30+', label: 'Years of Craft' },
    { value: '14k', label: 'Happy Clients' },
    { value: '100%', label: 'Ethically Sourced' },
  ],
};

export default function HeroManager() {
  const { showToast } = useContext(ToastContext);
  const [hero, setHero] = useState(DEFAULT_HERO);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'site', 'hero_section'), snap => {
      if (snap.exists()) {
        setHero({ ...DEFAULT_HERO, ...snap.data() });
      }
    }, () => {});
    return () => unsub();
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setDoc(doc(db, 'site', 'hero_section'), hero);
      showToast('Hero section updated — live on client! ✓');
    } catch (err) {
      showToast('Error saving hero section', 'error');
    }
    setSaving(false);
  };

  const updateImage = (idx, url) => {
    const imgs = [...hero.images];
    imgs[idx] = url;
    setHero({ ...hero, images: imgs });
  };

  const addImage = () => {
    if (hero.images.length >= 6) {
      showToast('Maximum 6 images allowed', 'error');
      return;
    }
    setHero({ ...hero, images: [...hero.images, ''] });
  };

  const removeImage = (idx) => {
    if (hero.images.length <= 1) {
      showToast('Keep at least 1 image', 'error');
      return;
    }
    setHero({ ...hero, images: hero.images.filter((_, i) => i !== idx) });
  };

  const updateStat = (idx, field, value) => {
    const stats = [...hero.stats];
    stats[idx] = { ...stats[idx], [field]: value };
    setHero({ ...hero, stats });
  };

  const addStat = () => {
    if (hero.stats.length >= 5) {
      showToast('Maximum 5 stats', 'error');
      return;
    }
    setHero({ ...hero, stats: [...hero.stats, { value: '', label: '' }] });
  };

  const removeStat = (idx) => {
    setHero({ ...hero, stats: hero.stats.filter((_, i) => i !== idx) });
  };

  return (
    <div className="hero-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Hero Section</h1>
          <p className="page-sub">Edit the homepage hero banner — images, text, buttons, and stats. Changes are live instantly.</p>
        </div>
        <button className="btn-secondary" onClick={() => setShowPreview(p => !p)}>
          <Eye size={14} /> {showPreview ? 'Hide' : 'Show'} Preview
        </button>
      </div>

      {/* LIVE PREVIEW */}
      {showPreview && (
        <div className="card" style={{ marginBottom: 24 }}>
          <p className="field-label" style={{ marginBottom: 12 }}>LIVE PREVIEW</p>
          <div className="hero-preview-box">
            <p className="hero-preview-eyebrow">{hero.eyebrow}</p>
            <h2 className="hero-preview-heading">
              {hero.headingLine1}<br />
              <em>{hero.italicWord}</em> {hero.headingLine2.replace(hero.italicWord, '').trim()}<br />
              {hero.headingLine3}
            </h2>
            <p className="hero-preview-sub">{hero.subtext}</p>
            {hero.stats.length > 0 && (
              <div className="hero-preview-stats">
                {hero.stats.map((s, i) => (
                  <div className="hero-preview-stat-item" key={i}>
                    <p className="hero-preview-stat-value">{s.value}</p>
                    <p className="hero-preview-stat-label">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* BACKGROUND IMAGES */}
      <div className="card hero-section-card">
        <h3 className="form-title">Background Slideshow Images</h3>
        <p className="form-hint" style={{ marginBottom: 16 }}>
          Add up to 6 images. They rotate automatically every 5 seconds on the client site.
        </p>

        <div className="hero-images-grid">
          {hero.images.map((img, idx) => (
            <div className="hero-image-slot" key={idx}>
              <div className="hero-image-slot-header">
                <span className="hero-image-num">Image {idx + 1}</span>
                {hero.images.length > 1 && (
                  <button className="hero-image-remove-btn" onClick={() => removeImage(idx)}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
              <ImageDropzone
                value={img}
                onChange={url => updateImage(idx, url)}
                folder="kanyamaa-hero"
                aspect={16 / 9}
              />
            </div>
          ))}
        </div>

        <button className="btn-secondary" onClick={addImage} style={{ marginTop: 8 }}>
          <Plus size={13} /> Add Image
        </button>
      </div>

      {/* TEXT CONTENT */}
      <div className="card hero-section-card">
        <h3 className="form-title">Hero Text Content</h3>

        <div className="hero-content-grid">
          <div className="form-field">
            <label className="field-label">Eyebrow Text</label>
            <input className="field-input" value={hero.eyebrow}
              onChange={e => setHero({ ...hero, eyebrow: e.target.value })}
              placeholder="e.g. NEW SEASON COLLECTION" />
            <p className="form-hint">Shown above the main heading</p>
          </div>

          <div className="form-field">
            <label className="field-label">Italic Accent Word</label>
            <input className="field-input" value={hero.italicWord}
              onChange={e => setHero({ ...hero, italicWord: e.target.value })}
              placeholder="e.g. gem" />
            <p className="form-hint">This word appears in italic gold on line 2</p>
          </div>

          <div className="form-field">
            <label className="field-label">Heading Line 1</label>
            <input className="field-input" value={hero.headingLine1}
              onChange={e => setHero({ ...hero, headingLine1: e.target.value })}
              placeholder="Where every" />
          </div>

          <div className="form-field">
            <label className="field-label">Heading Line 2</label>
            <input className="field-input" value={hero.headingLine2}
              onChange={e => setHero({ ...hero, headingLine2: e.target.value })}
              placeholder="gem holds" />
          </div>

          <div className="form-field">
            <label className="field-label">Heading Line 3</label>
            <input className="field-input" value={hero.headingLine3}
              onChange={e => setHero({ ...hero, headingLine3: e.target.value })}
              placeholder="a story." />
          </div>

          <div className="form-field">
            <label className="field-label">Side Label</label>
            <input className="field-input" value={hero.sideLabel}
              onChange={e => setHero({ ...hero, sideLabel: e.target.value })}
              placeholder="KANYAMAA COLLECTIONS..." />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: 18 }}>
          <label className="field-label">Subtext / Description</label>
          <textarea className="field-input" value={hero.subtext}
            onChange={e => setHero({ ...hero, subtext: e.target.value })}
            placeholder="Handcrafted for the moments..."
            style={{ minHeight: 80 }} />
        </div>

        <div className="hero-content-grid" style={{ marginTop: 18 }}>
          <div className="form-field">
            <label className="field-label">Primary Button Text</label>
            <input className="field-input" value={hero.btnPrimaryText}
              onChange={e => setHero({ ...hero, btnPrimaryText: e.target.value })}
              placeholder="SHOP COLLECTION" />
          </div>

          <div className="form-field">
            <label className="field-label">Ghost Button Text</label>
            <input className="field-input" value={hero.btnGhostText}
              onChange={e => setHero({ ...hero, btnGhostText: e.target.value })}
              placeholder="THE GIFT GUIDE" />
          </div>
        </div>
      </div>

      {/* STATS */}
      <div className="card hero-section-card">
        <h3 className="form-title">Stats Card</h3>
        <p className="form-hint" style={{ marginBottom: 16 }}>
          The floating stats card shown at the bottom-right of the hero section.
        </p>

        {hero.stats.map((stat, idx) => (
          <div className="hero-stat-row" key={idx}>
            <div className="form-field" style={{ flex: 0.6, marginBottom: 0 }}>
              <label className="field-label" style={{ fontSize: 10 }}>Value</label>
              <input className="field-input" value={stat.value}
                onChange={e => updateStat(idx, 'value', e.target.value)}
                placeholder="e.g. 30+" />
            </div>
            <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
              <label className="field-label" style={{ fontSize: 10 }}>Label</label>
              <input className="field-input" value={stat.label}
                onChange={e => updateStat(idx, 'label', e.target.value)}
                placeholder="e.g. Years of Craft" />
            </div>
            <button className="hero-stat-remove" onClick={() => removeStat(idx)}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        <button className="btn-secondary" onClick={addStat} style={{ marginTop: 8 }}>
          <Plus size={13} /> Add Stat
        </button>
      </div>

      {/* SAVE */}
      <div style={{ display: 'flex', gap: 12 }}>
        <button className="btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save Hero Section'}
        </button>
        <button className="btn-secondary" onClick={() => setHero(DEFAULT_HERO)}>
          Reset to Defaults
        </button>
      </div>
    </div>
  );
}