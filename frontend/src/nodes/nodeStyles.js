// ── Status config ──────────────────────────────────────────────
export const STATUS = {
  done:    { pill: '#22c55e', pillBg: '#dcfce7', text: '#15803d', label: '✓ done'    },
  active:  { pill: '#f59e0b', pillBg: '#fef3c7', text: '#b45309', label: '● running' },
  pending: { pill: '#94a3b8', pillBg: '#f1f5f9', text: '#64748b', label: '○ pending' },
  error:   { pill: '#ef4444', pillBg: '#fee2e2', text: '#b91c1c', label: '✕ error'   },
};

// ── Card shell ─────────────────────────────────────────────────
export const nodeBase = (status = 'pending') => ({
  background: '#ffffff',
  border: `1.5px solid ${status === 'error' ? '#fca5a5' : '#e2e6ea'}`,
  borderRadius: '10px',
  padding: 0,
  minWidth: '220px',
  maxWidth: '260px',
  fontFamily: 'var(--font-body)',
  boxShadow: '0 2px 8px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.04)',
  overflow: 'hidden',
  cursor: 'default',
  transition: 'box-shadow 0.15s, border-color 0.15s',
});

// ── Node header ────────────────────────────────────────────────
export const nodeHeader = {
  padding: '10px 14px 9px',
  borderBottom: '1px solid #f0f2f5',
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  background: '#fafbfc',
};

export const nodeBody = {
  padding: '11px 14px 13px',
};

// ── Typography ─────────────────────────────────────────────────
export const labelStyle = {
  fontSize: '13px',
  fontWeight: 700,
  color: '#1a1f2e',
  flex: 1,
  letterSpacing: '-0.01em',
};

export const descStyle = {
  fontSize: '11px',
  color: '#8a95a3',
  marginBottom: '10px',
  lineHeight: 1.5,
  display: 'flex',
  alignItems: 'center',
  gap: '5px',
};

// ── Headline metric ────────────────────────────────────────────
export const headlineStyle = {
  display: 'flex',
  alignItems: 'baseline',
  gap: '4px',
  marginBottom: '4px',
};

export const headlineValue = {
  fontSize: '26px',
  fontWeight: 700,
  color: '#1a1f2e',
  fontFamily: 'var(--font-body)',
  lineHeight: 1,
  letterSpacing: '-0.02em',
};

export const headlineUnit = {
  fontSize: '12px',
  color: '#8a95a3',
  fontWeight: 500,
};

export const headlineLabel = {
  fontSize: '11px',
  color: '#8a95a3',
  marginBottom: '3px',
  fontWeight: 500,
};

// ── Stats grid ─────────────────────────────────────────────────
export const statGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, 1fr)',
  gap: '0',
  marginTop: '8px',
  borderTop: '1px solid #f0f2f5',
  paddingTop: '8px',
};

export const statItem = {
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

export const statKey = {
  fontSize: '10px',
  color: '#8a95a3',
  fontWeight: 500,
};

export const statVal = {
  fontSize: '13px',
  fontWeight: 600,
  color: '#1a1f2e',
};

// ── Status dot ─────────────────────────────────────────────────
export const statusDot = (status) => ({
  width: '8px',
  height: '8px',
  borderRadius: '50%',
  flexShrink: 0,
  background: STATUS[status]?.pill ?? '#94a3b8',
  boxShadow: status === 'active' ? '0 0 6px #f59e0b' : 'none',
});

// ── Status badge ───────────────────────────────────────────────
export const statusBadge = (status) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  fontSize: '10px',
  fontWeight: 600,
  color: STATUS[status]?.text ?? '#64748b',
  background: STATUS[status]?.pillBg ?? '#f1f5f9',
  borderRadius: '20px',
  padding: '2px 8px',
  marginTop: '8px',
  letterSpacing: '0.01em',
});

export const metricTag = {
  fontSize: '11px',
  color: '#8a95a3',
  fontWeight: 400,
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
};

export const divider = {
  height: '1px',
  background: '#f0f2f5',
  margin: '8px 0',
};

export const delta = (positive) => ({
  fontSize: '11px',
  fontWeight: 600,
  color: positive ? '#16a34a' : '#dc2626',
});
