import React, { useState, useEffect, useContext } from 'react';
import { db } from '../firebase/config';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { ToastContext } from '../App';
import { Trash2, Plus, Link as LinkIcon, FileText, Settings, Share2 } from 'lucide-react';
import './FooterManager.css';

// ============================================
// DEFAULTS
// ============================================
const DEFAULT_FOOTER_DATA = {
  brandName: 'Kanyamaa Collections',
  tagline: 'Crafting timeless pieces for the modern muse.\nEthical sourcing, masterful artistry, and elegant\ndesign since 1994.',
  contactEmail: 'support@kanyamma.com',
  contactPhone: '+91 98765 43210',
  contactAddress: '12, Jewellers Lane, New Delhi - 110001',
  copyrightText: '© 2026 Kanyamma Collections. All rights reserved.',
  shopLinks: [
    { label: 'New Arrivals',       url: '/shop'        },
    { label: 'Best Sellers',       url: '/shop'        },
    { label: 'Bridal Collection',  url: '/collections' },
    { label: 'Fine Jewelry',       url: '/shop'        },
  ],
};

const DEFAULT_POLICY = `Return Policy

We want you to love your kanyamma purchase. If you are not completely satisfied, we accept returns within 30 days of delivery.

Conditions:
• Items must be in original, unworn condition
• Original packaging and certificate must be included
• Sale items and personalised pieces are non-returnable

How to Return:
Email us at returns@kanyamma.com with your order number and reason.

Return Address:
Kanyamma Collections
12, Jewellers Lane, New Delhi - 110001, India

Refunds are processed within 7–10 business days of receiving the returned item.

For any queries, contact: support@kanyamma.com`;

// Social presets — labels match the icons in Footer.js
const PRESETS = [
  { label: 'INSTAGRAM' },
  { label: 'FACEBOOK'  },
  { label: 'YOUTUBE'   },
  { label: 'TWITTER'   },
  { label: 'PINTEREST' },
];

