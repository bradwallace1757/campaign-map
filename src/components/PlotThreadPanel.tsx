import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import type { PlotPriority, PlotStatus, PlotThread } from '../types';

const STATUS_META: Record<PlotStatus, { label: string; color: string; dot: string }> = {
  active:   { label: 'Active',   color: '#ef4444', dot: '#ef4444' },
  dormant:  { label: 'Dormant',  color: '#f59e0b', dot: '#f59e0b' },
  resolved: { label: 'Resolved', color: '#22c55e', dot: '#22c55e' },
};

const STATUS_ORDER: PlotStatus[] = ['active', 'dormant', 'resolved'];

const PRIORITY_META: Record<PlotPriority, { label: string; color: string }> = {
  high:   { label: 'High',   color: '#ef4444' },
  medium: { label: 'Medium', color: '#f59e0b' },
  low:    { label: 'Low',    color: '#3b82f6' },
};

interface PlotThreadPanelProps {
  open: boolean;
  onAddPlot: () => void;
  onEditPlot: (id: string) => void;
  onJumpToNode: (nodeId: string) => void;
}

export function PlotThreadPanel({ open, onAddPlot, onEditPlot, onJumpToNode }: PlotThreadPanelProps) {
  const plots      = useMapStore((s) => s.plots);
  const nodes      = useMapStore((s) => s.nodes);
  const deletePlot = useMapStore((s) => s.deletePlot);
  const updatePlot = useMapStore((s) => s.updatePlot);
  const gmMode     = useMapStore((s) => s.gmMode);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter]         = useState<PlotStatus | 'all'>('all');

  // In player mode, hide GM-only threads
  const visiblePlots = gmMode ? plots : plots.filter((p) => !p.hidden);

  const PRIORITY_ORDER: Array<PlotPriority | undefined> = ['high', 'medium', 'low', undefined];
  const sorted = [...visiblePlots].sort((a, b) => {
    const ai = STATUS_ORDER.indexOf(a.status);
    const bi = STATUS_ORDER.indexOf(b.status);
    if (ai !== bi) return ai - bi;
    const pi = PRIORITY_ORDER.indexOf(a.priority);
    const pj = PRIORITY_ORDER.indexOf(b.priority);
    return pi !== pj ? pi - pj : a.title.localeCompare(b.title);
  });

  const visible = filter === 'all' ? sorted : sorted.filter((p) => p.status === filter);

  const counts = {
    active:   visiblePlots.filter((p) => p.status === 'active').length,
    dormant:  visiblePlots.filter((p) => p.status === 'dormant').length,
    resolved: visiblePlots.filter((p) => p.status === 'resolved').length,
  };

  function handleDelete(p: PlotThread) {
    if (confirm(`Delete plot thread "${p.title}"?`)) {
      if (expandedId === p.id) setExpandedId(null);
      deletePlot(p.id);
    }
  }

  const TYPE_COLORS: Record<string, string> = {
    pc: '#2563eb', npc: '#7c3aed', place: '#0d9488', faction: '#0ea5e9', item: '#d97706', other: '#6b7280',
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: 320,
      zIndex: 50,
      transform: open ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
      background: '#16171c',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      boxShadow: '8px 0 32px rgba(0,0,0,0.4)',
    }}>
      {/* Header */}
      <div style={{ padding: '20px 20px 14px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f3f4f6' }}>📜 Plot Threads</h2>
          {gmMode && (
            <button
              onClick={onAddPlot}
              style={{
                padding: '5px 12px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.35)',
                color: '#818cf8', fontFamily: "system-ui,'Segoe UI',sans-serif",
              }}
            >
              + Add
            </button>
          )}
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'dormant', 'resolved'] as const).map((f) => {
            const sel = filter === f;
            const meta = f !== 'all' ? STATUS_META[f] : null;
            const count = f === 'all' ? visiblePlots.length : counts[f];
            return (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '5px 4px', borderRadius: 7, cursor: 'pointer', fontSize: 11, fontWeight: sel ? 700 : 400,
                background: sel ? (meta ? `${meta.color}22` : 'rgba(255,255,255,0.1)') : 'rgba(255,255,255,0.04)',
                border: `1.5px solid ${sel ? (meta?.color ?? 'rgba(255,255,255,0.25)') : 'rgba(255,255,255,0.08)'}`,
                color: sel ? (meta?.color ?? '#e5e7eb') : '#6b7280',
                transition: 'all 0.15s', fontFamily: "system-ui,'Segoe UI',sans-serif",
              }}>
                {f === 'all' ? 'All' : STATUS_META[f].label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px' }}>
        {visible.length === 0 && (
          <p style={{ margin: '20px 8px 0', fontSize: 13, color: '#4b5563', textAlign: 'center' }}>
            {visiblePlots.length === 0 ? 'No plot threads yet.' : 'No threads match this filter.'}
          </p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map((p) => {
            const meta     = STATUS_META[p.status];
            const expanded = expandedId === p.id;
            const relNodes = p.relatedNodeIds
              .map((id) => nodes.find((n) => n.id === id))
              .filter(Boolean) as typeof nodes;

            return (
              <div key={p.id} style={{
                background: 'rgba(255,255,255,0.03)',
                border: `1px solid ${expanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
                borderRadius: 10,
                overflow: 'hidden',
                transition: 'border-color 0.15s',
              }}>
                {/* Row header — click to expand */}
                <button
                  onClick={() => setExpandedId(expanded ? null : p.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 12px', background: 'transparent', border: 'none',
                    cursor: 'pointer', textAlign: 'left',
                    fontFamily: "system-ui,'Segoe UI',sans-serif",
                  }}
                >
                  {/* Status dot */}
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                    backgroundColor: meta.dot,
                    boxShadow: `0 0 6px ${meta.dot}88`,
                  }} />

                  {/* Title */}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: p.hidden ? '#6b7280' : '#e5e7eb', lineHeight: 1.3 }}>
                    {p.title}
                  </span>

                  {/* Priority badge */}
                  {p.priority && PRIORITY_META[p.priority] && (
                    <span style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.07em',
                      textTransform: 'uppercase', flexShrink: 0,
                      color: PRIORITY_META[p.priority]!.color, padding: '2px 6px', borderRadius: 20,
                      background: `${PRIORITY_META[p.priority]!.color}18`,
                      border: `1px solid ${PRIORITY_META[p.priority]!.color}44`,
                    }}>{PRIORITY_META[p.priority]!.label}</span>
                  )}

                  {/* GM hidden indicator */}
                  {gmMode && p.hidden && (
                    <span style={{ fontSize: 10, color: '#eab308', flexShrink: 0 }}>🔒</span>
                  )}

                  {/* Session badge */}
                  {p.session != null && (
                    <span style={{ fontSize: 10, color: '#6b7280', flexShrink: 0 }}>S{p.session}</span>
                  )}

                  {/* Expand chevron */}
                  <span style={{ fontSize: 11, color: '#4b5563', flexShrink: 0, transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▾</span>
                </button>

                {/* Expanded body */}
                {expanded && (
                  <div style={{ padding: '0 12px 12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    {/* Status badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 0 10px' }}>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                        textTransform: 'uppercase', color: meta.color,
                        padding: '2px 8px', borderRadius: 20,
                        background: `${meta.color}18`,
                        border: `1px solid ${meta.color}44`,
                      }}>
                        {meta.label}
                      </span>
                      {p.session != null && (
                        <span style={{ fontSize: 10, color: '#6b7280' }}>Session {p.session}</span>
                      )}
                    </div>

                    {/* Summary */}
                    {p.summary && (
                      <p style={{ margin: '0 0 12px', fontSize: 13, color: '#9ca3af', lineHeight: 1.65 }}>
                        {p.summary}
                      </p>
                    )}

                    {/* Related nodes */}
                    {relNodes.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#4b5563', marginBottom: 6 }}>
                          Involves
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {relNodes.map((n) => {
                            const col = TYPE_COLORS[n.type] ?? '#6b7280';
                            return (
                              <button key={n.id} onClick={() => onJumpToNode(n.id)} style={{
                                padding: '3px 9px', borderRadius: 20, cursor: 'pointer', fontSize: 11,
                                background: `${col}18`,
                                border: `1px solid ${col}44`,
                                color: col, transition: 'background 0.15s',
                                fontFamily: "system-ui,'Segoe UI',sans-serif",
                              }}
                              onMouseEnter={(e) => (e.currentTarget.style.background = `${col}30`)}
                              onMouseLeave={(e) => (e.currentTarget.style.background = `${col}18`)}
                              >
                                {n.name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* GM actions */}
                    {gmMode && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <button
                          onClick={() => updatePlot(p.id, { hidden: !p.hidden })}
                          style={{
                            width: '100%', padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                            background: p.hidden ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${p.hidden ? 'rgba(234,179,8,0.3)' : 'rgba(255,255,255,0.08)'}`,
                            color: p.hidden ? '#fbbf24' : '#6b7280',
                            fontFamily: "system-ui,'Segoe UI',sans-serif",
                          }}
                        >
                          {p.hidden ? '🔒 Hidden from players' : '👁 Visible to players'}
                        </button>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => onEditPlot(p.id)} style={{
                            flex: 1, padding: '6px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                            background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#d1d5db', fontFamily: "system-ui,'Segoe UI',sans-serif",
                          }}>
                            ✏️ Edit
                          </button>
                          <button onClick={() => handleDelete(p)} style={{
                            padding: '6px 12px', borderRadius: 7, cursor: 'pointer', fontSize: 12,
                            background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.2)',
                            color: '#f87171', fontFamily: "system-ui,'Segoe UI',sans-serif",
                          }}>
                            🗑
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
