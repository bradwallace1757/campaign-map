import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { editMap, type ProposedChange } from '../lib/editMap';

interface EditMapModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'input' | 'loading' | 'review' | 'error';

const CHANGE_ICONS: Record<string, string> = {
  delete_edge:          '🔗✕',
  delete_node:          '🗑',
  update_node_summary:  '📝',
  update_node_tags:     '🏷',
};

const CHANGE_LABELS: Record<string, string> = {
  delete_edge:          'Remove connection',
  delete_node:          'Delete node',
  update_node_summary:  'Update summary',
  update_node_tags:     'Update tags',
};

export function EditMapModal({ open, onClose }: EditMapModalProps) {
  const nodes      = useMapStore((s) => s.nodes);
  const edges      = useMapStore((s) => s.edges);
  const deleteNode = useMapStore((s) => s.deleteNode);
  const deleteEdge = useMapStore((s) => s.deleteEdge);
  const updateNode = useMapStore((s) => s.updateNode);

  const [step, setStep]             = useState<Step>('input');
  const [instruction, setInstruction] = useState('');
  const [changes, setChanges]       = useState<ProposedChange[]>([]);
  const [accepted, setAccepted]     = useState<Set<string>>(new Set());
  const [errorMsg, setErrorMsg]     = useState('');

  function handleClose() {
    setStep('input');
    setInstruction('');
    setChanges([]);
    setAccepted(new Set());
    onClose();
  }

  async function handleSubmit() {
    if (!instruction.trim()) return;
    setStep('loading');
    let result;
    try {
      result = await editMap(instruction, nodes, edges);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Unexpected error: ${msg}`);
      setStep('error');
      return;
    }
    if (result.error) {
      setErrorMsg(result.error);
      setStep('error');
      return;
    }
    if (result.changes.length === 0) {
      setErrorMsg('Claude found nothing to change based on that instruction. Try rephrasing or being more specific.');
      setStep('error');
      return;
    }
    setChanges(result.changes);
    setAccepted(new Set(result.changes.map((c) => c.id)));
    setStep('review');
  }

  function toggle(id: string) {
    setAccepted((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function handleConfirm() {
    changes.filter((c) => accepted.has(c.id)).forEach((c) => {
      if (c.type === 'delete_edge')         deleteEdge(c.targetId);
      if (c.type === 'delete_node')         deleteNode(c.targetId);
      if (c.type === 'update_node_summary' && c.newSummary)
        updateNode(c.targetId, { summary: c.newSummary });
      if (c.type === 'update_node_tags' && c.newTags)
        updateNode(c.targetId, { tags: c.newTags });
    });
    handleClose();
  }

  if (!open) return null;

  const modal: React.CSSProperties = {
    background: '#16171c',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 600,
    maxHeight: '85vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    overflow: 'hidden',
  };

  const sectionLabel: React.CSSProperties = {
    fontSize: 11, fontWeight: 600, letterSpacing: '0.07em',
    textTransform: 'uppercase', color: '#6b7280', marginBottom: 8,
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <div style={modal}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
              {step === 'review' ? '🛠 Review Proposed Changes' : '🛠 Edit Map'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              {step === 'input' && 'Describe what you want to change in plain English.'}
              {step === 'loading' && 'Claude is working out what to change…'}
              {step === 'review' && 'Accept or reject each proposed change before applying.'}
              {step === 'error' && 'Something went wrong.'}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {step === 'input' && (
            <div>
              <div style={sectionLabel}>What do you want to change?</div>
              <textarea
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                autoFocus
                placeholder={
                  'Examples:\n' +
                  '• "Remove any relationships that would spoil Vaelios\'s secret orders from the Raven Queen"\n' +
                  '• "Delete the edge between Sparkle and the Zhentarim — players don\'t know this yet"\n' +
                  '• "Update Odvar Finch\'s summary to remove mention of his devil\'s bargain"\n' +
                  '• "Remove all edges involving private character backstory"'
                }
                style={{
                  width: '100%', minHeight: 180, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '12px 14px',
                  color: '#e5e7eb', fontSize: 13.5, lineHeight: 1.65,
                  resize: 'vertical', outline: 'none',
                  fontFamily: "system-ui, 'Segoe UI', sans-serif",
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
              />
              <p style={{ margin: '8px 0 0', fontSize: 12, color: '#4b5563' }}>
                Tip: Press Ctrl+Enter to submit. Be as specific or as vague as you like — Claude will interpret it conservatively.
              </p>
            </div>
          )}

          {step === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 160, gap: 14 }}>
              <div style={{ fontSize: 32 }}>🛠</div>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>Analysing the map…</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#4f46e5', animation: `bounce 1s ease-in-out ${i * 0.15}s infinite` }} />
                ))}
              </div>
            </div>
          )}

          {step === 'error' && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, color: '#fca5a5', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{errorMsg}</p>
            </div>
          )}

          {step === 'review' && (
            <div>
              <div style={sectionLabel}>Proposed changes ({accepted.size}/{changes.length} accepted)</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {changes.map((c) => {
                  const isAccepted = accepted.has(c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => toggle(c.id)}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '12px 14px', borderRadius: 10, cursor: 'pointer',
                        border: `1px solid ${isAccepted ? 'rgba(79,70,229,0.4)' : 'rgba(255,255,255,0.06)'}`,
                        background: isAccepted ? 'rgba(79,70,229,0.08)' : 'rgba(255,255,255,0.03)',
                        opacity: isAccepted ? 1 : 0.45,
                        transition: 'all 0.15s',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2,
                        border: `2px solid ${isAccepted ? '#4f46e5' : 'rgba(255,255,255,0.2)'}`,
                        background: isAccepted ? '#4f46e5' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {isAccepted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {/* Type badge + description */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 13 }}>{CHANGE_ICONS[c.type]}</span>
                          <span style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>
                            {CHANGE_LABELS[c.type]}
                          </span>
                        </div>
                        <p style={{ margin: '0 0 4px', fontSize: 13.5, fontWeight: 500, color: '#e5e7eb' }}>{c.description}</p>
                        <p style={{ margin: 0, fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>{c.reason}</p>

                        {/* Preview new summary if applicable */}
                        {c.type === 'update_node_summary' && c.newSummary && (
                          <div style={{ marginTop: 8, padding: '8px 10px', background: 'rgba(255,255,255,0.04)', borderRadius: 6, borderLeft: '2px solid #4f46e5' }}>
                            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{c.newSummary}</p>
                          </div>
                        )}
                        {c.type === 'update_node_tags' && c.newTags && (
                          <div style={{ display: 'flex', gap: 4, marginTop: 8, flexWrap: 'wrap' }}>
                            {c.newTags.map((t) => (
                              <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>{t}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {(step === 'input' || step === 'error') && (
            <>
              <button onClick={handleClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={step === 'error' ? () => setStep('input') : handleSubmit}
                disabled={step === 'input' && !instruction.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: instruction.trim() ? '#4f46e5' : 'rgba(79,70,229,0.3)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: instruction.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {step === 'error' ? 'Try Again' : 'Propose Changes →'}
              </button>
            </>
          )}
          {step === 'review' && (
            <>
              <button onClick={() => setStep('input')} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={accepted.size === 0}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: accepted.size > 0 ? '#4f46e5' : 'rgba(79,70,229,0.3)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: accepted.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Apply {accepted.size} change{accepted.size !== 1 ? 's' : ''} →
              </button>
            </>
          )}
        </div>
      </div>
      <style>{`@keyframes bounce { 0%,100%{transform:translateY(0);opacity:.5} 50%{transform:translateY(-8px);opacity:1} }`}</style>
    </div>
  );
}
