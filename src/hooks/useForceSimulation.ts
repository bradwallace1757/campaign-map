import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3-force';
import type { MapNode, MapEdge } from '../types';

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
}

export interface SimPositions {
  [id: string]: { x: number; y: number };
}

interface UseForceSimulationReturn {
  positions: SimPositions;
  fixNode: (id: string, x: number, y: number) => void;
  releaseNode: (id: string) => void;
}

export function useForceSimulation(
  nodes: MapNode[],
  edges: MapEdge[]
): UseForceSimulationReturn {
  const simRef        = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const simNodesRef   = useRef<SimNode[]>([]);
  const rafRef        = useRef<number | null>(null);
  const [positions, setPositions] = useState<SimPositions>(() => {
    const init: SimPositions = {};
    nodes.forEach((n) => { init[n.id] = { x: n.position.x, y: n.position.y }; });
    return init;
  });

  // Flush simulation positions to React state on each tick via rAF
  const scheduleFlush = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next: SimPositions = {};
      simNodesRef.current.forEach((n) => {
        next[n.id] = { x: n.x ?? 0, y: n.y ?? 0 };
      });
      setPositions((prev) => {
        // Cheap reference-equality bail-out — avoids re-renders when sim settled
        let changed = false;
        for (const id in next) {
          if (!prev[id] || Math.abs(prev[id].x - next[id].x) > 0.1 || Math.abs(prev[id].y - next[id].y) > 0.1) {
            changed = true;
            break;
          }
        }
        return changed ? { ...next } : prev;
      });
    });
  }, []);

  // Rebuild simulation whenever the node/edge list changes
  useEffect(() => {
    // Carry over existing positions so nodes don't jump on re-init
    const currentPos = positions;
    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      x: currentPos[n.id]?.x ?? n.position.x,
      y: currentPos[n.id]?.y ?? n.position.y,
    }));
    simNodesRef.current = simNodes;

    const idIndex = new Map(simNodes.map((n, i) => [n.id, i]));
    const simLinks = edges
      .filter((e) => idIndex.has(e.source) && idIndex.has(e.target))
      .map((e) => ({ source: e.source, target: e.target }));

    // Centre of the current viewport (average of all node positions)
    const cx = simNodes.reduce((s, n) => s + (n.x ?? 0), 0) / Math.max(simNodes.length, 1);
    const cy = simNodes.reduce((s, n) => s + (n.y ?? 0), 0) / Math.max(simNodes.length, 1);

    const sim = d3
      .forceSimulation<SimNode>(simNodes)
      // Spring pull along edges
      .force(
        'link',
        d3
          .forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(130)
          .strength(0.5)
      )
      // Charge — repulsion between all nodes (reduced so lonely nodes don't fly away)
      .force('charge', d3.forceManyBody<SimNode>().strength(-350).distanceMax(400))
      // Soft collision to prevent overlap (node circle r=24 + padding)
      .force('collide', d3.forceCollide<SimNode>(50).strength(0.8))
      // Gravity — pulls all nodes toward the centre, keeps strays from drifting
      .force('center', d3.forceCenter<SimNode>(cx, cy).strength(0.08))
      .alphaDecay(0.012)
      .velocityDecay(0.18)
      .on('tick', scheduleFlush);

    simRef.current = sim;

    return () => {
      sim.stop();
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes.length, edges.length, scheduleFlush]);

  // Pin a node while dragging; reheat so neighbors spring away
  const fixNode = useCallback((id: string, x: number, y: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = simNodesRef.current.find((n) => n.id === id);
    if (node) {
      node.fx = x;
      node.fy = y;
      node.x  = x;
      node.y  = y;
    }
    sim.alphaTarget(0.4).restart();
  }, []);

  // Unpin when drag ends; let sim cool naturally
  const releaseNode = useCallback((id: string) => {
    const sim = simRef.current;
    if (!sim) return;
    const node = simNodesRef.current.find((n) => n.id === id);
    if (node) {
      node.fx = null;
      node.fy = null;
    }
    sim.alphaTarget(0).alpha(0.3).restart();
  }, []);

  return { positions, fixNode, releaseNode };
}
