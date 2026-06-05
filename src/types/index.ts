export type NodeType = 'pc' | 'npc' | 'place' | 'faction' | 'item' | 'other';

export type EdgeType =
  | 'allied'
  | 'enemy'
  | 'seeks'
  | 'knows'
  | 'member'
  | 'loves'
  | 'distrusts'
  | 'serves'
  | 'other';

export interface MapNode {
  id: string;
  type: NodeType;
  name: string;
  summary: string;
  tags: string[];
  hidden?: boolean;
  // Position on the canvas
  position: { x: number; y: number };
}

export interface MapEdge {
  id: string;
  source: string; // MapNode id
  target: string; // MapNode id
  label: string;
  type: EdgeType;
  hidden?: boolean;
}

export interface MapData {
  nodes: MapNode[];
  edges: MapEdge[];
}

// What Claude returns when parsing a transcript
export interface ParsedProposal {
  nodes: Omit<MapNode, 'position'>[];
  edges: MapEdge[];
}

// Theme / appearance settings
export interface AppSettings {
  background: string;
  nodeColors: Record<NodeType, string>;
}

export type PlotStatus = 'active' | 'dormant' | 'resolved';
export type PlotPriority = 'high' | 'medium' | 'low';

export interface PlotThread {
  id: string;
  title: string;
  summary: string;
  status: PlotStatus;
  priority?: PlotPriority;
  relatedNodeIds: string[];
  session?: number;
  hidden?: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  background: '#1e1f24',
  nodeColors: {
    pc:      '#2563eb', // vivid blue
    npc:     '#7c3aed', // purple
    place:   '#0d9488', // teal-green
    faction: '#0ea5e9', // light sky blue
    item:    '#d97706', // amber
    other:   '#6b7280', // gray
  },
};
