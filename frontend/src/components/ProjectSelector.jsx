import React, { useState, useRef, useEffect } from 'react';

export default function ProjectSelector({ projects, selectedId, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const selected = projects.find(p => p.id === selectedId);

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  if (!projects.length) return null;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '5px 10px 5px 10px',
          background: open ? '#f3f4f6' : '#fff',
          border: '1px solid #e2e6ea',
          borderRadius: '7px',
          cursor: 'pointer',
          fontFamily: 'var(--font-body)',
          fontSize: '13px',
          fontWeight: 500,
          color: '#1a1f2e',
          minWidth: '180px',
          transition: 'background 0.12s, border-color 0.12s',
          boxShadow: open ? '0 0 0 2px var(--accent-dim)' : 'none',
          outline: 'none',
        }}
      >
        <span style={{ fontSize: '15px', lineHeight: 1 }}>{selected?.icon ?? '🔧'}</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{selected?.name ?? 'Select project'}</span>
        <svg
          width="12" height="12" viewBox="0 0 12 12" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
        >
          <path d="M2 4l4 4 4-4" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: '220px',
          background: '#fff',
          border: '1px solid #e2e6ea',
          borderRadius: '9px',
          boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
          zIndex: 100,
          overflow: 'hidden',
          padding: '4px',
        }}>
          {projects.map(p => {
            const isActive = p.id === selectedId;
            return (
              <button
                key={p.id}
                onClick={() => { onChange(p.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '10px',
                  width: '100%',
                  padding: '9px 11px',
                  background: isActive ? 'var(--accent-dim, #dbeafe)' : 'transparent',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#f9fafb'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '16px', lineHeight: 1.2, flexShrink: 0 }}>{p.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: isActive ? 600 : 500, color: '#1a1f2e', lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '11px', color: '#8a95a3', lineHeight: 1.4, marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.description}
                  </div>
                </div>
                {isActive && (
                  <svg style={{ marginLeft: 'auto', flexShrink: 0, marginTop: '2px' }} width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3.5 3.5 5.5-6" stroke="var(--accent, #2563eb)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
