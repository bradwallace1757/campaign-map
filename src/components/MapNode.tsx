import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useMapStore } from '../store/mapStore';
import type { NodeType } from '../types';

export interface MapNodeData extends Record<string, unknown> {
  name: string;
  nodeType: NodeType;
  color: string;
  highlighted?: boolean;
  dimmed?: boolean;
  draggingNeighbor?: boolean;
  gmHidden?: boolean;
  size?: number;
}

export function MapNodeComponent({ id, data }: NodeProps) {
  const d = data as unknown as MapNodeData;
  const selectNode = useMapStore((s) => s.selectNode);
  const selectedNodeId = useMapStore((s) => s.selectedNodeId);
  const isSelected = selectedNodeId === id;

  const opacity = d.dimmed ? 0.25 : d.gmHidden ? 0.45 : 1;

  const ringColor = isSelected
    ? '#1a1a1a'
    : d.highlighted
    ? '#e6a817'
    : d.gmHidden
    ? '#eab308'
    : 'transparent';

  const ringWidth = isSelected || d.highlighted ? 3 : d.gmHidden ? 2 : 0;

  // Circle diameter scales with connection count (set in MapCanvas); default 48.
  const size   = d.size ?? 48;
  const half   = size / 2;
  const handleStyle = { opacity: 0, pointerEvents: 'none' as const, top: half, left: '50%', transform: 'translate(-50%,-50%)' };

  return (
    <div
      style={{ opacity, transition: 'opacity 0.2s' }}
      className="flex flex-col items-center cursor-pointer select-none"
      onClick={() => selectNode(isSelected ? null : id)}
    >
      {/* All handles pinned to circle center (top = half the circle diameter) */}
      <Handle type="target" position={Position.Top}    style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />
      <Handle type="target" position={Position.Left}   style={handleStyle} />
      <Handle type="source" position={Position.Right}  style={handleStyle} />

      {/* Circle */}
      <div style={{ position: 'relative' }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: '50%',
            backgroundColor: d.color,
            border: `${ringWidth}px solid ${ringColor}`,
            boxShadow: isSelected
              ? '0 0 0 2px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.25)'
              : d.draggingNeighbor
              ? '0 0 0 2px rgba(0,0,0,0.1), 0 6px 16px rgba(0,0,0,0.2)'
              : '0 2px 6px rgba(0,0,0,0.18)',
            transition: 'box-shadow 0.2s, border 0.15s, transform 0.15s',
            transform: d.draggingNeighbor ? 'scale(1.08)' : 'scale(1)',
          }}
        />
        {/* GM-only hidden badge */}
        {d.gmHidden && (
          <div style={{
            position: 'absolute', top: -4, right: -4,
            width: 16, height: 16, borderRadius: '50%',
            background: '#eab308', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            fontSize: 9, lineHeight: 1, pointerEvents: 'none',
            boxShadow: '0 1px 4px rgba(0,0,0,0.5)',
          }}>🔒</div>
        )}
      </div>

      {/* Label below circle */}
      <div
        style={{
          marginTop: 6,
          maxWidth: 110,
          textAlign: 'center',
          fontFamily: "system-ui, 'Segoe UI', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1.3,
          color: d.gmHidden ? '#9ca3af' : '#d1d5db',
          textShadow: '0 1px 3px rgba(0,0,0,0.8)',
          wordBreak: 'break-word',
          pointerEvents: 'none',
        }}
      >
        {d.name}
      </div>
    </div>
  );
}
