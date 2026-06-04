import { useState, useRef, useEffect } from 'react';
import { useMapStore } from '../store/mapStore';

interface SearchBarProps {
  onSelectResult: (nodeId: string) => void;
}

const TYPE_DOT: Record<string, string> = {
  pc:      '#2563eb',
  npc:     '#7c3aed',
  place:   '#0d9488',
  faction: '#0ea5e9',
  item:    '#d97706',
  other:   '#6b7280',
};

const TYPE_LABEL: Record<string, string> = {
  pc: 'PC', npc: 'NPC', place: 'Place', faction: 'Faction', item: 'Item', other: 'Other',
};

export function SearchBar({ onSelectResult }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen]   = useState(false);
  const nodes             = useMapStore((s) => s.nodes);
  const inputRef          = useRef<HTMLInputElement>(null);
  const containerRef      = useRef<HTMLDivElement>(null);

  const results = query.trim().length < 1 ? [] : nodes.filter((n) =>
    n.name.toLowerCase().includes(query.toLowerCase()) ||
    n.summary.toLowerCase().includes(query.toLowerCase()) ||
    n.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(nodeId: string) {
    const node = nodes.find((n) => n.id === nodeId);
    setQuery(node?.name ?? '');
    setOpen(false);
    onSelectResult(nodeId);
  }

  const panelStyle: React.CSSProperties = {
    background: 'rgba(30,31,36,0.95)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 10,
    backdropFilter: 'blur(8px)',
  };

  return (
    <div ref={containerRef} className="relative w-64">
      <div style={panelStyle} className="flex items-center px-3 py-1.5 gap-2 shadow-md">
        <svg className="w-4 h-4 shrink-0" style={{ color: '#6b7280' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          ref={inputRef}
          type="text"
          placeholder="Search nodes…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          style={{ background: 'transparent', color: '#e5e7eb', fontSize: 13 }}
          className="outline-none w-full placeholder-gray-500"
        />
        {query && (
          <button onClick={() => { setQuery(''); inputRef.current?.focus(); }}
            style={{ color: '#6b7280' }} className="text-lg leading-none hover:text-gray-300">×
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div style={{ ...panelStyle, borderRadius: 10 }}
          className="absolute top-full mt-1 w-full shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto">
          {results.map((node) => (
            <button key={node.id} onClick={() => handleSelect(node.id)}
              className="w-full text-left px-3 py-2 flex items-center gap-2 transition-colors hover:bg-white/5">
              <span style={{ backgroundColor: TYPE_DOT[node.type] ?? '#888' }}
                className="shrink-0 w-2.5 h-2.5 rounded-full" />
              <span style={{ fontSize: 13, color: '#e5e7eb' }} className="truncate font-medium">{node.name}</span>
              <span style={{ fontSize: 11, color: '#6b7280' }} className="ml-auto shrink-0">{TYPE_LABEL[node.type]}</span>
            </button>
          ))}
        </div>
      )}

      {open && query.trim().length > 0 && results.length === 0 && (
        <div style={panelStyle} className="absolute top-full mt-1 w-full shadow-xl px-3 py-2 z-50">
          <span style={{ color: '#6b7280', fontSize: 13 }}>No results for "{query}"</span>
        </div>
      )}
    </div>
  );
}
