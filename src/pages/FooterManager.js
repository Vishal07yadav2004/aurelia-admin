import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Plus, Trash2 } from 'lucide-react';
import './FooterManager.css';

const DEFAULT_SOCIALS = [
  { label:'INSTA',  url:'#' },
  { label:'PIN',    url:'#' },
  { label:'TIKTOK', url:'#' },
];

const PRESETS = [
  { label:'INSTAGRAM', placeholder:'https://instagram.com/yourpage' },
  { label:'FACEBOOK',  placeholder:'https://facebook.com/yourpage' },
  { label:'YOUTUBE',   placeholder:'https://youtube.com/@yourchannel' },
  { label:'TIKTOK',    placeholder:'https://tiktok.com/@yourhandle' },
  { label:'PINTEREST', placeholder:'https://pinterest.com/yourpage' },
  { label:'TWITTER',   placeholder:'https://x.com/yourhandle' },
];

export default function FooterManager() {
  const { showToast } = useContext(ToastContext);
  const [socials, setSocials] = useState(DEFAULT_SOCIALS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db,'site','footer_socials'), snap => {
      if (snap.exists() && snap.data().links?.length) setSocials(snap.data().links);
    }, () => {});
    return () => unsub();
  }, []);

  const save = async (links) => {
    setSaving(true);
    setSocials(links);
    await setDoc(doc(db,'site','footer_socials'), { links });
    setSaving(false);
    showToast('Footer updated — live instantly! ✓');
  };

  const updateLink  = (i, field, val) => setSocials(s => s.map((item,idx) => idx===i ? {...item,[field]:val} : item));
  const removeLink  = (i) => save(socials.filter((_,idx) => idx !== i));
  const addPreset   = (preset) => save([...socials, { label: preset.label, url: '' }]);
  const addCustom   = () => save([...socials, { label: 'CUSTOM', url: '' }]);

  return (
    <div className="footer-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Footer Social Links</h1>
          <p className="page-sub">Add, edit or remove social links shown in the footer. Changes are live instantly.</p>
        </div>
      </div>

      <div className="card footer-card">
        <h3 className="section-heading" style={{marginBottom:20}}>Current Links</h3>

        {socials.length === 0 && (
          <p style={{color:'#aaa',fontStyle:'italic',fontSize:13,marginBottom:16}}>No social links. Add from the presets below.</p>
        )}

        <div className="social-links-list">
          {socials.map((s, i) => (
            <div className="social-link-row" key={i}>
              <div className="form-field" style={{flex:'0 0 130px'}}>
                <label className="field-label">Label</label>
                <input className="field-input" value={s.label}
                  onChange={e => updateLink(i,'label',e.target.value)}
                  placeholder="e.g. INSTAGRAM" />
              </div>
              <div className="form-field" style={{flex:1}}>
                <label className="field-label">URL</label>
                <input className="field-input" value={s.url}
                  onChange={e => updateLink(i,'url',e.target.value)}
                  placeholder="https://..." />
              </div>
              <button className="social-remove-btn" onClick={() => removeLink(i)} title="Remove">
                <Trash2 size={14}/>
              </button>
            </div>
          ))}
        </div>

        <button className="btn-primary" style={{marginTop:16}} onClick={() => save(socials)} disabled={saving}>
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>

      <div className="card footer-card">
        <h3 className="section-heading" style={{marginBottom:12}}>Add Social Platform</h3>
        <p className="form-hint" style={{marginBottom:16}}>Click a platform to add it, then enter the URL above.</p>
        <div className="presets-grid">
          {PRESETS.map(p => (
            <button key={p.label} className="preset-btn" onClick={() => addPreset(p)}
              disabled={socials.some(s => s.label === p.label)}>
              <Plus size={12}/> {p.label}
            </button>
          ))}
          <button className="preset-btn preset-custom" onClick={addCustom}>
            <Plus size={12}/> Custom
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className="card footer-card">
        <h3 className="section-heading" style={{marginBottom:14}}>Footer Preview</h3>
        <div className="footer-preview">
          <div className="fp-brand">Kanyamaa Collections</div>
          <div className="fp-socials">
            {socials.filter(s => s.label).map((s,i) => (
              <span key={i} className="fp-link">{s.label}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}