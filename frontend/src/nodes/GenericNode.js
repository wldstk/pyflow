/**
 * GenericNode.js
 * ──────────────
 * Single React component used for every node type.
 * Driven entirely by the data object received from the YAML-configured backend:
 *
 *   data.label        — card title
 *   data.description  — subtitle (supports {param} format from YAML)
 *   data.status       — done | active | pending | error
 *   data.stats        — flat {key: value} object → small badge grid
 *   data.headline     — {label, value, unit} → large KPI number
 *   data.detail       — pass-through outputs (column_stats, anomalies, …)
 *
 * ReactFlow node `type` controls handles and header highlight:
 *   input    → source handle only (right)
 *   output   → target handle only (left)
 *   anomaly  → amber header when headline.value > 0
 *   averages → renders detail.column_stats as expandable table
 *   default  → both handles, no special styling
 */

import React, { memo, useState } from 'react';
import { Handle, Position } from 'reactflow';
import { usePipelineContext } from '../context/PipelineContext';
import {
  STATUS,
  nodeBase, nodeHeader, nodeBody,
  labelStyle, descStyle,
  headlineStyle, headlineValue, headlineUnit, headlineLabel,
  statGrid, statItem, statKey, statVal,
  statusDot, statusBadge, divider,
} from './nodeStyles';

// ── Detail renderers ───────────────────────────────────────────

