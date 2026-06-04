import { useState, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import type { MapNode, NodeType } from '../types';

interface NodeModalProps {
  open: boolean;
  onClose: () => void;
  editNodeId?: string | null; // if set, we're editing an existing node
}

const TYPE_OPTIONS: { value: NodeType; label: string; color: string }[] = [
  { value: 'pc',      label: 'Player Character', color: '#2563eb' },
  { value: 'npc',     label: 'NPC',              color: '#7c3aed' },
  { value: 'place',   label: 'Place',            color: '#0d9488' },
  { value: 'faction', label: 'Faction',          color: '#0ea5e9' },
  { value: 'item',    label: 'Item',             color: '#d97706' },
  { value: 'other',   label: 'Other',            color: '#6b7280' },
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function NodeModal({ open, onClose, editNodeId }: NodeModalProps) {
  const nodes      = useMapStore((s) => s.nodes);
  const addNode    = useMapStore((s) => s.addNode);
  const updateNode = useMapStore((s) => s.updateNode);
  const settings   = useMapStore((s) => s.settings);

  const existing = editNodeId ? nodes.find((n) => n.id === editNodeId) : null;

  const [name,    setName]    = useState('');
  const [type,    setType]    = useState<NodeType>('npc');
  const [summary, setSummary] = useState('');
  const [tags,    setTags]    = useState('');
  const [error,   setError]   = useState('');

  // Populate fields when editing
  useEffect(() => {
    if (existing) {
      setName(existing.name);
      setType(existing.type);
      setSummary(existing.summary);
      setTags(existing.tags.join(', '));
    } else {
      setName(''); setType('npc'); setSummary(''); setTags('');
    }
    setError('');
  }, [editNodeId, open]);

  function handleSave() {
    if (!name.trim()) { setError('Name is required.'); return; }

    const tagList = tags.split(',').map((t) => t.trim()).filter(Boolean);

    if (existing) {
      updateNode(existing.id, { name: name.trim(), type, summary: summary.trim(), tags: tagList });
    } else {
      // Find a position near the center of existing nodes
      const cx = nodes.reduce((s, n) => s + n.position.x, 0) / Math.max(nodes.length, 1);
      const cy = nodes.reduce((s, n) => s + n.position.y, 0) / Math.max(nodes.length, 1);
      const newNode: MapNode = {
        id:       slugify(name.trim()) || `node-${Date.now()}`,
        type,
        name:     name.trim(),
        summary:  summary.trim(),
        tags:     tagList,
        position: { x: cx + (Math.random() - 0.5) * 300, y: cy + (Math.random() - 0.5) * 300 },
      };
      // Avoid id collision
      if (nodes.find((n) => n.id === newNode.id)) newNode.id += `-${Date.now()}`;
      addNode(newNode);
    }
    onClose();
  }

  if (!open) return null;

  const modal: React.CSSProperties = {
    background: '#16171c', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, width: '100%', maxWidth: 480,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px',
    color: '#e5e7eb', fontSize: 13.5, outline: 'none',
    fontFamily: "system-ui,'Segoe UI',sans-serif",
  };

  const label: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#6b7280', marginBottom: 6, display: 'block',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
            {existing ? '✏️ Edit Node' : '✚ Add Node'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Name */}
          <div>
            <span style={label}>Name *</span>
            <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Kella Darkhope" autoFocus />
          </div>

          {/* Type */}
          <div>
            <span style={label}>Type *</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {TYPE_OPTIONS.map((opt) => {
                const color = settings.nodeColors[opt.value] ?? opt.color;
                const sel   = type === opt.value;
                return (
                  <button key={opt.value} onClick={() => setType(opt.value)} style={{
                    flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400,
                    background: sel ? `${color}22` : 'rgba(255,255,255,0.04)',
                    border: `1.5px solid ${sel ? color : 'rgba(255,255,255,0.1)'}`,
                    color: sel ? color : '#6b7280', transition: 'all 0.15s',
                  }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div>
            <span style={label}>Summary</span>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: 'vertical', lineHeight: 1.6 }}
              value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="A brief description of this character, place, or faction." />
          </div>

          {/* Tags */}
          <div>
            <span style={label}>Tags <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></span>
            <input style={inputStyle} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="e.g. merchant, bryn shander, zhentarim" />
          </div>

          {error && <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {existing ? 'Save Changes' : 'Add to Map'}
          </button>
        </div>
      </div>
    </div>
  );
}
