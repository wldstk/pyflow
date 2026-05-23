/**
 * ErrorBanner.js
 * ──────────────
 * Full-canvas error state with retry button.
 */
import React from 'react';

const s = {
  wrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    background: '#e8edf2',
  },
  icon: {
    fontSize: '28px',
    marginBottom: '4px',
  },
  title: {
    fontFamily: 'var(--font-body)',
    fontSize: '14px',
    fontWeight: 600,
    color: '#b91c1c',
  },
  msg: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: '#6b7280',
    maxWidth: '420px',
    textAlign: 'center',
    lineHeight: 1.6,
  },
  btn: {
    marginTop: '10px',
    padding: '7px 22px',
    background: '#fff',
    border: '1px solid #e2e6ea',
    borderRadius: '6px',
    color: '#374151',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
};

export default function ErrorBanner({ message, onRetry }) {
  return (
    <div style={s.wrap}>
      <div style={s.icon}>⚠</div>
      <div style={s.title}>Pipeline fetch failed</div>
      <div style={s.msg}>{message}</div>
      <button style={s.btn} onClick={onRetry}>retry</button>
    </div>
  );
}