// ============================================
// COMPONENT
// ============================================
export default function FooterManager() {
  const { showToast } = useContext(ToastContext);

  const [activeTab,   setActiveTab]   = useState('branding');
  const [footerData,  setFooterData]  = useState(DEFAULT_FOOTER_DATA);
  const [socials,     setSocials]     = useState([]);
  const [policyText,  setPolicyText]  = useState(DEFAULT_POLICY);
  const [newLabel,    setNewLabel]    = useState('');
  const [newUrl,      setNewUrl]      = useState('');
  const [saving,      setSaving]      = useState(false);

  // ============================================
  // LOAD FROM FIREBASE
  // ============================================
  useEffect(() => {
    const u1 = onSnapshot(doc(db, 'site', 'footer_settings'), snap => {
      if (snap.exists()) {
        const d = snap.data();
        setFooterData(prev => ({
          ...prev,
          ...(d.brandName       && { brandName:       d.brandName       }),
          ...(d.tagline         && { tagline:         d.tagline         }),
          ...(d.contactEmail    && { contactEmail:    d.contactEmail    }),
          ...(d.contactPhone    && { contactPhone:    d.contactPhone    }),
          ...(d.contactAddress  && { contactAddress:  d.contactAddress  }),
          ...(d.copyrightText   && { copyrightText:   d.copyrightText   }),
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

  // ============================================
  // SAVE FUNCTIONS
  // ============================================
  const saveFooterSettings = async (newData = {}) => {
    setSaving(true);
    const merged = {
      brandName:      footerData.brandName,
      tagline:        footerData.tagline,
      contactEmail:   footerData.contactEmail,
      contactPhone:   footerData.contactPhone,
      contactAddress: footerData.contactAddress,
      copyrightText:  footerData.copyrightText,
      shopLinks:      footerData.shopLinks,
      policyText,
      ...newData,
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

  // ============================================
  // SOCIAL LINKS HANDLERS
  // ============================================
  const addSocial = () => {
    if (!newLabel.trim() || !newUrl.trim()) {
      showToast('Enter both label and URL', 'error');
      return;
    }
    const updated = [...socials, { label: newLabel.toUpperCase().trim(), url: newUrl.trim() }];
    setSocials(updated);
    saveSocials(updated);
    setNewLabel('');
    setNewUrl('');
  };

  const addPreset = (label) => {
    if (socials.some(s => s.label === label)) {
      showToast(`${label} already added`, 'error');
      return;
    }
    const updated = [...socials, { label, url: '' }];
    setSocials(updated);
    saveSocials(updated);
  };

  const removeSocial = (idx) => {
    const updated = socials.filter((_, i) => i !== idx);
    setSocials(updated);
    saveSocials(updated);
  };

  const updateSocial = (idx, field, value) => {
    const updated = socials.map((s, i) => i === idx ? { ...s, [field]: value } : s);
    setSocials(updated);
  };

  // ============================================
  // SHOP LINKS HANDLERS
  // ============================================
  const addShopLink = () => {
    setFooterData(prev => ({
      ...prev,
      shopLinks: [...prev.shopLinks, { label: 'New Link', url: '/shop' }],
    }));
  };

  const removeShopLink = (idx) => {
    setFooterData(prev => ({
      ...prev,
      shopLinks: prev.shopLinks.filter((_, i) => i !== idx),
    }));
  };

  const updateShopLink = (idx, field, value) => {
    setFooterData(prev => ({
      ...prev,
      shopLinks: prev.shopLinks.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  };

  // ============================================
  // TABS
  // ============================================
  const TABS = [
    { key: 'branding', label: 'Branding & Contact', icon: Settings  },
    { key: 'links',    label: 'Shop Links',          icon: LinkIcon  },
    { key: 'socials',  label: 'Social Media',        icon: Share2    },
    { key: 'policy',   label: 'Return Policy',       icon: FileText  },
  ];

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="footer-manager">
      <div className="page-header">
        <div>
          <h1 className="page-title">Footer & Policy</h1>
          <p className="page-sub">Manage branding, contact details, social media, and return policy.</p>
        </div>
      </div>

      <div className="form-tabs">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            type="button"
            className={`form-tab-btn ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* ===================== BRANDING TAB ===================== */}
      {activeTab === 'branding' && (
        <div className="card">
          <h3 className="form-title">Brand & Contact Information</h3>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Brand Name</label>
            <input
              className="field-input"
              value={footerData.brandName}
              onChange={e => setFooterData({ ...footerData, brandName: e.target.value })}
              placeholder="Kanyamaa Collections"
            />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Tagline (use Enter for line breaks)</label>
            <textarea
              className="field-input"
              rows={4}
              value={footerData.tagline}
              onChange={e => setFooterData({ ...footerData, tagline: e.target.value })}
              placeholder="Crafting timeless pieces..."
              style={{ minHeight: 90, resize: 'vertical' }}
            />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Contact Email</label>
            <input
              className="field-input"
              type="email"
              value={footerData.contactEmail || ''}
              onChange={e => setFooterData({ ...footerData, contactEmail: e.target.value })}
              placeholder="support@kanyamma.com"
            />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Contact Phone</label>
            <input
              className="field-input"
              type="tel"
              value={footerData.contactPhone || ''}
              onChange={e => setFooterData({ ...footerData, contactPhone: e.target.value })}
              placeholder="+91 98765 43210"
            />
          </div>

          <div className="form-field" style={{ marginBottom: 16 }}>
            <label className="field-label">Contact Address</label>
            <input
              className="field-input"
              value={footerData.contactAddress || ''}
              onChange={e => setFooterData({ ...footerData, contactAddress: e.target.value })}
              placeholder="12, Jewellers Lane, New Delhi - 110001"
            />
          </div>

          <div className="form-field" style={{ marginBottom: 20 }}>
            <label className="field-label">Copyright Text</label>
            <input
              className="field-input"
              value={footerData.copyrightText}
              onChange={e => setFooterData({ ...footerData, copyrightText: e.target.value })}
              placeholder="© 2026 Kanyamma Collections. All rights reserved."
            />
          </div>

          <button
            className="btn-primary"
            onClick={() => saveFooterSettings()}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Branding & Contact'}
          </button>
        </div>
      )}

      {/* ===================== SHOP LINKS TAB ===================== */}
      {activeTab === 'links' && (
        <div className="card">
          <h3 className="form-title">Shop Links (Footer Column)</h3>
          <p className="form-hint" style={{ marginBottom: 16 }}>
            These appear under the "SHOP" heading in the footer. Use <code>/shop</code>, <code>/collections</code>, etc. for internal pages.
          </p>

          {footerData.shopLinks.map((link, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                gap: 10,
                marginBottom: 10,
                padding: 12,
                background: '#f9f7f3',
                borderRadius: 8,
                alignItems: 'flex-end',
              }}
            >
              <div className="form-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="field-label" style={{ fontSize: 10 }}>Label</label>
                <input
                  className="field-input"
                  value={link.label}
                  onChange={e => updateShopLink(idx, 'label', e.target.value)}
                  placeholder="New Arrivals"
                />
              </div>
              <div className="form-field" style={{ flex: 1.5, marginBottom: 0 }}>
                <label className="field-label" style={{ fontSize: 10 }}>URL</label>
                <input
                  className="field-input"
                  value={link.url}
                  onChange={e => updateShopLink(idx, 'url', e.target.value)}
                  placeholder="/shop"
                />
              </div>
              <button
                type="button"
                onClick={() => removeShopLink(idx)}
                style={{
                  background: '#fff5f5',
                  border: '1px solid #ffd5d5',
                  color: '#e74c3c',
                  padding: '8px 10px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="btn-secondary" onClick={addShopLink}>
              <Plus size={13} /> Add Link
            </button>
            <button
              className="btn-primary"
              onClick={() => saveFooterSettings()}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Links'}
            </button>
          </div>
        </div>
      )}

      {/* ===================== SOCIALS TAB ===================== */}
      {activeTab === 'socials' && (
        <div className="card">
          <h3 className="form-title">Social Media Icons</h3>
          <div
            style={{
              background: '#fff8f0',
              padding: '12px 16px',
              borderRadius: 10,
              marginBottom: 16,
              fontSize: 13,
              color: '#856404',
              lineHeight: 1.6,
            }}
          >
            💡 <strong>Tip:</strong> Use these <strong>exact labels</strong> to get auto-icons in the footer:
            <br />
            <code>INSTAGRAM</code> · <code>FACEBOOK</code> · <code>YOUTUBE</code> · <code>TWITTER</code> · <code>PINTEREST</code>
            <br />
            Other labels will show a default mail icon.
          </div>

          {/* Quick add presets */}
          <div className="form-field" style={{ marginBottom: 20 }}>
            <label className="field-label" style={{ marginBottom: 8, display: 'block' }}>
              Quick Add Preset
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => addPreset(p.label)}
                  disabled={socials.some(s => s.label === p.label)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 100,
                    border: '1px solid #ddd',
                    background: socials.some(s => s.label === p.label) ? '#f0f0f0' : '#fff',
                    color: socials.some(s => s.label === p.label) ? '#bbb' : '#555',
                    fontFamily: 'Jost, sans-serif',
                    fontSize: 12,
                    cursor: socials.some(s => s.label === p.label) ? 'not-allowed' : 'pointer',
                  }}
                >
                  + {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Existing socials */}
          {socials.length === 0 ? (
            <p style={{ color: '#aaa', fontStyle: 'italic', fontSize: 13, padding: '12px 0' }}>
              No social links yet. Use the presets above or add manually below.
            </p>
          ) : (
            <div style={{ marginBottom: 20 }}>
              {socials.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 10,
                    padding: 12,
                    background: '#f9f7f3',
                    borderRadius: 8,
                    alignItems: 'flex-end',
                  }}
                >
                  <div className="form-field" style={{ flex: 0.7, marginBottom: 0 }}>
                    <label className="field-label" style={{ fontSize: 10 }}>Label</label>
                    <input
                      className="field-input"
                      value={s.label}
                      onChange={e => updateSocial(idx, 'label', e.target.value.toUpperCase())}
                      onBlur={() => saveSocials(socials)}
                      placeholder="INSTAGRAM"
                    />
                  </div>
                  <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                    <label className="field-label" style={{ fontSize: 10 }}>URL</label>
                    <input
                      className="field-input"
                      value={s.url}
                      onChange={e => updateSocial(idx, 'url', e.target.value)}
                      onBlur={() => saveSocials(socials)}
                      placeholder="https://instagram.com/yourbrand"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSocial(idx)}
                    style={{
                      background: '#fff5f5',
                      border: '1px solid #ffd5d5',
                      color: '#e74c3c',
                      padding: '8px 10px',
                      borderRadius: 8,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add manually */}
          <div
            style={{
              padding: 14,
              background: '#f5f3ee',
              borderRadius: 10,
              border: '1px dashed #ccc',
            }}
          >
            <p
              style={{
                fontSize: 11,
                color: '#888',
                marginBottom: 10,
                letterSpacing: '0.08em',
              }}
            >
              ADD CUSTOM
            </p>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
              <div className="form-field" style={{ flex: 0.7, marginBottom: 0 }}>
                <label className="field-label" style={{ fontSize: 10 }}>Label</label>
                <input
                  className="field-input"
                  value={newLabel}
                  onChange={e => setNewLabel(e.target.value)}
                  placeholder="INSTAGRAM"
                />
              </div>
              <div className="form-field" style={{ flex: 2, marginBottom: 0 }}>
                <label className="field-label" style={{ fontSize: 10 }}>URL</label>
                <input
                  className="field-input"
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="https://instagram.com/yourbrand"
                />
              </div>
              <button className="btn-primary" onClick={addSocial} style={{ height: 38 }}>
                <Plus size={13} /> Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== POLICY TAB ===================== */}
      {activeTab === 'policy' && (
        <div className="card">
          <h3 className="form-title">Return Policy Content</h3>
          <p className="form-hint" style={{ marginBottom: 12 }}>
            Use bullet points starting with • and sub-section headings ending with :
          </p>
          <textarea
            className="field-input"
            value={policyText}
            onChange={e => setPolicyText(e.target.value)}
            style={{
              minHeight: 400,
              fontFamily: 'Jost, sans-serif',
              fontSize: 13,
              lineHeight: 1.7,
              resize: 'vertical',
            }}
          />
          <button
            className="btn-primary"
            onClick={() => saveFooterSettings()}
            disabled={saving}
            style={{ marginTop: 16 }}
          >
            {saving ? 'Saving...' : 'Save Policy'}
          </button>
        </div>
      )}
    </div>
  );
}