import React, { useRef, useState, useContext } from 'react';
import { Upload, RefreshCw, X, Plus } from 'lucide-react';
import { ToastContext } from '../App';
import ImageCropper from './ImageCropper';
import './ImageDropzone.css';

/**
 * ImageDropzone — supports multi-image upload
 *
 * Props:
 *   value      string | string[]   current image URL or array of URLs
 *   onChange   fn(url | url[])     called with result
 *   multi      boolean             if true, support multiple images; value/onChange are arrays
 *   maxFiles   number              max images when multi=true (default 5)
 *   folder     string
 *   label      string
 *   aspect     number
 */
export default function ImageDropzone({
  value,
  onChange,
  folder = 'aurelia',
  label,
  aspect = 1,
  multi = false,
  maxFiles = 5,
}) {
  const { showToast } = useContext(ToastContext);
  const inputRef  = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  // Queue of raw srcs waiting to be cropped one by one
  const [cropQueue, setCropQueue] = useState([]);
  const [currentCropSrc, setCurrentCropSrc] = useState(null);

  // Normalise value to array for multi mode
  const images = multi ? (Array.isArray(value) ? value : value ? [value] : []) : null;

  const openCropper = (src) => setCurrentCropSrc(src);

  const processFiles = (files) => {
    const valid = [...files].filter(f => f.type.startsWith('image/'));
    if (!valid.length) { showToast('Please select image files', 'error'); return; }

    if (multi) {
      // Check capacity
      const remaining = maxFiles - (images?.length || 0);
      if (remaining <= 0) { showToast(`Maximum ${maxFiles} images reached`, 'error'); return; }
      const toProcess = valid.slice(0, remaining);
      if (valid.length > remaining) showToast(`Only ${remaining} more image(s) can be added`, 'error');

      // Build queue of data URLs
      const readers = toProcess.map(file => new Promise((resolve, reject) => {
        if (file.size > 15 * 1024 * 1024) { reject(`${file.name} too large (max 15MB)`); return; }
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      }));
      Promise.allSettled(readers).then(results => {
        const srcs = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        if (!srcs.length) return;
        // Start cropping queue — first item opens immediately, rest queue
        setCurrentCropSrc(srcs[0]);
        setCropQueue(srcs.slice(1));
      });
    } else {
      // Single mode — just process first file
      const file = valid[0];
      if (file.size > 15 * 1024 * 1024) { showToast('File too large (max 15MB)', 'error'); return; }
      const reader = new FileReader();
      reader.onload = e => openCropper(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const onDragOver  = (e) => { e.preventDefault(); setDragOver(true); };
  const onDragLeave = (e) => { e.preventDefault(); setDragOver(false); };
  const onDrop      = (e) => { e.preventDefault(); setDragOver(false); processFiles(e.dataTransfer.files); };
  const onFileChange = (e) => { if (e.target.files?.length) processFiles(e.target.files); };

  const openCloudinary = (e) => {
    e.stopPropagation();
    if (!window.cloudinary) { showToast('Cloudinary not loaded', 'error'); return; }
    window.cloudinary.openUploadWidget(
      {
        cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
        uploadPreset: process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET,
        sources: ['local','url','camera'],
        multiple: multi,
        maxFiles: multi ? (maxFiles - (images?.length || 0)) : 1,
        folder,
      },
      (error, result) => {
        if (!error && result?.event === 'success') {
          if (multi) {
            // Cloudinary may fire multiple success events
            openCropper(result.info.secure_url);
          } else {
            openCropper(result.info.secure_url);
          }
        }
      }
    );
  };

  const applyUrl = () => {
    const t = urlInput.trim();
    if (!t) return;
    openCropper(t);
    setUrlInput('');
  };

  // Called when a crop is confirmed
  const handleCropConfirm = (croppedUrl) => {
    if (multi) {
      // Add to images array
      onChange([...(images || []), croppedUrl]);
      showToast('Image added ✓');
      // Process next in queue if any
      if (cropQueue.length > 0) {
        const [next, ...rest] = cropQueue;
        setCurrentCropSrc(next);
        setCropQueue(rest);
      } else {
        setCurrentCropSrc(null);
      }
    } else {
      onChange(croppedUrl);
      setCurrentCropSrc(null);
      showToast('Image cropped & ready ✓');
    }
  };

  const handleCropCancel = () => {
    // Skip current, try next in queue
    if (cropQueue.length > 0) {
      const [next, ...rest] = cropQueue;
      setCurrentCropSrc(next);
      setCropQueue(rest);
    } else {
      setCurrentCropSrc(null);
      setCropQueue([]);
    }
  };

  const removeImage = (idx) => {
    if (!multi) { onChange(''); return; }
    onChange(images.filter((_, i) => i !== idx));
  };

  // ── MULTI mode render ──
  if (multi) {
    return (
      <>
        <div className="dropzone-wrapper">
          {label && <label className="field-label">{label}</label>}

          {/* Existing images */}
          {images.length > 0 && (
            <div className="dz-multi-grid">
              {images.map((img, idx) => (
                <div className="dz-multi-thumb" key={idx}>
                  <img src={img} alt={`img-${idx}`} />
                  <button type="button" className="dz-multi-remove" onClick={() => removeImage(idx)} title="Remove">
                    <X size={11} />
                  </button>
                  {idx === 0 && <span className="dz-multi-main-badge">Main</span>}
                </div>
              ))}
            </div>
          )}

          {/* Add more — only show if under limit */}
          {images.length < maxFiles && (
            <div
              className={`dropzone ${dragOver ? 'drag-over' : ''}`}
              onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}
              onClick={() => inputRef.current?.click()}
              style={{ minHeight: 80, padding: '16px 20px' }}
            >
              {/* Multi-file input */}
              <input ref={inputRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={onFileChange} />
              <div className="dropzone-content">
                <Plus size={22} className="dropzone-icon" />
                <p className="dropzone-label">Add images ({images.length}/{maxFiles})</p>
                <p className="dropzone-sub">Select multiple at once · PNG, JPG · Max 15MB each</p>
              </div>
            </div>
          )}

          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            <button type="button" className="dz-cloudinary-btn" onClick={openCloudinary}>
              <Upload size={13} /> Cloudinary
            </button>
            <span className="dropzone-url-label">or</span>
            <div className="dropzone-url-row" style={{ flex:1, minWidth:180 }}>
              <input className="field-input" style={{ fontSize:12 }} placeholder="Paste image URL..."
                value={urlInput} onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyUrl()} />
              <button type="button" className="dz-cloudinary-btn" style={{ padding:'9px 14px' }} onClick={applyUrl}>Add</button>
            </div>
          </div>
        </div>

        {currentCropSrc && (
          <ImageCropper
            src={currentCropSrc}
            aspect={aspect}
            onConfirm={handleCropConfirm}
            onCancel={handleCropCancel}
          />
        )}
      </>
    );
  }

  // ── SINGLE mode render (original behaviour) ──
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
              <p className="dropzone-sub">Crop or use original · PNG, JPG · Max 15MB</p>
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

      {currentCropSrc && (
        <ImageCropper
          src={currentCropSrc}
          aspect={aspect}
          onConfirm={(croppedUrl) => { onChange(croppedUrl); setCurrentCropSrc(null); showToast('Image ready ✓'); }}
          onCancel={() => setCurrentCropSrc(null)}
        />
      )}
    </>
  );
}