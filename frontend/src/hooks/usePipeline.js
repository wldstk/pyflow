import { useState, useCallback, useEffect } from 'react';
import { useNodesState, useEdgesState } from 'reactflow';

export function usePipeline(projectId) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [lastFetch, setLastFetch] = useState(null);

  const fetchPipeline = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/pipeline?project=${projectId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        const raw = await res.text();
        throw new Error(`Non-JSON response: ${raw.slice(0, 120)}`);
      }
      const data = await res.json();
      setNodes(data.nodes ?? []);
      setEdges(data.edges ?? []);
      setLastFetch(new Date());
    } catch (err) {
      console.error('[usePipeline]', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [projectId, setNodes, setEdges]);

  useEffect(() => { fetchPipeline(); }, [fetchPipeline]);

  return {
    nodes, edges,
    onNodesChange, onEdgesChange,
    loading, error, lastFetch,
    refetch: fetchPipeline,
  };
}
