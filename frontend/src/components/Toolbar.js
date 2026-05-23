import React from 'react';
import ProjectSelector from './ProjectSelector';

const s = {
  bar: {
    height: '52px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    padding: '0 16px',
    borderBottom: '1px solid #e2e6ea',
    background: '#ffffff',
    gap: '10px',
    zIndex: 10,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  logo: {
    fontFamily: 'var(--font-body)',
    fontSize: '13px',
    fontWeight: 700,
    color: '#1a1f2e',
    letterSpacing: '-0.01em',
    flexShrink: 0,
  },
  divider: {
    width: '1px',
    height: '18px',
    background: '#e2e6ea',
    flexShrink: 0,
  },
  spacer: { flex: 1 },
  ts: {
    fontSize: '11px',
    color: '#9ca3af',
    fontFamily: 'var(--font-mono)',
    flexShrink: 0,
  },
  statusPill: (ok) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '11px',
    fontWeight: 500,
    color: ok === null ? '#9ca3af' : ok ? '#15803d' : '#b91c1c',
    padding: '3px 10px',
    borderRadius: '20px',
    border: `1px solid ${ok === null ? '#e5e7eb' : ok ? '#bbf7d0' : '#fecaca'}`,
    background: ok === null ? '#f9fafb' : ok ? '#f0fdf4' : '#fef2f2',
    flexShrink: 0,
  }),
  dot: (ok) => ({
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: ok === null ? '#9ca3af' : ok ? '#22c55e' : '#ef4444',
    boxShadow: ok ? '0 0 5px #22c55e' : 'none',
    animation: ok === null ? 'pulse 1.4s ease-in-out infinite' : 'none',
  }),
  btn: (disabled) => ({
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    padding: '6px 14px',
    background: disabled ? '#f3f4f6' : 'var(--accent, #2563eb)',
    border: 'none',
    borderRadius: '7px',
    color: disabled ? '#9ca3af' : '#ffffff',
    fontFamily: 'var(--font-body)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background 0.15s',
    opacity: disabled ? 0.7 : 1,
    flexShrink: 0,
  }),
};

export default function Toolbar({ loading, backendOk, lastFetch, onRefresh, projects, selectedProject, onProjectChange }) {
  const tsLabel = lastFetch
    ? `last run ${lastFetch.toLocaleTimeString()}`
    : 'not yet run';

  return (
    <header style={s.bar}>
      <span style={s.logo}>wildstack</span>
      <div style={s.divider} />

      <ProjectSelector
        projects={projects}
        selectedId={selectedProject}
        onChange={onProjectChange}
      />

      <div style={s.spacer} />

      <span style={s.ts}>{tsLabel}</span>

      <div style={s.statusPill(backendOk)}>
        <div style={s.dot(backendOk)} />
        {backendOk === null ? 'connecting…' : backendOk ? 'backend ok' : 'backend error'}
      </div>

      <button
        style={s.btn(loading)}
        onClick={onRefresh}
        disabled={loading}
        title="Re-run the full pipeline"
      >
        {loading ? '⟳ running…' : '▶ Run'}
      </button>
    </header>
  );
}
