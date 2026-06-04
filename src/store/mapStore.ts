import { create } from 'zustand';
import type { MapNode, MapEdge, AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';

interface MapStore {
  nodes: MapNode[];
  edges: MapEdge[];
  settings: AppSettings;
  selectedNodeId: string | null;
  gmMode: boolean;
  toggleGmMode: () => void;

  // Load from JSON object
  loadData: (nodes: MapNode[], edges: MapEdge[]) => void;

  // Node actions
  addNode: (node: MapNode) => void;
  updateNode: (id: string, updates: Partial<MapNode>) => void;
  deleteNode: (id: string) => void;
  setNodePosition: (id: string, position: { x: number; y: number }) => void;

  // Edge actions
  addEdge: (edge: MapEdge) => void;
  updateEdge: (id: string, updates: Partial<MapEdge>) => void;
  deleteEdge: (id: string) => void;

  // Selection
  selectNode: (id: string | null) => void;

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void;

  // Export to JSON string
  exportJSON: () => string;
}

// Auto-save to localStorage whenever state changes
const STORAGE_KEY = 'dnd-campaign-map';
const SETTINGS_KEY = 'dnd-campaign-map-settings';

function saveToStorage(nodes: MapNode[], edges: MapEdge[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, edges }));
  } catch (e) {
    console.warn('Could not save to localStorage', e);
  }
}

function loadFromStorage(): { nodes: MapNode[]; edges: MapEdge[] } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Could not load from localStorage', e);
  }
  return null;
}

function saveSettingsToStorage(settings: AppSettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Could not save settings', e);
  }
}

function loadSettingsFromStorage(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch (e) {
    console.warn('Could not load settings', e);
  }
  return DEFAULT_SETTINGS;
}

const API_KEY_STORAGE = 'dnd-campaign-map-apikey';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) ?? '';
}

export function saveApiKey(key: string) {
  localStorage.setItem(API_KEY_STORAGE, key.trim());
}

export const useMapStore = create<MapStore>((set, get) => ({
  nodes: [],
  edges: [],
  settings: loadSettingsFromStorage(),
  selectedNodeId: null,
  gmMode: false,
  toggleGmMode: () => set((s) => ({ gmMode: !s.gmMode })),

  loadData: (nodes, edges) => {
    set({ nodes, edges });
    saveToStorage(nodes, edges);
  },

  addNode: (node) => {
    const nodes = [...get().nodes, node];
    const edges = get().edges;
    set({ nodes });
    saveToStorage(nodes, edges);
  },

  updateNode: (id, updates) => {
    const nodes = get().nodes.map((n) => (n.id === id ? { ...n, ...updates } : n));
    const edges = get().edges;
    set({ nodes });
    saveToStorage(nodes, edges);
  },

  deleteNode: (id) => {
    const nodes = get().nodes.filter((n) => n.id !== id);
    const edges = get().edges.filter((e) => e.source !== id && e.target !== id);
    set({ nodes, edges, selectedNodeId: get().selectedNodeId === id ? null : get().selectedNodeId });
    saveToStorage(nodes, edges);
  },

  setNodePosition: (id, position) => {
    const nodes = get().nodes.map((n) => (n.id === id ? { ...n, position } : n));
    set({ nodes });
    saveToStorage(nodes, get().edges);
  },

  addEdge: (edge) => {
    const edges = [...get().edges, edge];
    set({ edges });
    saveToStorage(get().nodes, edges);
  },

  updateEdge: (id, updates) => {
    const edges = get().edges.map((e) => (e.id === id ? { ...e, ...updates } : e));
    set({ edges });
    saveToStorage(get().nodes, edges);
  },

  deleteEdge: (id) => {
    const edges = get().edges.filter((e) => e.id !== id);
    set({ edges });
    saveToStorage(get().nodes, edges);
  },

  selectNode: (id) => set({ selectedNodeId: id }),

  updateSettings: (updates) => {
    const settings = { ...get().settings, ...updates };
    if (updates.nodeColors) {
      settings.nodeColors = { ...get().settings.nodeColors, ...updates.nodeColors };
    }
    set({ settings });
    saveSettingsToStorage(settings);
  },

  exportJSON: () => {
    const { nodes, edges } = get();
    return JSON.stringify({ nodes, edges }, null, 2);
  },
}));

// Initialise: try localStorage first, then fall back to the bundled JSON
export async function initStore() {
  const stored = loadFromStorage();
  if (stored && stored.nodes.length > 0) {
    useMapStore.getState().loadData(stored.nodes, stored.edges);
    return;
  }
  try {
    const res = await fetch('./data/campaign-map.json');
    const data = await res.json();
    useMapStore.getState().loadData(data.nodes, data.edges);
  } catch (e) {
    console.error('Could not load default map data', e);
  }
}