function ColumnStatsTable({ columnStats }) {
  if (!columnStats || !Object.keys(columnStats).length) return null;
  return (
    <div style={{ marginTop: '8px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#8a95a3', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Column breakdown
      </div>
      {Object.entries(columnStats).map(([col, s]) => (
        <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
          <span style={{ fontSize: '10px', color: '#6b7280', minWidth: '90px', fontFamily: 'var(--font-mono)' }}>
            {col.replace(/_/g, ' ')}
          </span>
          <div style={{ flex: 1, display: 'flex', gap: '5px' }}>
            {[['μ', s.mean], ['↓', s.min], ['↑', s.max]].map(([lbl, v]) => (
              <span key={lbl} style={{ fontSize: '10px', color: '#374151', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#9ca3af' }}>{lbl}</span>{v ?? '—'}
              </span>
            ))}
          </div>
          <span style={{ fontSize: '9px', color: '#9ca3af' }}>{s.unit}</span>
        </div>
      ))}
    </div>
  );
}

function AnomaliesList({ anomalies }) {
  if (!anomalies?.length) return null;
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#8a95a3', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Flagged rows
      </div>
      {anomalies.slice(0, 4).map((a, i) => (
        <div key={i} style={{ fontSize: '10px', color: '#b45309', marginBottom: '2px', fontFamily: 'var(--font-mono)', lineHeight: 1.4 }}>
          {a.timestamp || a.date || `row ${i + 1}`}
          {a.flags?.length ? ` — ${a.flags[0]}` : ''}
        </div>
      ))}
      {anomalies.length > 4 && (
        <div style={{ fontSize: '10px', color: '#9ca3af' }}>+{anomalies.length - 4} more</div>
      )}
    </div>
  );
}

function SignalsList({ signals }) {
  if (!signals?.length) return null;
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#8a95a3', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Signals
      </div>
      {signals.slice(0, 4).map((s, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '10px', marginBottom: '2px' }}>
          <span style={{
            fontWeight: 700, fontSize: '9px', padding: '1px 5px', borderRadius: '3px',
            background: s.type === 'BUY' ? '#dcfce7' : '#fee2e2',
            color:      s.type === 'BUY' ? '#15803d' : '#b91c1c',
          }}>{s.type}</span>
          <span style={{ color: '#6b7280', fontFamily: 'var(--font-mono)' }}>{s.date}</span>
          <span style={{ color: '#374151', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>${s.close}</span>
        </div>
      ))}
      {signals.length > 4 && (
        <div style={{ fontSize: '10px', color: '#9ca3af' }}>+{signals.length - 4} more</div>
      )}
    </div>
  );
}

function SummaryTable({ summary }) {
  if (!summary?.length) return null;
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#8a95a3', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Summary
      </div>
      {summary.map((row, i) => (
        <div key={i} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#374151', fontWeight: 600 }}>
            {row.symbol || row.metric || `row ${i + 1}`}
          </span>
          {row.total_return_pct !== undefined && (
            <span style={{ color: row.total_return_pct >= 0 ? '#16a34a' : '#dc2626', fontFamily: 'var(--font-mono)' }}>
              {row.total_return_pct >= 0 ? '+' : ''}{row.total_return_pct}%
            </span>
          )}
          {row.mean !== undefined && (
            <span style={{ color: '#6b7280', fontFamily: 'var(--font-mono)' }}>
              μ={row.mean} {row.unit}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Generic detail dispatcher ──────────────────────────────────

function DetailPanel({ detail }) {
  const keys = Object.keys(detail || {});
  if (!keys.length) return null;
  return (
    <>
      <div style={divider} />
      {detail.column_stats && <ColumnStatsTable columnStats={detail.column_stats} />}
      {detail.anomalies    && <AnomaliesList   anomalies={detail.anomalies} />}
      {detail.signals      && <SignalsList      signals={detail.signals} />}
      {detail.summary_rows && <SummaryTable     summary={detail.summary_rows} />}
      {detail.summary      && <SummaryTable     summary={detail.summary} />}
      {detail.topic_stats  && <TopicStatsTable  stats={detail.topic_stats} />}
    </>
  );
}

function TopicStatsTable({ stats }) {
  if (!stats || !Object.keys(stats).length) return null;
  return (
    <div style={{ marginTop: '6px' }}>
      <div style={{ fontSize: '10px', fontWeight: 600, color: '#8a95a3', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Per-topic stats
      </div>
      {Object.entries(stats).map(([topic, s]) => (
        <div key={topic} style={{ fontSize: '10px', marginBottom: '3px', display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', color: '#374151', fontWeight: 600, fontSize: '9px' }}>
            {topic.replace('/robot/', '').replace('/', '')}
          </span>
          <span style={{ color: '#6b7280' }}>{s.avg_hz}Hz</span>
          <span style={{ color: s.dropped > 0 ? '#b45309' : '#6b7280' }}>{s.avg_latency_ms}ms</span>
          {s.dropped > 0 && <span style={{ color: '#dc2626' }}>−{s.dropped}</span>}
        </div>
      ))}
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────

function ProgressBar({ pct, eta, desc }) {
  const fmtEta = (s) => {
    if (s == null) return null;
    return s < 60 ? `${s}s` : `${Math.round(s / 60)}m ${Math.round(s % 60)}s`;
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {desc && (
        <div style={{ fontSize: '10px', color: '#8a95a3', marginBottom: '3px', fontWeight: 500 }}>
          {desc}
        </div>
      )}
      <div style={{ height: '4px', background: '#f0f2f5', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct ?? 0}%`,
          background: '#f59e0b',
          borderRadius: '4px',
          transition: 'width 0.2s ease',
        }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginTop: '3px', fontSize: '10px',
        color: '#9ca3af', fontFamily: 'var(--font-mono)',
      }}>
        <span>{pct != null ? `${pct}%` : '—'}</span>
        {fmtEta(eta) && <span>ETA {fmtEta(eta)}</span>}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────

function GenericNode({ id, data, type }) {
  const { label, description, status = 'pending', stats = {}, headline, detail = {}, icon = '', elapsed_ms, progress } = data;
  const [showDetail, setShowDetail] = useState(false);
  const [hovered, setHovered] = useState(false);
  const { runSingleNode } = usePipelineContext();

  const hasLeft    = type !== 'input';
  const hasRight   = type !== 'output';
  const isAnomaly  = type === 'anomaly';
  const hasDetail  = Object.keys(detail).length > 0;

  // Amber header highlight for anomaly nodes with hits
  const alertActive = isAnomaly && (headline?.value > 0 || Number(headline?.value) > 0);

  const statEntries = Object.entries(stats);

  return (
    <div
      style={nodeBase(status)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {hasLeft  && <Handle type="target" position={Position.Left}  />}
      {hasRight && <Handle type="source" position={Position.Right} />}

      {/* ── Header ── */}
      <div style={{
        ...nodeHeader,
        background:   alertActive ? '#fef3c7' : nodeHeader.background,
        borderBottom: `1px solid ${alertActive ? '#fde68a' : '#f0f2f5'}`,
      }}>
        <div style={statusDot(status)} className={status === 'running' ? 'status-dot-pulse' : ''} />
        {icon && (
          <span style={{ fontSize: '12px', lineHeight: 1, marginRight: '4px', flexShrink: 0 }}>
            {icon}
          </span>
        )}
        <span style={labelStyle}>{label}</span>
        {elapsed_ms != null && (
          <span style={{
            marginLeft: '6px', fontSize: '9px', color: '#9ca3af',
            fontFamily: 'var(--font-mono)', flexShrink: 0,
          }}>
            {elapsed_ms}ms
          </span>
        )}
        {/* Run single-node button — visible on hover, top-right of header */}
        {hovered && runSingleNode && status !== 'running' && (
          <button
            onClick={(e) => { e.stopPropagation(); runSingleNode(id); }}
            title="Run this node only"
            style={{
              marginLeft: elapsed_ms != null ? '4px' : 'auto',
              background: 'var(--accent, #2563eb)',
              border: 'none', borderRadius: '4px',
              color: '#fff', cursor: 'pointer',
              fontSize: '9px', fontWeight: 700,
              padding: '2px 6px', lineHeight: 1.4,
              flexShrink: 0,
            }}
          >
            ▶
          </button>
        )}
        {hasDetail && (
          <button
            onClick={() => setShowDetail(v => !v)}
            title={showDetail ? 'Collapse' : 'Expand detail'}
            style={{
              marginLeft: (hovered && runSingleNode) ? '4px' : 'auto',
              background: 'none', border: 'none',
              cursor: 'pointer', padding: '2px', color: '#9ca3af', lineHeight: 1,
              fontSize: '10px', flexShrink: 0,
            }}
          >
            {showDetail ? '▲' : '▼'}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div style={nodeBody}>
        {description && (
          <div style={{ ...descStyle, marginBottom: (progress || headline) ? '8px' : '0' }}>
            <span style={{ fontSize: '11px', color: '#8a95a3' }}>{description}</span>
          </div>
        )}

        {/* tqdm progress bar — only while running */}
        {status === 'running' && progress && (
          <ProgressBar pct={progress.pct} eta={progress.eta} desc={progress.desc} />
        )}

        {/* Headline KPI */}
        {headline && (
          <div style={{ marginBottom: '4px' }}>
            <div style={headlineLabel}>{headline.label}</div>
            <div style={headlineStyle}>
              <span style={{
                ...headlineValue,
                color: alertActive ? '#b45309' : '#1a1f2e',
              }}>
                {headline.value ?? '—'}
              </span>
              <span style={headlineUnit}>{headline.unit}</span>
            </div>
          </div>
        )}

        {/* Stats badges */}
        {statEntries.length > 0 && (
          <div style={{
            ...statGrid,
            gridTemplateColumns: `repeat(${Math.min(statEntries.length, 3)}, 1fr)`,
          }}>
            {statEntries.map(([k, v]) => (
              <div key={k} style={statItem}>
                <span style={statKey}>{k.replace(/_/g, ' ')}</span>
                <span style={statVal}>
                  {typeof v === 'number' ? v.toLocaleString() : (v ?? '—')}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Expandable detail panel */}
        {showDetail && <DetailPanel detail={detail} />}

        <span style={statusBadge(status)}>{STATUS[status]?.label ?? status}</span>
      </div>
    </div>
  );
}

export default memo(GenericNode);
