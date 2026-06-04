import { useEffect, useState, useCallback } from 'react';
import { ReactFlowProvider, useReactFlow } from '@xyflow/react';
import { initStore, useMapStore } from './store/mapStore';
import { MapCanvas } from './components/MapCanvas';
import { Toolbar } from './components/Toolbar';
import { DetailPanel } from './components/DetailPanel';
import { ImportModal } from './components/ImportModal';
import { EditMapModal } from './components/EditMapModal';
import { SettingsModal } from './components/SettingsModal';
import { NodeModal } from './components/NodeModal';
import { EdgeModal } from './components/EdgeModal';

function AppInner() {
  const [searchHighlightId, setSearchHighlightId]   = useState<string | null>(null);
  const [loaded, setLoaded]                          = useState(false);
  const [importOpen, setImportOpen]                  = useState(false);
  const [editOpen, setEditOpen]                      = useState(false);
  const [settingsOpen, setSettingsOpen]              = useState(false);
  const [nodeModalOpen, setNodeModalOpen]            = useState(false);
  const [editNodeId, setEditNodeId]                  = useState<string | null>(null);
  const [edgeModalOpen, setEdgeModalOpen]            = useState(false);
  const [editEdgeId, setEditEdgeId]                  = useState<string | null>(null);
  const [prefillSourceId, setPrefillSourceId]        = useState<string | null>(null);

  const { setCenter, getNode } = useReactFlow();
  const selectNode             = useMapStore((s) => s.selectNode);

  useEffect(() => { initStore().then(() => setLoaded(true)); }, []);

  const handleSearchSelect = useCallback((nodeId: string) => {
    setSearchHighlightId(nodeId);
    selectNode(nodeId);
    setTimeout(() => {
      const node = getNode(nodeId);
      if (node) {
        setCenter(
          node.position.x + (node.measured?.width ?? 150) / 2,
          node.position.y + (node.measured?.height ?? 60) / 2,
          { zoom: 1.4, duration: 600 }
        );
      }
    }, 50);
    setTimeout(() => setSearchHighlightId(null), 3000);
  }, [getNode, setCenter, selectNode]);

  function openAddNode() {
    setEditNodeId(null);
    setNodeModalOpen(true);
  }

  function openEditNode(id: string) {
    setEditNodeId(id);
    setNodeModalOpen(true);
  }

  function openAddEdge(sourceId?: string) {
    setEditEdgeId(null);
    setPrefillSourceId(sourceId ?? null);
    setEdgeModalOpen(true);
  }

  if (!loaded) {
    return (
      <div style={{ width: '100vw', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e1f24', color: '#9ca3af', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 36 }}>⚔️</div>
        <p style={{ margin: 0, fontSize: 14 }}>Loading campaign map…</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <MapCanvas searchHighlightId={searchHighlightId} />

      <Toolbar
        onImport={() => setImportOpen(true)}
        onEditMap={() => setEditOpen(true)}
        onAddNode={openAddNode}
        onSettings={() => setSettingsOpen(true)}
        onSearchSelect={handleSearchSelect}
      />

      <DetailPanel
        onEdit={openEditNode}
        onAddEdge={(sourceId) => openAddEdge(sourceId)}
      />

      <ImportModal  open={importOpen}    onClose={() => setImportOpen(false)} />
      <EditMapModal open={editOpen}      onClose={() => setEditOpen(false)} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <NodeModal
        open={nodeModalOpen}
        onClose={() => setNodeModalOpen(false)}
        editNodeId={editNodeId}
      />
      <EdgeModal
        open={edgeModalOpen}
        onClose={() => setEdgeModalOpen(false)}
        editEdgeId={editEdgeId}
        prefillSourceId={prefillSourceId}
      />
    </div>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <AppInner />
    </ReactFlowProvider>
  );
}
