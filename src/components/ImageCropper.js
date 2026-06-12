import React, { useState, useRef, useCallback, useContext } from 'react';
import { X, ZoomOut, RotateCw, Check, ImageOff, Upload } from 'lucide-react';
import { ToastContext } from '../App';
import './ImageCropper.css';

// Upload base64 dataURL to Cloudinary, return secure_url
async function uploadToCloudinary(dataUrl) {
  const cloudName = process.env.REACT_APP_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET;

  console.log("Cloud Name:", cloudName);
  console.log("Upload Preset:", uploadPreset);

  const formData = new FormData();
  formData.append("file", dataUrl);
  formData.append("upload_preset", uploadPreset);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: "POST",
      body: formData,
    }
  );

  const responseText = await res.text();
  console.log("Cloudinary Response:", responseText);

  if (!res.ok) {
    throw new Error(`Cloudinary upload failed: ${responseText}`);
  }

  return JSON.parse(responseText).secure_url;
}

export default function ImageCropper({ src, aspect = 1, onConfirm, onCancel }) {
  const { showToast } = useContext(ToastContext);
  const canvasRef   = useRef(null);
  const imgRef      = useRef(null);
  const [zoom, setZoom]         = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset]     = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [step, setStep]         = useState('crop'); // 'crop' | 'preview'
  const [uploading, setUploading] = useState(false);

  const CANVAS_SIZE = 360;
  const cropW = aspect >= 1 ? CANVAS_SIZE : Math.round(CANVAS_SIZE * aspect);
  const cropH = aspect <= 1 ? CANVAS_SIZE : Math.round(CANVAS_SIZE / aspect);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, cropW, cropH);
    ctx.save();
    ctx.translate(cropW / 2 + offset.x, cropH / 2 + offset.y);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(zoom, zoom);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();
  }, [zoom, rotation, offset, cropW, cropH]);

  const handleMouseDown = (e) => {
    setDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
  };
  const handleMouseMove = (e) => {
    if (!dragging) return;
    setOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setDragging(false);
  const handleTouchStart = (e) => {
    const t = e.touches[0];
    setDragging(true);
    setDragStart({ x: t.clientX - offset.x, y: t.clientY - offset.y });
  };
  const handleTouchMove = (e) => {
    if (!dragging) return;
    const t = e.touches[0];
    setOffset({ x: t.clientX - dragStart.x, y: t.clientY - dragStart.y });
  };

  const handleCropNext = () => {
    drawCanvas();
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Use lower quality to reduce size before upload
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCroppedPreview(dataUrl);
    setStep('preview');
  };

  // Upload cropped base64 to Cloudinary, then return URL
  const handleUseCropped = async () => {
    setUploading(true);
    try {
      const url = await uploadToCloudinary(croppedPreview);
      onConfirm(url);
      showToast('Image uploaded & ready ✓');
    } catch (err) {
      console.error(err);
      showToast('Upload failed. Check Cloudinary config.', 'error');
    }
    setUploading(false);
  };

  // Use original src directly (already a URL if from Cloudinary widget or paste)
  const handleUseOriginal = async () => {
    // If src is a data URL (local file), upload it too
    if (src.startsWith('data:')) {
      setUploading(true);
      try {
        const url = await uploadToCloudinary(src);
        onConfirm(url);
        showToast('Original image uploaded ✓');
      } catch (err) {
        console.error(err);
        showToast('Upload failed. Check Cloudinary config.', 'error');
      }
      setUploading(false);
    } else {
      // Already a remote URL — use as-is
      onConfirm(src);
      showToast('Original image used ✓');
    }
  };

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <h3 className="cropper-title">
            {step === 'crop' ? 'Crop Image' : 'Preview & Confirm'}
          </h3>
          <button className="cropper-close" onClick={onCancel} disabled={uploading}>
            <X size={18} />
          </button>
        </div>

        {uploading && (
          <div style={{
            textAlign: 'center', padding: '20px',
            fontFamily: 'Jost, sans-serif', fontSize: 13, color: '#666',
          }}>
            <div style={{ marginBottom: 8 }}>⏳ Uploading to Cloudinary...</div>
            <div style={{ fontSize: 11, color: '#aaa' }}>This may take a moment</div>
          </div>
        )}

        {!uploading && step === 'crop' && (
          <>
            <p className="cropper-hint">Drag to reposition · Use controls to zoom/rotate</p>
            <div
              className="cropper-stage"
              style={{ width: cropW, height: cropH }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setDragging(false)}
            >
              <canvas
                ref={canvasRef}
                width={cropW}
                height={cropH}
                style={{ cursor: dragging ? 'grabbing' : 'grab' }}
              />
              <img
                ref={imgRef}
                src={src}
                alt=""
                style={{ display: 'none' }}
                onLoad={() => { drawCanvas(); }}
              />
              <div className="cropper-frame" style={{ width: cropW, height: cropH }} />
            </div>

            <div className="cropper-controls">
              <div className="cropper-control-row">
                <label className="cropper-ctrl-label"><ZoomOut size={14} /> Zoom</label>
                <input type="range" min="0.5" max="3" step="0.05" value={zoom}
                  onChange={e => { setZoom(Number(e.target.value)); setTimeout(drawCanvas, 0); }} />
                <span className="cropper-ctrl-val">{(zoom * 100).toFixed(0)}%</span>
              </div>
              <div className="cropper-control-row">
                <label className="cropper-ctrl-label"><RotateCw size={14} /> Rotate</label>
                <input type="range" min="-180" max="180" step="1" value={rotation}
                  onChange={e => { setRotation(Number(e.target.value)); setTimeout(drawCanvas, 0); }} />
                <span className="cropper-ctrl-val">{rotation}°</span>
              </div>
              <div className="cropper-btn-row">
                <button className="btn-secondary" onClick={() => {
                  setZoom(1); setRotation(0); setOffset({ x: 0, y: 0 }); setTimeout(drawCanvas, 0);
                }}>Reset</button>
                <button className="btn-secondary" onClick={handleUseOriginal}>
                  <ImageOff size={14} /> Use Original
                </button>
                <button className="btn-primary" onClick={handleCropNext}>
                  <Check size={15} /> Preview →
                </button>
              </div>
            </div>
          </>
        )}

        {!uploading && step === 'preview' && croppedPreview && (
          <div className="cropper-preview-step">
            <p className="cropper-hint">Preview of cropped image.</p>
            <div className="cropper-previews">
              <div className="cropper-preview-box">
                <p className="cropper-preview-label">Tile Preview</p>
                <div className="cropper-preview-tile" style={{ aspectRatio: aspect }}>
                  <img src={croppedPreview} alt="preview" />
                </div>
              </div>
              <div className="cropper-preview-box">
                <p className="cropper-preview-label">Thumbnail</p>
                <div className="cropper-preview-thumb">
                  <img src={croppedPreview} alt="thumb" />
                </div>
              </div>
            </div>
            <div className="cropper-btn-row" style={{ marginTop: 20 }}>
              <button className="btn-secondary" onClick={() => setStep('crop')}>← Back</button>
              <button className="btn-secondary" onClick={handleUseOriginal}>
                <ImageOff size={14} /> Use Original
              </button>
              <button className="btn-primary" onClick={handleUseCropped}>
                <Upload size={14} /> Upload & Use Cropped
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}