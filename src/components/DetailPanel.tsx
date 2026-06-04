import { useMapStore } from '../store/mapStore';
import type { NodeType } from '../types';

const TYPE_LABELS: Record<NodeType, string> = {
  pc:      'Player Character',
  npc:     'NPC',
  place:   'Place',
  faction: 'Faction',
  item:    'Item',
  other:   'Other',
};

const TYPE_COLORS: Record<NodeType, string> = {
  pc:      '#2563eb',
  npc:     '#7c3aed',
  place:   '#0d9488',
  faction: '#0ea5e9',
  item:    '#d97706',
  other:   '#6b7280',
};

interface DetailPanelProps {
  onEdit: (nodeId: string) => void;
  onAddEdge: (sourceId: string) => void;
}

export function DetailPanel({ onEdit, onAddEdge }: DetailPanelProps) {
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const nodes          = useMapStore((s) => s.nodes);
  const edges          = useMapStore((s) => s.edges);
  const selectNode     = useMapStore((s) => s.selectNode);
  const deleteNode     = useMapStore((s) => s.deleteNode);
  const settings       = useMapStore((s) => s.settings);
  const gmMode         = useMapStore((s) => s.gmMode);

  const node = nodes.find((n) => n.id === selectedNodeId);
  const visible = !!node;

  // Build relationship list for this node
  const relationships = node
    ? edges
        .filter((e) => e.source === node.id || e.target === node.id)
        .map((e) => {
          const isSource   = e.source === node.id;
          const otherId    = isSource ? e.target : e.source;
          const otherNode  = nodes.find((n) => n.id === otherId);
          return {
            edgeId:    e.id,
            label:     e.label,
            type:      e.type,
            direction: isSource ? 'out' : 'in',
            otherId,
            otherName: otherNode?.name ?? otherId,
            otherType: otherNode?.type,
          };
        })
    : [];

  function handleJump(nodeId: string) {
    selectNode(nodeId);
  }

  function handleDelete() {
    if (!node) return;
    if (confirm(`Delete "${node.name}"? This will also remove all its connections.`)) {
      deleteNode(node.id);
    }
  }

  const accentColor = node ? (settings.nodeColors[node.type] ?? TYPE_COLORS[node.type]) : '#6b7280';

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        onClick={() => selectNode(null)}
        style={{
          position: 'fixed', inset: 0, zIndex: 45,
          pointerEvents: visible ? 'auto' : 'none',
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.2s',
          background: 'rgba(0,0,0,0.15)',
        }}
      />

      {/* Panel */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 340,
          zIndex: 50,
          transform: visible ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4,0,0.2,1)',
          background: '#16171c',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
        }}
      >
        {node && (
          <>
            {/* Header */}
            <div style={{ borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '20px 20px 16px' }}>
              {/* Close button */}
              <button
                onClick={() => selectNode(null)}
                style={{
                  position: 'absolute', top: 14, right: 14,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 6, color: '#9ca3af',
                  width: 28, height: 28, cursor: 'pointer',
                  fontSize: 16, lineHeight: '1', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                }}
              >×</button>

              {/* Color dot + type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{
                  width: 12, height: 12, borderRadius: '50%',
                  backgroundColor: accentColor, flexShrink: 0,
                  boxShadow: `0 0 8px ${accentColor}88`,
                }} />
                <span style={{
                  fontSize: 11, fontWeight: 600, letterSpacing: '0.08em',
                  textTransform: 'uppercase', color: accentColor,
                }}>
                  {TYPE_LABELS[node.type]}
                </span>
              </div>

              {/* Name */}
              <h2 style={{
                margin: 0, fontSize: 20, fontWeight: 700,
                color: '#f3f4f6', lineHeight: 1.3, paddingRight: 32,
              }}>
                {node.name}
              </h2>

              {/* Tags */}
              {node.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                  {node.tags.map((tag) => (
                    <span key={tag} style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 20,
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#9ca3af',
                    }}>{tag}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Scrollable body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>

              {/* Summary */}
              {node.summary && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 8 }}>
                    Summary
                  </div>
                  <p style={{ margin: 0, fontSize: 13.5, color: '#d1d5db', lineHeight: 1.65 }}>
                    {node.summary}
                  </p>
                </div>
              )}

              {/* Relationships */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 10 }}>
                  Connections ({relationships.length})
                </div>

                {relationships.length === 0 && (
                  <p style={{ fontSize: 13, color: '#4b5563', margin: 0 }}>No connections yet.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {relationships.map((rel) => {
                    const otherColor = rel.otherType
                      ? (settings.nodeColors[rel.otherType] ?? TYPE_COLORS[rel.otherType])
                      : '#6b7280';
                    return (
                      <button
                        key={rel.edgeId}
                        onClick={() => handleJump(rel.otherId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.07)',
                          borderRadius: 8, padding: '8px 10px',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.15s',
                          width: '100%',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.09)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                      >
                        {/* Direction arrow */}
                        <span style={{ fontSize: 12, color: '#4b5563', flexShrink: 0 }}>
                          {rel.direction === 'out' ? '→' : '←'}
                        </span>

                        {/* Relationship label */}
                        <span style={{ fontSize: 11, color: '#6b7280', flexShrink: 0, fontStyle: 'italic' }}>
                          {rel.label}
                        </span>

                        {/* Other node name */}
                        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
                          <span style={{
                            width: 8, height: 8, borderRadius: '50%',
                            backgroundColor: otherColor, flexShrink: 0,
                          }} />
                          <span style={{ fontSize: 13, fontWeight: 500, color: '#e5e7eb' }}>
                            {rel.otherName}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer actions — GM only */}
            {gmMode && (
              <div style={{
                padding: '12px 20px',
                borderTop: '1px solid rgba(255,255,255,0.07)',
                display: 'flex', gap: 8,
              }}>
                <button
                  onClick={() => onEdit(node.id)}
                  style={{
                    flex: 1, padding: '8px 0', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(255,255,255,0.07)',
                    border: '1px solid rgba(255,255,255,0.12)',
                    color: '#d1d5db', fontSize: 13, fontWeight: 500,
                  }}
                >
                  ✏️ Edit
                </button>
                <button
                  onClick={() => onAddEdge(node.id)}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(79,70,229,0.12)',
                    border: '1px solid rgba(79,70,229,0.3)',
                    color: '#818cf8', fontSize: 13,
                  }}
                >
                  🔗
                </button>
                <button
                  onClick={handleDelete}
                  style={{
                    padding: '8px 14px', borderRadius: 8, cursor: 'pointer',
                    background: 'rgba(220,38,38,0.12)',
                    border: '1px solid rgba(220,38,38,0.25)',
                    color: '#f87171', fontSize: 13,
                  }}
                >
                  🗑
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
