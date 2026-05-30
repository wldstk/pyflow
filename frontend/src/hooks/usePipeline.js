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

export function usePipeline(projectId, autoRun = true) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [hasGraph, setHasGraph]   = useState(false); // true once any graph was loaded
  const esRef        = useRef(null);
  const completedRef = useRef(false);

  const fetchPipeline = useCallback((fromNodeId = null, onlyNodeId = null) => {
    if (!projectId) return;

    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    setLoading(true);
    setError(null);
    completedRef.current = false;

    const backendBase = process.env.REACT_APP_BACKEND_URL ?? 'http://localhost:5000';
    const params = new URLSearchParams({ project: projectId });
    if (fromNodeId)  params.set('from_node',  fromNodeId);
    if (onlyNodeId)  params.set('only_node',  onlyNodeId);
    const url = `${backendBase}/api/pipeline/stream?${params}`;

    const es = new EventSource(url);
    esRef.current = es;

    es.addEventListener('init', (e) => {
      const { nodes: initNodes, edges: initEdges, partial } = JSON.parse(e.data);

      if (partial) {
        // Partial run: only reset the nodes that are being re-executed.
        const updateMap = new Map((initNodes ?? []).map(n => [n.id, n]));
        setNodes(prev => prev.map(n => updateMap.has(n.id) ? updateMap.get(n.id) : n));
      } else {
        setNodes(initNodes ?? []);
        setHasGraph(true);
      }

      // Gray out edges for nodes being (re-)run; keep others as-is for partial.
      const activeIds = new Set((initNodes ?? []).map(n => n.id));
      setEdges(prev =>
        (partial ? prev : (initEdges ?? [])).map(edge =>
          activeIds.has(edge.source)
            ? withEdgeColor(edge, '#94a3b8')
            : edge
        )
      );
      if (!partial && initEdges) {
        setEdges((initEdges).map(e => withEdgeColor(e, '#94a3b8')));
      }
    });

    es.addEventListener('node_progress', (e) => {
      const { node_id, data } = JSON.parse(e.data);
      setNodes(prev =>
        prev.map(n => n.id === node_id ? { ...n, data: { ...n.data, progress: data } } : n)
      );
    });

    es.addEventListener('node_update', (e) => {
      const { node_id, data } = JSON.parse(e.data);
      const patch = (data.status === 'done' || data.status === 'error')
        ? { ...data, progress: null }
        : data;
      setNodes(prev =>
        prev.map(n => n.id === node_id ? { ...n, data: { ...n.data, ...patch } } : n)
      );
      if (data.status === 'running') {
        setEdges(prev => prev.map(edge =>
          edge.source === node_id ? withEdgeColor(edge, '#f59e0b') : edge
        ));
      } else if (data.status === 'done' || data.status === 'error') {
        setEdges(prev => prev.map(edge =>
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
      setHasGraph(true);
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
      if (completedRef.current) return;
      if (esRef.current) {
        setError('Connection to pipeline stream lost');
        setLoading(false);
        es.close();
        esRef.current = null;
      }
    };
  }, [projectId, setNodes, setEdges]);

  // Load the static graph (pending nodes, no execution) for projects with auto_run off.
  const loadGraph = useCallback(async () => {
    if (!projectId) return;
    setError(null);
    try {
      const backendBase = process.env.REACT_APP_BACKEND_URL ?? 'http://localhost:5000';
      const res = await fetch(`${backendBase}/api/pipeline/graph?project=${projectId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const { nodes: initNodes, edges: initEdges } = await res.json();
      setNodes(initNodes ?? []);
      setEdges((initEdges ?? []).map(e => withEdgeColor(e, '#94a3b8')));
      setHasGraph(true);
    } catch (err) {
      setError(err.message);
    }
  }, [projectId, setNodes, setEdges]);

  // Auto-run or just load static graph on project change.
  useEffect(() => {
    if (!projectId) return;
    setHasGraph(false);
    if (autoRun) {
      fetchPipeline();
    } else {
      loadGraph();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, autoRun]);

  // Cleanup on unmount / project switch.
  useEffect(() => {
    return () => {
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [projectId]);

  const runFromNode   = useCallback((nodeId) => fetchPipeline(nodeId, null), [fetchPipeline]);
  const runSingleNode = useCallback((nodeId) => fetchPipeline(null, nodeId), [fetchPipeline]);

  return {
    nodes, edges,
    onNodesChange, onEdgesChange,
    loading, error, lastFetch, hasGraph,
    refetch: () => fetchPipeline(null, null),
    runFromNode,
    runSingleNode,
  };
}
