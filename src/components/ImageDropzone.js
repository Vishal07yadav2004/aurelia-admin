import React, { useRef, useState, useContext } from 'react';
import { Upload, RefreshCw, X } from 'lucide-react';
import { ToastContext } from '../App';
import ImageCropper from './ImageCropper';
import './ImageDropzone.css';

/**
 * ImageDropzone with built-in crop & preview
 * Props:
 *   value    string   current image URL
 *   onChange fn(url)  called with cropped data URL
 *   folder   string   Cloudinary folder (optional)
 *   label    string
 *   aspect   number   1 = square (default)
 */
export default function ImageDropzone({ value, onChange, folder = 'aurelia', label, aspect = 1 }) {
  const { showToast } = useContext(ToastContext);
  const inputRef  = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [cropSrc,  setCropSrc]  = useState(null); // raw image src before crop

  const openCropper = (src) => setCropSrc(src);
  const closeCropper = () => setCropSrc(null);

  const processFile = (file) => {
    if (!file?.type.startsWith('image/')) { showToast('Please select an image', 'error'); return; }
    if (file.size > 15 * 1024 * 1024) { showToast('File too large (max 15MB)', 'error'); return; }
    const reader = new FileReader();
    reader.onload = (e) => openCropper(e.target.result);
    reader.readAsDataURL(file);
  };

  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop      = (e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files?.[0]); };
  const onFileChange = (e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); };

  const openCloudinary = (e) => {
    e.stopPropagation();
    if (!window.cloudinary) { showToast('Cloudinary not loaded', 'error'); return; }
    window.cloudinary.openUploadWidget(
      { cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME, uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET, sources: ['local','url','camera'], multiple: false, folder },
      (error, result) => {
        if (!error && result?.event === 'success') openCropper(result.info.secure_url);
      }
    );
  };

  const applyUrl = () => {
    const t = urlInput.trim();
    if (!t) return;
    openCropper(t);
    setUrlInput('');
  };

  return (
    <>
      <div className="dropzone-wrapper">
        {label && <label className="field-label">{label}</label>}

        <div
          className={`dropzone ${dragOver ? 'drag-over' : ''} ${value ? 'has-image' : ''}`}
          onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
          onClick={() => !value && inputRef.current?.click()}
        >
          <input ref={inputRef} type="file" accept="image/*" style={{ display:'none' }} onChange={onFileChange} />

          {value ? (
            <div className="dropzone-preview">
              <img src={value} alt="Preview" />
              <div className="dropzone-preview-actions">
                <button type="button" className="preview-action-btn" title="Re-crop / Change"
                  onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}>
                  <RefreshCw size={15} />
                </button>
                <button type="button" className="preview-action-btn danger" title="Remove"
                  onClick={(e) => { e.stopPropagation(); onChange(''); }}>
                  <X size={15} />
                </button>
              </div>
            </div>
          ) : (
            <div className="dropzone-content">
              <Upload size={30} className="dropzone-icon" />
              <p className="dropzone-label">Drop image here or click to browse</p>
              <p className="dropzone-sub">You'll be able to crop before saving · PNG, JPG · Max 15MB</p>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
          <button type="button" className="dz-cloudinary-btn" onClick={openCloudinary}>
            <Upload size={13} /> Cloudinary
          </button>
          <span className="dropzone-url-label">or</span>
          <div className="dropzone-url-row" style={{ flex:1, minWidth:180 }}>
            <input className="field-input" style={{ fontSize:12 }} placeholder="Paste image URL..."
              value={urlInput} onChange={e => setUrlInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && applyUrl()} />
            <button type="button" className="dz-cloudinary-btn" style={{ padding:'9px 14px' }} onClick={applyUrl}>Apply</button>
          </div>
        </div>
      </div>

      {/* CROP MODAL */}
      {cropSrc && (
        <ImageCropper
          src={cropSrc}
          aspect={aspect}
          onConfirm={(croppedUrl) => { onChange(croppedUrl); closeCropper(); showToast('Image cropped & ready ✓'); }}
          onCancel={closeCropper}
        />
      )}
    </>
  );
}