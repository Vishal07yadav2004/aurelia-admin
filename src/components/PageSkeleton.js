import React from 'react';
import './PageSkeleton.css';

const Block = ({ className = '' }) => <span className={`skeleton-block ${className}`} aria-hidden="true" />;

export default function PageSkeleton({ variant = 'list' }) {
  const rows = variant === 'dashboard' ? 4 : 5;

  return (
    <div className={`page-skeleton page-skeleton--${variant}`} role="status" aria-label="Loading page">
      <div className="skeleton-heading">
        <Block className="skeleton-title" />
        <Block className="skeleton-subtitle" />
      </div>

      {variant === 'dashboard' && (
        <>
          <div className="skeleton-stats">
            {Array.from({ length: 4 }, (_, index) => <Block className="skeleton-stat" key={index} />)}
          </div>
          <div className="skeleton-panels">
            <Block className="skeleton-panel skeleton-panel--wide" />
            <Block className="skeleton-panel" />
          </div>
        </>
      )}

      {variant === 'form' && (
        <div className="skeleton-form-card card">
          <div className="skeleton-form-grid">
            {Array.from({ length: 6 }, (_, index) => <Block className="skeleton-field" key={index} />)}
          </div>
          <Block className="skeleton-button" />
        </div>
      )}

      {variant !== 'dashboard' && (
        <div className="skeleton-list">
          {Array.from({ length: rows }, (_, index) => (
            <div className="skeleton-list-row card" key={index}>
              <Block className="skeleton-thumb" />
              <div className="skeleton-lines"><Block /><Block className="skeleton-line-short" /></div>
              <Block className="skeleton-action" />
            </div>
          ))}
        </div>
      )}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
