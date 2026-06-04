import { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  BackgroundVariant,
  ConnectionLineType,
} from '@xyflow/react';
import { useMapStore } from '../store/mapStore';
import { MapNodeComponent } from './MapNode';
import type { MapNodeData } from './MapNode';
import type { NodeType } from '../types';
import { useForceSimulation } from '../hooks/useForceSimulation';

const NODE_TYPES = { mapNode: MapNodeComponent };

interface MapCanvasProps {
  searchHighlightId: string | null;
}

export function MapCanvas({ searchHighlightId }: MapCanvasProps) {
  const storeNodes      = useMapStore((s) => s.nodes);
  const storeEdges      = useMapStore((s) => s.edges);
  const settings        = useMapStore((s) => s.settings);
  const setNodePosition = useMapStore((s) => s.setNodePosition);
  const selectedNodeId  = useMapStore((s) => s.selectedNodeId);
  const { fitView }     = useReactFlow();
  const initialFit      = useRef(false);

  // Physics simulation
  const { positions, fixNode, releaseNode } = useForceSimulation(storeNodes, storeEdges);

  // React Flow manages its OWN internal node/edge state
  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Helper: build an RF node from a store node + current position
  const makeRfNode = useCallback((n: typeof storeNodes[number], pos: { x: number; y: number }): Node => {
    const color       = settings.nodeColors[n.type as NodeType] ?? '#888';
    const highlighted = searchHighlightId === n.id;
    const dimmed      = searchHighlightId !== null && !highlighted;
    const data: MapNodeData = { name: n.name, nodeType: n.type, color, highlighted, dimmed };
    return {
      id:       n.id,
      type:     'mapNode' as const,
      position: pos,
      data:     data as unknown as Record<string, unknown>,
    };
  }, [settings.nodeColors, searchHighlightId]);

  // Sync store structure → RF nodes (when nodes are added/removed or settings change)
  useEffect(() => {
    setRfNodes(storeNodes.map((n) => makeRfNode(n, positions[n.id] ?? n.position)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeNodes, settings.nodeColors]);

  // Sync simulation positions → RF nodes on every physics tick
  useEffect(() => {
    setRfNodes((nds) =>
      nds.map((n) => {
        const pos = positions[n.id];
        if (!pos) return n;
        const data = n.data as unknown as MapNodeData;
        const highlighted = searchHighlightId === n.id;
        const dimmed      = searchHighlightId !== null && !highlighted;
        // Update position + highlight state
        return {
          ...n,
          position: { x: pos.x, y: pos.y },
          data: { ...data, highlighted, dimmed } as unknown as Record<string, unknown>,
        };
      })
    );
  }, [positions, searchHighlightId, setRfNodes]);

  // Sync store edges → RF edges
  const rfEdgeDefs: Edge[] = useMemo(() => {
    return storeEdges.map((e) => {
      const isConnected = selectedNodeId !== null &&
        (e.source === selectedNodeId || e.target === selectedNodeId);
      const hasSelection = selectedNodeId !== null;

      return {
        id:     e.id,
        source: e.source,
        target: e.target,
        type:   'straight',
        // Only show label when this edge is connected to the selected node
        label:  isConnected ? e.label : '',
        labelStyle:     { fontFamily: "system-ui,'Segoe UI',sans-serif", fontSize: 10, fill: '#c4b5fd' },
        labelBgStyle:   { fill: 'rgba(30,31,36,0.92)', rx: 3, ry: 3 },
        labelBgPadding: [3, 6] as [number, number],
        style: {
          stroke: isConnected
            ? 'rgba(167,139,250,0.8)'      // bright purple for connected edges
            : hasSelection
            ? 'rgba(148,163,184,0.08)'     // nearly invisible when something else selected
            : 'rgba(148,163,184,0.25)',    // default faint
          strokeWidth: isConnected ? 2 : 1.5,
          transition: 'stroke 0.2s, opacity 0.2s',
        },
        markerEnd: undefined,
      };
    });
  }, [storeEdges, selectedNodeId]);

  useEffect(() => {
    setRfEdges(rfEdgeDefs);
  }, [rfEdgeDefs, setRfEdges]);

  // Drag: pin node in simulation so neighbors spring away
  const onNodeDrag = useCallback(
    (_: unknown, node: Node) => {
      fixNode(node.id, node.position.x, node.position.y);
    },
    [fixNode]
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      releaseNode(node.id);
      setNodePosition(node.id, node.position);
    },
    [releaseNode, setNodePosition]
  );

  const onInit = useCallback(() => {
    if (!initialFit.current) {
      initialFit.current = true;
      setTimeout(() => fitView({ padding: 0.15, duration: 800 }), 400);
    }
  }, [fitView]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={NODE_TYPES}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeDrag={onNodeDrag}
      onNodeDragStop={onNodeDragStop}
      onInit={onInit}
      fitView={false}
      minZoom={0.05}
      maxZoom={2.5}
      style={{ background: settings.background }}
      deleteKeyCode={null}
      connectionLineType={ConnectionLineType.Straight}
      nodesDraggable
      panOnDrag
      zoomOnScroll
    >
      <Background variant={BackgroundVariant.Dots} color="rgba(255,255,255,0.06)" gap={28} size={1.5} />
      <Controls style={{ background: 'rgba(30,31,36,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }} />
      <MiniMap
        nodeColor={(n) => (n.data as unknown as MapNodeData)?.color ?? '#888'}
        maskColor="rgba(0,0,0,0.5)"
        style={{ background: 'rgba(30,31,36,0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10 }}
      />
    </ReactFlow>
  );
}
