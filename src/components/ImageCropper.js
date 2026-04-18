import React, { useState, useRef, useCallback, useContext } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';
import { ToastContext } from '../App';
import './ImageCropper.css';

/**
 * ImageCropper
 * Props:
 *   src        string  — data URL or remote URL to crop
 *   aspect     number  — e.g. 1 for square, 16/9 for landscape (default 1)
 *   onConfirm  fn(croppedDataUrl) => void
 *   onCancel   fn()
 *   preview    string  — 'square' | 'rectangle'  (shape of the preview thumbnail)
 */
export default function ImageCropper({ src, aspect = 1, onConfirm, onCancel, preview = 'square' }) {
  const { showToast } = useContext(ToastContext);
  const canvasRef  = useRef(null);
  const imgRef     = useRef(null);
  const [zoom, setZoom]       = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offset, setOffset]   = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [croppedPreview, setCroppedPreview] = useState(null);
  const [step, setStep] = useState('crop'); // 'crop' | 'preview'

  const CANVAS_SIZE = 360;
  const cropW = aspect >= 1 ? CANVAS_SIZE : CANVAS_SIZE * aspect;
  const cropH = aspect <= 1 ? CANVAS_SIZE : CANVAS_SIZE / aspect;

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

  // Touch support
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
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCroppedPreview(dataUrl);
    setStep('preview');
  };

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <h3 className="cropper-title">{step === 'crop' ? 'Crop Image' : 'Preview & Confirm'}</h3>
          <button className="cropper-close" onClick={onCancel}><X size={18} /></button>
        </div>

        {step === 'crop' && (
          <>
            <p className="cropper-hint">Drag to reposition · Use controls to zoom/rotate</p>
            <div className="cropper-stage"
              style={{ width: cropW, height: cropH }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={() => setDragging(false)}
            >
              <canvas ref={canvasRef} width={cropW} height={cropH} style={{ cursor: dragging ? 'grabbing' : 'grab' }} />
              {/* Hidden img used as source */}
              <img ref={imgRef} src={src} alt="" style={{ display: 'none' }}
                onLoad={() => { drawCanvas(); }} />
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
                <button className="btn-secondary" onClick={() => { setZoom(1); setRotation(0); setOffset({x:0,y:0}); setTimeout(drawCanvas,0); }}>Reset</button>
                <button className="btn-primary" onClick={handleCropNext}><Check size={15} /> Preview →</button>
              </div>
            </div>
          </>
        )}

        {step === 'preview' && croppedPreview && (
          <div className="cropper-preview-step">
            <p className="cropper-hint">This is how the image will look on the client site.</p>
            <div className="cropper-previews">
              <div className="cropper-preview-box">
                <p className="cropper-preview-label">Category / Product Tile</p>
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
              <button className="btn-secondary" onClick={() => setStep('crop')}>← Back to Crop</button>
              <button className="btn-primary" onClick={() => onConfirm(croppedPreview)}>
                <Check size={15} /> Use This Image
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}