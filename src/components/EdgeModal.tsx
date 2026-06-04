import { useState, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import type { MapEdge, EdgeType } from '../types';

interface EdgeModalProps {
  open: boolean;
  onClose: () => void;
  editEdgeId?: string | null;
  prefillSourceId?: string | null; // pre-select source when opened from detail panel
}

const EDGE_TYPES: { value: EdgeType; label: string }[] = [
  { value: 'allied',    label: 'Allied' },
  { value: 'enemy',     label: 'Enemy' },
  { value: 'seeks',     label: 'Seeks' },
  { value: 'knows',     label: 'Knows' },
  { value: 'member',    label: 'Member of' },
  { value: 'loves',     label: 'Loves' },
  { value: 'distrusts', label: 'Distrusts' },
  { value: 'serves',    label: 'Serves' },
  { value: 'other',     label: 'Other' },
];

export function EdgeModal({ open, onClose, editEdgeId, prefillSourceId }: EdgeModalProps) {
  const nodes   = useMapStore((s) => s.nodes);
  const edges   = useMapStore((s) => s.edges);
  const addEdge = useMapStore((s) => s.addEdge);
  const updateEdge = useMapStore((s) => s.updateEdge);

  const existing = editEdgeId ? edges.find((e) => e.id === editEdgeId) : null;

  const [sourceId, setSourceId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [label,    setLabel]    = useState('');
  const [type,     setType]     = useState<EdgeType>('knows');
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (existing) {
      setSourceId(existing.source);
      setTargetId(existing.target);
      setLabel(existing.label);
      setType(existing.type);
    } else {
      setSourceId(prefillSourceId ?? '');
      setTargetId('');
      setLabel('');
      setType('knows');
    }
    setError('');
  }, [editEdgeId, prefillSourceId, open]);

  function handleSave() {
    if (!sourceId) { setError('Select a source node.'); return; }
    if (!targetId) { setError('Select a target node.'); return; }
    if (sourceId === targetId) { setError('Source and target must be different nodes.'); return; }
    if (!label.trim()) { setError('Relationship label is required.'); return; }

    if (existing) {
      updateEdge(existing.id, { source: sourceId, target: targetId, label: label.trim(), type });
    } else {
      const newEdge: MapEdge = {
        id:     `e-${sourceId}-${targetId}-${Date.now()}`,
        source: sourceId, target: targetId,
        label:  label.trim(), type,
      };
      addEdge(newEdge);
    }
    onClose();
  }

  if (!open) return null;

  const modal: React.CSSProperties = {
    background: '#16171c', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, width: '100%', maxWidth: 460,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
  };

  const selectStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: '#0f1015',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, padding: '8px 12px',
    color: '#e5e7eb', fontSize: 13.5, outline: 'none',
    fontFamily: "system-ui,'Segoe UI',sans-serif",
    cursor: 'pointer',
  };

  const inputStyle = { ...selectStyle };

  const label2: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#6b7280', marginBottom: 6, display: 'block',
  };

  const sortedNodes = [...nodes].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
            {existing ? '✏️ Edit Connection' : '🔗 Add Connection'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Source → Target */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <span style={label2}>From</span>
              <select style={selectStyle} value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
                <option value="">Select node…</option>
                {sortedNodes.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
            <div style={{ color: '#4b5563', fontSize: 20, paddingBottom: 8 }}>→</div>
            <div style={{ flex: 1 }}>
              <span style={label2}>To</span>
              <select style={selectStyle} value={targetId} onChange={(e) => setTargetId(e.target.value)}>
                <option value="">Select node…</option>
                {sortedNodes.filter((n) => n.id !== sourceId).map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
              </select>
            </div>
          </div>

          {/* Label */}
          <div>
            <span style={label2}>Relationship label *</span>
            <input style={inputStyle} value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. allied with, seeks to kill, member of…" />
          </div>

          {/* Type */}
          <div>
            <span style={label2}>Type</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {EDGE_TYPES.map((opt) => {
                const sel = type === opt.value;
                return (
                  <button key={opt.value} onClick={() => setType(opt.value)} style={{
                    padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                    background: sel ? 'rgba(79,70,229,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${sel ? '#4f46e5' : 'rgba(255,255,255,0.1)'}`,
                    color: sel ? '#818cf8' : '#6b7280', transition: 'all 0.15s',
                  }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {existing ? 'Save Changes' : 'Add Connection'}
          </button>
        </div>
      </div>
    </div>
  );
}
