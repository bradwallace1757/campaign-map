import { useRef } from 'react';
import { useMapStore } from '../store/mapStore';
import { SearchBar } from './SearchBar';

interface ToolbarProps {
  onImport: () => void;
  onEditMap: () => void;
  onAddNode: () => void;
  onSettings: () => void;
  onSearchSelect: (nodeId: string) => void;
  plotPanelOpen: boolean;
  onTogglePlotPanel: () => void;
}

const panel: React.CSSProperties = {
  background: 'rgba(30,31,36,0.92)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 12,
  padding: '6px 14px',
  backdropFilter: 'blur(8px)',
  boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const btnBase: React.CSSProperties = {
  fontSize: 13,
  borderRadius: 8,
  padding: '5px 12px',
  cursor: 'pointer',
  fontFamily: "system-ui, 'Segoe UI', sans-serif",
  transition: 'background 0.15s',
  whiteSpace: 'nowrap' as const,
};

const btnPrimary: React.CSSProperties = {
  ...btnBase,
  background: '#4f46e5',
  color: '#fff',
  border: '1px solid rgba(255,255,255,0.15)',
};

const btnSecondary: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(255,255,255,0.07)',
  color: '#d1d5db',
  border: '1px solid rgba(255,255,255,0.1)',
};

const btnGmOn: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(234,179,8,0.15)',
  color: '#fbbf24',
  border: '1px solid rgba(234,179,8,0.35)',
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 700,
};

const btnGmOff: React.CSSProperties = {
  ...btnBase,
  background: 'rgba(255,255,255,0.05)',
  color: '#6b7280',
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '5px 10px',
  fontSize: 12,
};

export function Toolbar({ onImport, onEditMap, onAddNode, onSettings, onSearchSelect, plotPanelOpen, onTogglePlotPanel }: ToolbarProps) {
  const exportJSON   = useMapStore((s) => s.exportJSON);
  const nodes        = useMapStore((s) => s.nodes);
  const edges        = useMapStore((s) => s.edges);
  const gmMode       = useMapStore((s) => s.gmMode);
  const toggleGmMode = useMapStore((s) => s.toggleGmMode);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleExport() {
    const json = exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'campaign-map.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        useMapStore.getState().loadData(data.nodes, data.edges);
      } catch {
        alert('Could not read that file — make sure it is a valid campaign map JSON.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  return (
    <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-4 z-40 pointer-events-none">

      {/* Left — title + node/edge count + plots toggle */}
      <div className="pointer-events-auto" style={panel}>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#f3f4f6' }}>⚔️ Campaign Map</span>
        <span style={{ fontSize: 11, color: '#4b5563' }}>|</span>
        <span style={{ fontSize: 11, color: '#6b7280' }}>
          {nodes.length} nodes · {edges.length} connections
        </span>
        <span style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.1)', display: 'inline-block', margin: '0 2px' }} />
        <button
          style={{
            ...btnBase,
            background: plotPanelOpen ? 'rgba(79,70,229,0.18)' : 'rgba(255,255,255,0.06)',
            color: plotPanelOpen ? '#818cf8' : '#9ca3af',
            border: `1px solid ${plotPanelOpen ? 'rgba(79,70,229,0.4)' : 'rgba(255,255,255,0.1)'}`,
            padding: '4px 10px',
            fontSize: 12,
          }}
          onClick={onTogglePlotPanel}
          title="Toggle plot threads panel"
        >
          📜 Plots
        </button>
      </div>

      {/* Center — search */}
      <div className="pointer-events-auto">
        <SearchBar onSelectResult={onSearchSelect} />
      </div>

      {/* Right — GM actions + mode toggle */}
      <div className="pointer-events-auto flex items-center gap-2">
        {gmMode && (
          <>
            <button style={btnPrimary} onClick={onImport}>✨ Import</button>
            <button style={btnSecondary} onClick={onEditMap}>🛠 Edit Map</button>
            <button style={btnSecondary} onClick={onAddNode}>+ Add</button>
            <button style={btnSecondary} onClick={handleExport}>↓ Export</button>
            <label style={{ ...btnSecondary, display: 'inline-block' }}>
              ↑ Load
              <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
            </label>
            <button style={{ ...btnSecondary, padding: '5px 8px' }} onClick={onSettings}>⚙️</button>
            <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          </>
        )}

        {/* GM mode toggle — always visible */}
        <button style={gmMode ? btnGmOn : btnGmOff} onClick={toggleGmMode} title={gmMode ? 'Switch to player view' : 'Enter GM mode'}>
          {gmMode ? '🔓 GM' : '🔒 GM'}
        </button>
      </div>
    </div>
  );
}
