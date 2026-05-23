import { useState, useCallback, useEffect, useRef } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';

// Returns a new edge with an updated stroke colour (line + arrowhead).
// Saves the original theme colour into data.baseStrokeColor on first call.
function withEdgeColor(edge, color) {
  const base = edge.data?.baseStrokeColor ?? edge.data?.strokeColor ?? color;
  return {
    ...edge,
    markerEnd: edge.markerEnd
      ? { ...edge.markerEnd, color }
      : edge.markerEnd,
    data: { ...edge.data, strokeColor: color, baseStrokeColor: base },
  };
}

export function usePipeline(projectId) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const esRef = useRef(null);
  // Tracks whether pipeline_done was received so onerror isn't misread as a failure
  const completedRef = useRef(false);

  const fetchPipeline = useCallback(() => {
    if (!projectId) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setLoading(true);
    setError(null);
    completedRef.current = false;

    // EventSource must bypass the CRA dev-server proxy: it buffers the entire
    // SSE response and delivers it all at once when the stream closes.
    // Calling the backend directly works because Flask-CORS allows all origins.
    const backendBase = process.env.REACT_APP_BACKEND_URL ?? 'http://localhost:5000';
    const es = new EventSource(`${backendBase}/api/pipeline/stream?project=${projectId}`);
    esRef.current = es;

    es.addEventListener('init', (e) => {
      const { nodes: initNodes, edges: initEdges } = JSON.parse(e.data);
      setNodes(initNodes ?? []);
      // All source nodes start pending → paint every edge gray.
      // Preserve the theme colour in baseStrokeColor so we can restore it later.
      setEdges((initEdges ?? []).map(edge => withEdgeColor(edge, '#94a3b8')));
    });

    es.addEventListener('node_update', (e) => {
      const { node_id, data } = JSON.parse(e.data);
      setNodes((prev) =>
        prev.map((n) => n.id === node_id ? { ...n, data: { ...n.data, ...data } } : n)
      );
      // Sync outgoing edge colours with the source node's new status.
      if (data.status === 'running') {
        setEdges((prev) => prev.map((edge) =>
          edge.source === node_id ? withEdgeColor(edge, '#f59e0b') : edge
        ));
      } else if (data.status === 'done' || data.status === 'error') {
        setEdges((prev) => prev.map((edge) =>
          edge.source === node_id
            ? withEdgeColor(edge, edge.data?.baseStrokeColor ?? edge.data?.strokeColor ?? '#94a3b8')
            : edge
        ));
      }
    });

    es.addEventListener('pipeline_done', (e) => {
      const { edges: finalEdges } = JSON.parse(e.data);
      if (finalEdges) setEdges(finalEdges);
      setLastFetch(new Date());
      setLoading(false);
      completedRef.current = true;
      es.close();
      esRef.current = null;
    });

    es.addEventListener('error', (e) => {
      try {
        const { message } = JSON.parse(e.data);
        setError(message);
      } catch {
        setError('Pipeline execution failed');
      }
      setLoading(false);
      completedRef.current = true;
      es.close();
      esRef.current = null;
    });

    es.onerror = () => {
      // Ignore connection-close events that follow a clean pipeline_done
      if (completedRef.current) return;
      if (esRef.current) {
        setError('Connection to pipeline stream lost');
        setLoading(false);
        es.close();
        esRef.current = null;
      }
    };
  }, [projectId, setNodes, setEdges]);

  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [projectId]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  return {
    nodes, edges,
    onNodesChange, onEdgesChange,
    loading, error, lastFetch,
    refetch: fetchPipeline,
  };
}
