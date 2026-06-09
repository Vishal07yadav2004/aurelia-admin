// src/pages/FooterManager.js  (ADMIN)
// UPDATED: Added WhatsApp Number + WhatsApp Message fields under Branding & Contact tab
// These fields control the floating WhatsApp button on the client site.

import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Settings, Link as LinkIcon, Share2, FileText, MessageCircle } from 'lucide-react';

const DEFAULT_FOOTER_DATA = {
  brandName:       'Kanyamaa Collections',
  tagline:         'Crafting timeless pieces for the modern muse.\nEthical sourcing, masterful artistry, and elegant\ndesign since 1994.',
  contactEmail:    'support@kanyamma.com',
  contactPhone:    '+91 98765 43210',
  contactAddress:  '12, Jewellers Lane, New Delhi - 110001',
  copyrightText:   '© 2026 Kanyamma Collections. All rights reserved.',
  whatsappNumber:  '',   // leave blank to use contactPhone
  whatsappMessage: 'Hello! I have a question about Kanyamaa Collections.',
  shopLinks: [
    { label: 'New Arrivals',      url: '/shop'        },
    { label: 'Best Sellers',      url: '/shop'        },
    { label: 'Bridal Collection', url: '/collections' },
    { label: 'Fine Jewelry',      url: '/shop'        },
  ],
};

const DEFAULT_POLICY = `Return Policy\n\nWe want you to love your kanyamma purchase. If you are not completely satisfied, we accept returns within 30 days of delivery.\n\nConditions:\n• Items must be in original, unworn condition\n• Original packaging and certificate must be included\n• Sale items and personalised pieces are non-returnable\n\nHow to Return:\nEmail us at returns@kanyamma.com with your order number and reason.\n\nReturn Address:\nKanyamma Collections\n12, Jewellers Lane, New Delhi - 110001, India\n\nRefunds are processed within 7–10 business days of receiving the returned item.\n\nFor any queries, contact: support@kanyamma.com`;

const PRESETS = [
  { label: 'INSTAGRAM' },
  { label: 'FACEBOOK'  },
  { label: 'YOUTUBE'   },
  { label: 'TWITTER'   },
  { label: 'PINTEREST' },
];

