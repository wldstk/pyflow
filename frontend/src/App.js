import React, { useState, useEffect, useCallback } from 'react';
import ReactFlow, {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  addEdge,
} from 'reactflow';
import 'reactflow/dist/style.css';

import nodeTypes       from './nodes';
import FlowEdge        from './edges/FlowEdge';
import { usePipeline } from './hooks/usePipeline';
import { useProjects } from './hooks/useProjects';
import Toolbar         from './components/Toolbar';
import ErrorBanner     from './components/ErrorBanner';

const edgeTypes = { flowEdge: FlowEdge };

const minimapColor = (node) => {
  const s = node.data?.status;
  if (s === 'done')   return '#22c55e';
  if (s === 'active') return '#f59e0b';
  if (s === 'error')  return '#ef4444';
  return '#cbd5e1';
};

function applyTheme(theme) {
  if (!theme) return;
  const r = document.documentElement;
  r.style.setProperty('--accent',         theme.primary);
  r.style.setProperty('--accent-dim',     theme.primaryDim);
  r.style.setProperty('--animated-edge',  theme.animatedEdge);
  r.style.setProperty('--static-edge',    theme.staticEdge);
  r.style.setProperty('--canvas-dot',     theme.canvasDot);
}

export default function App() {
  const { projects } = useProjects();
  const [selectedProject, setSelectedProject] = useState(null);

  // Set default project once loaded
  useEffect(() => {
    if (projects.length && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  // Apply project theme to CSS vars on switch
  useEffect(() => {
    if (!selectedProject || !projects.length) return;
    const proj = projects.find(p => p.id === selectedProject);
    if (proj?.theme) applyTheme(proj.theme);
  }, [selectedProject, projects]);

  const {
    nodes, edges,
    onNodesChange, onEdgesChange,
    loading, error, lastFetch,
    refetch,
  } = usePipeline(selectedProject);

  const backendOk = error ? false : lastFetch ? true : null;

  const onConnect = useCallback(
    (params) => onEdgesChange([{ type: 'add', item: addEdge({ ...params, animated: true }, edges) }]),
    [onEdgesChange, edges]
  );

  const handleProjectChange = (id) => {
    setSelectedProject(id);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Toolbar
        loading={loading}
        backendOk={backendOk}
        lastFetch={lastFetch}
        onRefresh={refetch}
        projects={projects}
        selectedProject={selectedProject}
        onProjectChange={handleProjectChange}
      />

      {error ? (
        <ErrorBanner message={error} onRetry={refetch} />
      ) : (
        <div style={{ flex: 1, background: '#f4f6f8' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            fitViewOptions={{ padding: 0.25 }}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={22}
              size={1}
              color="var(--canvas-dot, #cbd5e1)"
            />
            <Controls />
            <MiniMap
              nodeColor={minimapColor}
              maskColor="rgba(232,237,242,0.7)"
              style={{ background: '#fff', border: '1px solid #e2e6ea', borderRadius: '8px' }}
            />
          </ReactFlow>
        </div>
      )}
    </div>
  );
}
