import React, { useRef, useState, useContext } from 'react';
import { Upload, RefreshCw, X } from 'lucide-react';
import { ToastContext } from '../App';
import './ImageDropzone.css';

/**
 * ImageDropzone
 * Props:
 *   value       {string}   current image URL
 *   onChange    {fn}       (url: string) => void
 *   folder      {string}   Cloudinary folder name (optional)
 *   label       {string}   label above dropzone (optional)
 */
export default function ImageDropzone({ value, onChange, folder = 'aurelia', label }) {
  const { showToast } = useContext(ToastContext);
  const inputRef   = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');

  // ── Process File ──
  const processFile = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Please drop an image file', 'error');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large (max 10MB)', 'error');
      return;
    }
    // Read as data URL for local preview
    const reader = new FileReader();
    reader.onload = (e) => onChange(e.target.result);
    reader.readAsDataURL(file);
  };

  // ── Drag events ──
  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop      = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    processFile(file);
  };

  // ── File input change ──
  const onFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // ── Cloudinary widget ──
  const openCloudinary = (e) => {
    e.stopPropagation();
    if (!window.cloudinary) {
      showToast('Cloudinary widget not loaded', 'error');
      return;
    }
    const cloudName   = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;
    window.cloudinary.openUploadWidget(
      {
        cloudName, uploadPreset,
        sources: ['local', 'url', 'camera'],
        multiple: false,
        folder,
        cropping: true,
        croppingAspectRatio: 1,
      },
      (error, result) => {
        if (!error && result?.event === 'success') {
          onChange(result.info.secure_url);
          showToast('Image uploaded ✓');
        }
      }
    );
  };

  // ── Apply URL ──
  const applyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;
    onChange(trimmed);
    setUrlInput('');
    showToast('Image URL applied ✓');
  };

  return (
    <div className="dropzone-wrapper">
      {label && <label className="field-label">{label}</label>}

      {/* Drop Zone */}
      <div
        className={`dropzone ${dragOver ? 'drag-over' : ''} ${value ? 'has-image' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => !value && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="dropzone-input"
          onChange={onFileChange}
          style={{ display: 'none' }}
        />

        {value ? (
          <div className="dropzone-preview">
            <img src={value} alt="Preview" />
            <div className="dropzone-preview-actions">
              <button
                type="button"
                className="preview-action-btn"
                title="Change image"
                onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
              >
                <RefreshCw size={15} />
              </button>
              <button
                type="button"
                className="preview-action-btn danger"
                title="Remove image"
                onClick={(e) => { e.stopPropagation(); onChange(''); }}
              >
                <X size={15} />
              </button>
            </div>
          </div>
        ) : (
          <div className="dropzone-content">
            <Upload size={30} className="dropzone-icon" />
            <p className="dropzone-label">Drop image here or click to browse</p>
            <p className="dropzone-sub">PNG, JPG, WEBP · Max 10MB</p>
          </div>
        )}
      </div>

      {/* Bottom row: Cloudinary + URL */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button type="button" className="dz-cloudinary-btn" onClick={openCloudinary}>
          <Upload size={13} /> Cloudinary
        </button>
        <span className="dropzone-url-label">or</span>
        <div className="dropzone-url-row" style={{ flex: 1, minWidth: 180 }}>
          <input
            className="field-input"
            style={{ fontSize: 12 }}
            placeholder="Paste image URL..."
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && applyUrl()}
          />
          <button type="button" className="dz-cloudinary-btn" style={{ padding: '9px 14px' }} onClick={applyUrl}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}