export default function FooterManager() {
  const { showToast } = useContext(ToastContext);

  const [activeTab,  setActiveTab]  = useState('branding');
  const [footerData, setFooterData] = useState(DEFAULT_FOOTER_DATA);
  const [socials,    setSocials]    = useState([]);
  const [policyText, setPolicyText] = useState(DEFAULT_POLICY);
  const [newLabel,   setNewLabel]   = useState('');
  const [newUrl,     setNewUrl]     = useState('');
  const [saving,     setSaving]     = useState(false);

  // ── Load from Firebase ──────────────────────────────────────────────────
  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'site', 'footer_settings'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setFooterData(prev => ({
          ...prev,
          ...(d.brandName       !== undefined && { brandName:       d.brandName       }),
          ...(d.tagline         !== undefined && { tagline:         d.tagline         }),
          ...(d.contactEmail    !== undefined && { contactEmail:    d.contactEmail    }),
          ...(d.contactPhone    !== undefined && { contactPhone:    d.contactPhone    }),
          ...(d.contactAddress  !== undefined && { contactAddress:  d.contactAddress  }),
          ...(d.copyrightText   !== undefined && { copyrightText:   d.copyrightText   }),
          ...(d.whatsappNumber  !== undefined && { whatsappNumber:  d.whatsappNumber  }),
          ...(d.whatsappMessage !== undefined && { whatsappMessage: d.whatsappMessage }),
          ...(d.shopLinks?.length && { shopLinks: d.shopLinks }),
        }));
        if (d.policyText) setPolicyText(d.policyText);
      }
    }, () => {});

    const u2 = onSnapshot(doc(db, 'site', 'footer_socials'), snap => {
      if (snap.exists() && snap.data().links) setSocials(snap.data().links);
    }, () => {});

    return () => { u1(); u2(); };
  }, []);

  // ── Save functions ──────────────────────────────────────────────────────
  const saveFooterSettings = async (extraData = {}) => {
    setSaving(true);
    const merged = {
      brandName:       footerData.brandName,
      tagline:         footerData.tagline,
      contactEmail:    footerData.contactEmail,
      contactPhone:    footerData.contactPhone,
      contactAddress:  footerData.contactAddress,
      copyrightText:   footerData.copyrightText,
      whatsappNumber:  footerData.whatsappNumber  || '',
      whatsappMessage: footerData.whatsappMessage || '',
      shopLinks:       footerData.shopLinks,
      policyText,
      ...extraData,
    };
    await setDoc(doc(db, 'site', 'footer_settings'), merged);
    setSaving(false);
    showToast('Saved — live on client! ✓');
  };

  const saveSocials = async (links) => {
    setSaving(true);
    await setDoc(doc(db, 'site', 'footer_socials'), { links });
    setSaving(false);
    showToast('Social links saved ✓');
  };

  // ── Social handlers ─────────────────────────────────────────────────────
  const addSocial = () => {
    if (!newLabel.trim() || !newUrl.trim()) { showToast('Enter both label and URL', 'error'); return; }
    const updated = [...socials, { label: newLabel.toUpperCase().trim(), url: newUrl.trim() }];
    setSocials(updated);
    saveSocials(updated);
    setNewLabel(''); setNewUrl('');
  };

  const addPreset = (label) => {
    if (socials.some(s => s.label === label)) { showToast(`${label} already added`, 'error'); return; }
    const updated = [...socials, { label, url: '' }];
    setSocials(updated);
    saveSocials(updated);
  };

  const removeSocial  = (idx)          => { const u = socials.filter((_, i) => i !== idx); setSocials(u); saveSocials(u); };
  const updateSocial  = (idx, f, v)    => setSocials(socials.map((s, i) => i === idx ? { ...s, [f]: v } : s));

  // ── Shop links handlers ─────────────────────────────────────────────────
  const addShopLink    = ()           => setFooterData(p => ({ ...p, shopLinks: [...p.shopLinks, { label: 'New Link', url: '/shop' }] }));
  const removeShopLink = (idx)        => setFooterData(p => ({ ...p, shopLinks: p.shopLinks.filter((_, i) => i !== idx) }));
  const updateShopLink = (idx, f, v)  => setFooterData(p => ({ ...p, shopLinks: p.shopLinks.map((l, i) => i === idx ? { ...l, [f]: v } : l) }));

  const TABS = [
    { key: 'branding', label: 'Branding & Contact', icon: Settings      },
    { key: 'links',    label: 'Shop Links',          icon: LinkIcon      },
    { key: 'socials',  label: 'Social Media',        icon: Share2        },
    { key: 'policy',   label: 'Return Policy',       icon: FileText      },
  ];

  return (
    <div className="footer-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Footer &amp; Policy</h1>
          <p className="page-sub">Manage branding, contact details, WhatsApp button, social media, and return policy.</p>
        </div>
      </div>

      <div className="form-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} type="button" className={`form-tab-btn ${activeTab === key ? 'active' : ''}`} onClick={() => setActiveTab(key)}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════ BRANDING TAB ═══════════════════ */}
      {activeTab === 'branding' && (
        <div className="card">
          <h3 className="form-title">Brand &amp; Contact Information</h3>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Brand Name</label>
            <input className="field-input" value={footerData.brandName} onChange={e => setFooterData({ ...footerData, brandName: e.target.value })} placeholder="Kanyamaa Collections" />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Tagline (use Enter for line breaks)</label>
            <textarea className="field-input" rows={4} value={footerData.tagline} onChange={e => setFooterData({ ...footerData, tagline: e.target.value })} placeholder="Crafting timeless pieces..." style={{ minHeight: 90, resize: 'vertical' }} />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Contact Email</label>
            <input className="field-input" type="email" value={footerData.contactEmail || ''} onChange={e => setFooterData({ ...footerData, contactEmail: e.target.value })} placeholder="support@kanyamma.com" />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Contact Phone (shown in footer)</label>
            <input className="field-input" type="tel" value={footerData.contactPhone || ''} onChange={e => setFooterData({ ...footerData, contactPhone: e.target.value })} placeholder="+91 98765 43210" />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Contact Address</label>
            <input className="field-input" value={footerData.contactAddress || ''} onChange={e => setFooterData({ ...footerData, contactAddress: e.target.value })} placeholder="12, Jewellers Lane, New Delhi - 110001" />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Copyright Text</label>
            <input className="field-input" value={footerData.copyrightText} onChange={e => setFooterData({ ...footerData, copyrightText: e.target.value })} placeholder="© 2026 Kanyamma Collections. All rights reserved." />
          </div>

          {/* ── WhatsApp Section ── */}
          <div style={{ margin: '24px 0 8px', padding: '16px', background: '#f0fdf4', borderRadius: 10, border: '1px solid #bbf7d0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <MessageCircle size={16} color="#16a34a" />
              <span style={{ fontFamily: 'Jost, sans-serif', fontSize: 13, fontWeight: 600, color: '#16a34a' }}>WhatsApp Floating Button</span>
            </div>
            <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 12, color: '#555', marginBottom: 14, lineHeight: 1.6 }}>
              This controls the green WhatsApp button that floats on the bottom-right of your store. Leave "WhatsApp Number" blank to use the Contact Phone above.
            </p>

            <div className="form-field" style={{ marginBottom: 14 }}>
              <label className="field-label">WhatsApp Number (optional — overrides Contact Phone)</label>
              <input
                className="field-input"
                type="tel"
                value={footerData.whatsappNumber || ''}
                onChange={e => setFooterData({ ...footerData, whatsappNumber: e.target.value })}
                placeholder="+91 98765 43210  (leave blank to use Contact Phone)"
              />
            </div>

            <div className="form-field" style={{ marginBottom: 0 }}>
              <label className="field-label">Pre-filled WhatsApp Message</label>
              <input
                className="field-input"
                value={footerData.whatsappMessage || ''}
                onChange={e => setFooterData({ ...footerData, whatsappMessage: e.target.value })}
                placeholder="Hello! I have a question about Kanyamaa Collections."
              />
              <p style={{ fontFamily: 'Jost, sans-serif', fontSize: 11, color: '#aaa', marginTop: 4 }}>
                This text will auto-fill in WhatsApp when a customer clicks the button.
              </p>
            </div>
          </div>

          <button className="btn-primary" onClick={() => saveFooterSettings()} disabled={saving} style={{ marginTop: 20 }}>
            {saving ? 'Saving...' : 'Save Branding & Contact'}
          </button>
        </div>
      )}

      {/* ═══════════════════ SHOP LINKS TAB ═══════════════════ */}
      {activeTab === 'links' && (
        <div className="card">
          <h3 className="form-title">Shop Links (Footer Column)</h3>
          <p className="form-hint" style={{ marginBottom: 16 }}>
            These appear under the "SHOP" heading in the footer. Use <code>/shop</code>, <code>/collections</code>, etc. for internal pages.
          </p>

          {footerData.shopLinks.map((link, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10, padding: 12, background: '#f9f7f3', borderRadius: 8, alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="field-label">Label</label>
                <input className="field-input" value={link.label} onChange={e => updateShopLink(idx, 'label', e.target.value)} />
              </div>
              <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                <label className="field-label">URL</label>
                <input className="field-input" value={link.url} onChange={e => updateShopLink(idx, 'url', e.target.value)} placeholder="/shop" />
              </div>
              <button className="btn-danger-sm" onClick={() => removeShopLink(idx)} style={{ marginBottom: 2 }}>✕</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button className="btn-secondary" onClick={addShopLink}>+ Add Link</button>
            <button className="btn-primary" onClick={() => saveFooterSettings()} disabled={saving}>
              {saving ? 'Saving...' : 'Save Shop Links'}
            </button>
          </div>
        </div>
      )}

      {/* ═══════════════════ SOCIALS TAB ═══════════════════ */}
      {activeTab === 'socials' && (
        <div className="card">
          <h3 className="form-title">Social Media Links</h3>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            {PRESETS.map(p => (
              <button key={p.label} className="btn-secondary" style={{ fontSize: 11 }} onClick={() => addPreset(p.label)}>
                + {p.label}
              </button>
            ))}
          </div>

          {socials.map((s, idx) => (
            <div key={idx} style={{ display: 'flex', gap: 10, marginBottom: 10, padding: 12, background: '#f9f7f3', borderRadius: 8, alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="field-label">Label</label>
                <input className="field-input" value={s.label} onChange={e => updateSocial(idx, 'label', e.target.value.toUpperCase())} placeholder="INSTAGRAM" />
              </div>
              <div className="form-field" style={{ flex: 3, marginBottom: 0 }}>
                <label className="field-label">URL</label>
                <input className="field-input" value={s.url} onChange={e => updateSocial(idx, 'url', e.target.value)} placeholder="https://instagram.com/yourpage" />
              </div>
              <button className="btn-danger-sm" onClick={() => removeSocial(idx)} style={{ marginBottom: 2 }}>✕</button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 12, padding: 12, background: '#f5f3ee', borderRadius: 8, flexWrap: 'wrap' }}>
            <input className="field-input" style={{ flex: 1, minWidth: 120 }} placeholder="Label (e.g. PINTEREST)" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            <input className="field-input" style={{ flex: 3, minWidth: 200 }} placeholder="URL" value={newUrl} onChange={e => setNewUrl(e.target.value)} />
            <button className="btn-primary" onClick={addSocial}>Add</button>
          </div>

          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => saveSocials(socials)} disabled={saving}>
            {saving ? 'Saving...' : 'Save Social Links'}
          </button>
        </div>
      )}

      {/* ═══════════════════ POLICY TAB ═══════════════════ */}
      {activeTab === 'policy' && (
        <div className="card">
          <h3 className="form-title">Return Policy</h3>
          <p className="form-hint" style={{ marginBottom: 12 }}>This appears in the popup when customers click "Return Policy" in the footer.</p>
          <textarea
            className="field-input"
            rows={18}
            value={policyText}
            onChange={e => setPolicyText(e.target.value)}
            style={{ minHeight: 340, resize: 'vertical', fontFamily: 'Jost, sans-serif', fontSize: 13 }}
          />
          <button className="btn-primary" style={{ marginTop: 16 }} onClick={() => saveFooterSettings()} disabled={saving}>
            {saving ? 'Saving...' : 'Save Return Policy'}
          </button>
        </div>
      )}
    </div>
  );
}