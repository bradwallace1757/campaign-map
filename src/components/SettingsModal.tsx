import {} from 'react';
import { useMapStore } from '../store/mapStore';
import type { NodeType } from '../types';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const NODE_TYPE_LABELS: Record<NodeType, string> = {
  pc:      'Player Characters',
  npc:     'NPCs',
  place:   'Places',
  faction: 'Factions',
  item:    'Items',
  other:   'Other',
};

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const settings       = useMapStore((s) => s.settings);
  const updateSettings = useMapStore((s) => s.updateSettings);

  function handleBgChange(color: string) {
    updateSettings({ background: color });
  }

  function handleNodeColorChange(type: NodeType, color: string) {
    updateSettings({ nodeColors: { [type]: color } as Record<NodeType, string> });
  }

  if (!open) return null;

  const modal: React.CSSProperties = {
    background: '#16171c',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 480,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#6b7280', marginBottom: 10,
  };

  const divider: React.CSSProperties = {
    height: 1, background: 'rgba(255,255,255,0.07)', margin: '20px 0',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>⚙️ Settings</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* API Key info */}
          <div style={{ background: 'rgba(79,70,229,0.08)', border: '1px solid rgba(79,70,229,0.25)', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ ...sectionLabel, marginBottom: 6 }}>API Key Setup</div>
            <p style={{ margin: '0 0 8px', fontSize: 12.5, color: '#9ca3af', lineHeight: 1.6 }}>
              To use Import Transcript and Edit Map, open the file below in any text editor and replace <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>paste-your-key-here</code> with your key from{' '}
              <a href="https://console.anthropic.com" target="_blank" rel="noreferrer" style={{ color: '#818cf8' }}>console.anthropic.com</a>.
              Then restart the app (Ctrl+C in the terminal, then <code style={{ background: 'rgba(255,255,255,0.08)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace', fontSize: 11 }}>npm run dev</code> again).
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', borderRadius: 6, padding: '8px 12px', fontFamily: 'monospace', fontSize: 12, color: '#6ee7b7' }}>
              campaign-map\.env
            </div>
          </div>

          <div style={divider} />

          {/* Background colour */}
          <div>
            <div style={sectionLabel}>Background Colour</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="color"
                value={settings.background}
                onChange={(e) => handleBgChange(e.target.value)}
                style={{ width: 44, height: 36, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'none', padding: 2 }}
              />
              <span style={{ fontSize: 13, color: '#9ca3af', fontFamily: 'monospace' }}>{settings.background}</span>
              <button
                onClick={() => handleBgChange('#1e1f24')}
                style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: '#6b7280', cursor: 'pointer' }}
              >
                Reset
              </button>
            </div>
          </div>

          <div style={divider} />

          {/* Node colours */}
          <div>
            <div style={sectionLabel}>Node Colours</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {(Object.keys(NODE_TYPE_LABELS) as NodeType[]).map((type) => (
                <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <input
                    type="color"
                    value={settings.nodeColors[type]}
                    onChange={(e) => handleNodeColorChange(type, e.target.value)}
                    style={{ width: 36, height: 32, borderRadius: 6, border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer', background: 'none', padding: 2, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: 13, color: '#d1d5db', minWidth: 130 }}>{NODE_TYPE_LABELS[type]}</span>
                  <span style={{ fontSize: 12, color: '#6b7280', fontFamily: 'monospace' }}>{settings.nodeColors[type]}</span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.07)', color: '#d1d5db', fontSize: 13, cursor: 'pointer' }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
