import { useState, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';
import type { PlotThread, PlotStatus, PlotPriority } from '../types';

interface PlotThreadModalProps {
  open: boolean;
  onClose: () => void;
  editPlotId?: string | null;
}

const STATUS_OPTIONS: { value: PlotStatus; label: string; color: string }[] = [
  { value: 'active',   label: 'Active',   color: '#ef4444' },
  { value: 'dormant',  label: 'Dormant',  color: '#f59e0b' },
  { value: 'resolved', label: 'Resolved', color: '#22c55e' },
];

const PRIORITY_OPTIONS: { value: PlotPriority; label: string; color: string }[] = [
  { value: 'high',   label: 'High',   color: '#ef4444' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'low',    label: 'Low',    color: '#3b82f6' },
];

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function PlotThreadModal({ open, onClose, editPlotId }: PlotThreadModalProps) {
  const plots     = useMapStore((s) => s.plots);
  const nodes     = useMapStore((s) => s.nodes);
  const addPlot   = useMapStore((s) => s.addPlot);
  const updatePlot = useMapStore((s) => s.updatePlot);

  const existing = editPlotId ? plots.find((p) => p.id === editPlotId) : null;

  const [title,          setTitle]          = useState('');
  const [summary,        setSummary]        = useState('');
  const [status,         setStatus]         = useState<PlotStatus>('active');
  const [priority,       setPriority]       = useState<PlotPriority | undefined>(undefined);
  const [hidden,         setHidden]         = useState(false);
  const [session,        setSession]        = useState('');
  const [relatedNodeIds, setRelatedNodeIds] = useState<string[]>([]);
  const [error,          setError]          = useState('');

  useEffect(() => {
    if (existing) {
      setTitle(existing.title);
      setSummary(existing.summary);
      setStatus(existing.status);
      setPriority(existing.priority);
      setHidden(!!existing.hidden);
      setSession(existing.session != null ? String(existing.session) : '');
      setRelatedNodeIds(existing.relatedNodeIds);
    } else {
      setTitle(''); setSummary(''); setStatus('active'); setPriority(undefined); setHidden(false); setSession(''); setRelatedNodeIds([]);
    }
    setError('');
  }, [editPlotId, open]);

  function toggleNode(id: string) {
    setRelatedNodeIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function handleSave() {
    if (!title.trim()) { setError('Title is required.'); return; }

    const sessionNum = session.trim() ? parseInt(session.trim(), 10) : undefined;
    const plot: PlotThread = {
      id:             existing?.id ?? (slugify(title.trim()) || `plot-${Date.now()}`),
      title:          title.trim(),
      summary:        summary.trim(),
      status,
      priority,
      hidden:         hidden || undefined,
      relatedNodeIds,
      session:        sessionNum,
    };

    if (existing) {
      updatePlot(existing.id, plot);
    } else {
      // Avoid id collision
      const allIds = new Set(plots.map((p) => p.id));
      if (allIds.has(plot.id)) plot.id += `-${Date.now()}`;
      addPlot(plot);
    }
    onClose();
  }

  if (!open) return null;

  const modal: React.CSSProperties = {
    background: '#16171c', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16, width: '100%', maxWidth: 520,
    display: 'flex', flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)', overflow: 'hidden',
    maxHeight: '90vh',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8, padding: '8px 12px',
    color: '#e5e7eb', fontSize: 13.5, outline: 'none',
    fontFamily: "system-ui,'Segoe UI',sans-serif",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#6b7280', marginBottom: 6, display: 'block',
  };

  // Group nodes by type for the picker
  const nodesByType = nodes.reduce<Record<string, typeof nodes>>((acc, n) => {
    (acc[n.type] ??= []).push(n);
    return acc;
  }, {});

  const TYPE_LABELS: Record<string, string> = {
    pc: 'PCs', npc: 'NPCs', place: 'Places', faction: 'Factions', item: 'Items', other: 'Other',
  };
  const TYPE_COLORS: Record<string, string> = {
    pc: '#2563eb', npc: '#7c3aed', place: '#0d9488', faction: '#0ea5e9', item: '#d97706', other: '#6b7280',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
            {existing ? '✏️ Edit Plot Thread' : '✚ Add Plot Thread'}
          </h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Title */}
          <div>
            <span style={labelStyle}>Title *</span>
            <input style={inputStyle} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Raven Queen's Order" autoFocus />
          </div>

          {/* Status + Session row */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <span style={labelStyle}>Status</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {STATUS_OPTIONS.map((opt) => {
                  const sel = status === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setStatus(opt.value)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400,
                      background: sel ? `${opt.color}22` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${sel ? opt.color : 'rgba(255,255,255,0.1)'}`,
                      color: sel ? opt.color : '#6b7280', transition: 'all 0.15s',
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <span style={labelStyle}>Session #</span>
              <input style={inputStyle} type="number" min={1} value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. 1" />
            </div>
          </div>

          {/* Priority + Hidden row */}
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 2 }}>
              <span style={labelStyle}>Priority</span>
              <div style={{ display: 'flex', gap: 8 }}>
                {PRIORITY_OPTIONS.map((opt) => {
                  const sel = priority === opt.value;
                  return (
                    <button key={opt.value} onClick={() => setPriority(sel ? undefined : opt.value)} style={{
                      flex: 1, padding: '7px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: sel ? 700 : 400,
                      background: sel ? `${opt.color}22` : 'rgba(255,255,255,0.04)',
                      border: `1.5px solid ${sel ? opt.color : 'rgba(255,255,255,0.1)'}`,
                      color: sel ? opt.color : '#6b7280', transition: 'all 0.15s',
                      fontFamily: "system-ui,'Segoe UI',sans-serif",
                    }}>
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <span style={labelStyle}>Visibility</span>
              <button
                onClick={() => setHidden((v) => !v)}
                style={{
                  flex: 1, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: hidden ? 700 : 400,
                  background: hidden ? 'rgba(234,179,8,0.12)' : 'rgba(255,255,255,0.04)',
                  border: `1.5px solid ${hidden ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.1)'}`,
                  color: hidden ? '#fbbf24' : '#6b7280', transition: 'all 0.15s',
                  fontFamily: "system-ui,'Segoe UI',sans-serif",
                }}
              >
                {hidden ? '🔒 GM only' : '👁 Visible'}
              </button>
            </div>
          </div>

          {/* Summary */}
          <div>
            <span style={labelStyle}>Summary</span>
            <textarea style={{ ...inputStyle, minHeight: 80, resize: 'vertical', lineHeight: 1.6 }}
              value={summary} onChange={(e) => setSummary(e.target.value)}
              placeholder="Describe this plot thread — what's at stake, who's involved, what happens next." />
          </div>

          {/* Related nodes */}
          <div>
            <span style={labelStyle}>Related Nodes <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(click to toggle)</span></span>
            {nodes.length === 0 && (
              <p style={{ margin: 0, fontSize: 13, color: '#4b5563' }}>No nodes on the map yet.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(nodesByType).map(([type, typeNodes]) => (
                <div key={type}>
                  <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: TYPE_COLORS[type] ?? '#6b7280', marginBottom: 5 }}>
                    {TYPE_LABELS[type] ?? type}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {typeNodes.map((n) => {
                      const sel = relatedNodeIds.includes(n.id);
                      const col = TYPE_COLORS[type] ?? '#6b7280';
                      return (
                        <button key={n.id} onClick={() => toggleNode(n.id)} style={{
                          padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontSize: 12,
                          background: sel ? `${col}22` : 'rgba(255,255,255,0.04)',
                          border: `1.5px solid ${sel ? col : 'rgba(255,255,255,0.1)'}`,
                          color: sel ? col : '#9ca3af', transition: 'all 0.15s',
                          fontFamily: "system-ui,'Segoe UI',sans-serif",
                        }}>
                          {n.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <p style={{ margin: 0, color: '#f87171', fontSize: 13 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10, flexShrink: 0 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {existing ? 'Save Changes' : 'Add Thread'}
          </button>
        </div>
      </div>
    </div>
  );
}
