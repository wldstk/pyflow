/**
 * FlowEdge.js
 * ───────────
 * Custom ReactFlow edge with 4 style variants and an optional flow-count badge.
 *
 * Edge data fields (set by pipeline_runner.py):
 *   edgeStyle   — "animated" | "dashed" | "solid" | "dotted"
 *   strokeColor — resolved from project theme (animatedEdge or staticEdge)
 *   flowCount   — row/record count from the source node's output (or null)
 */

import React, { memo } from 'react';
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow';

// Per-style stroke properties (strokeDasharray, animation)
const STROKE_CONFIG = {
  animated: {
    strokeDasharray: '6 3',
    style: { animation: 'flowEdgeDash 0.5s linear infinite' },
  },
  dashed: {
    strokeDasharray: '8 5',
    style: {},
  },
  dotted: {
    strokeDasharray: '2 5',
    style: {},
  },
  solid: {
    strokeDasharray: undefined,
    style: {},
  },
};

function FlowEdge({
  id,
  sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition,
  markerEnd,
  data = {},
}) {
  const { edgeStyle = 'solid', strokeColor = '#94a3b8', flowCount } = data;
  const cfg = STROKE_CONFIG[edgeStyle] || STROKE_CONFIG.solid;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  });

  const showBadge = flowCount != null && flowCount > 0;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          stroke: strokeColor,
          strokeWidth: 1.8,
          strokeDasharray: cfg.strokeDasharray,
          fill: 'none',
          ...cfg.style,
        }}
      />

      {showBadge && (
        <EdgeLabelRenderer>
          <div
            style={{
              position:  'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
              background:    strokeColor,
              color:         '#fff',
              fontSize:      '9px',
              fontWeight:    700,
              fontFamily:    'var(--font-mono, monospace)',
              lineHeight:    1,
              padding:       '2px 5px',
              borderRadius:  '8px',
              boxShadow:     '0 1px 3px rgba(0,0,0,0.15)',
              whiteSpace:    'nowrap',
            }}
          >
            {flowCount.toLocaleString()}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(FlowEdge);
