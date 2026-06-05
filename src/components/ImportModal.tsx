import { useState } from 'react';
import { useMapStore } from '../store/mapStore';
import { parseTranscript, type ProposedNode, type ProposedEdge, type ProposedPlot } from '../lib/parseTranscript';
import type { NodeType } from '../types';

const TYPE_COLORS: Record<NodeType, string> = {
  pc: '#2563eb', npc: '#7c3aed', place: '#0d9488', faction: '#0ea5e9', item: '#d97706', other: '#6b7280',
};

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
}

type Step = 'paste' | 'loading' | 'review' | 'error';

const STATUS_COLORS: Record<string, string> = {
  active: '#ef4444', dormant: '#f59e0b', resolved: '#22c55e',
};

export function ImportModal({ open, onClose }: ImportModalProps) {
  const nodes       = useMapStore((s) => s.nodes);
  const edges       = useMapStore((s) => s.edges);
  const plots       = useMapStore((s) => s.plots);
  const addNode     = useMapStore((s) => s.addNode);
  const updateNode  = useMapStore((s) => s.updateNode);
  const addEdge     = useMapStore((s) => s.addEdge);
  const addPlot     = useMapStore((s) => s.addPlot);
  const updatePlot  = useMapStore((s) => s.updatePlot);

  const [step, setStep]         = useState<Step>('paste');
  const [transcript, setTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [proposedNodes, setProposedNodes] = useState<ProposedNode[]>([]);
  const [proposedEdges, setProposedEdges] = useState<ProposedEdge[]>([]);
  const [proposedPlots, setProposedPlots] = useState<ProposedPlot[]>([]);
  const [acceptedNodes, setAcceptedNodes] = useState<Set<string>>(new Set());
  const [acceptedEdges, setAcceptedEdges] = useState<Set<string>>(new Set());
  const [acceptedPlots, setAcceptedPlots] = useState<Set<string>>(new Set());
  // Which items are marked GM-only (hidden from players)
  const [hiddenNodes, setHiddenNodes] = useState<Set<string>>(new Set());
  const [hiddenEdges, setHiddenEdges] = useState<Set<string>>(new Set());
  const [hiddenPlots, setHiddenPlots] = useState<Set<string>>(new Set());

  function handleClose() {
    setStep('paste');
    setTranscript('');
    setProposedNodes([]);
    setProposedEdges([]);
    setProposedPlots([]);
    setHiddenNodes(new Set());
    setHiddenEdges(new Set());
    setHiddenPlots(new Set());
    onClose();
  }

  async function handleParse() {
    if (!transcript.trim()) return;
    setStep('loading');
    setErrorMsg('');

    let result;
    try {
      result = await parseTranscript(transcript, nodes, edges, plots);
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

    if (result.nodes.length === 0 && result.edges.length === 0 && result.plots.length === 0) {
      setErrorMsg('Claude found no new entities, relationships, or plot threads in this text. Try pasting a fuller transcript or summary.');
      setStep('error');
      return;
    }

    setProposedNodes(result.nodes);
    setProposedEdges(result.edges);
    setProposedPlots(result.plots);
    // Default: accept all, nothing hidden
    setAcceptedNodes(new Set(result.nodes.map((n) => n.id)));
    setAcceptedEdges(new Set(result.edges.map((e) => e.id)));
    setAcceptedPlots(new Set(result.plots.map((p) => p.id)));
    setHiddenNodes(new Set());
    setHiddenEdges(new Set());
    setHiddenPlots(new Set());
    setStep('review');
  }

  function toggleNode(id: string) {
    setAcceptedNodes((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleEdge(id: string) {
    setAcceptedEdges((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function togglePlot(id: string) {
    setAcceptedPlots((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleHiddenNode(id: string) {
    setHiddenNodes((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleHiddenEdge(id: string) {
    setHiddenEdges((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  function toggleHiddenPlot(id: string) {
    setHiddenPlots((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  function handleConfirm() {
    // Find a spread-out position for new nodes
    const usedPositions = nodes.map((n) => n.position);
    function findPosition(index: number) {
      const angle  = (index / Math.max(proposedNodes.length, 1)) * 2 * Math.PI;
      const radius = 350 + Math.random() * 150;
      const cx     = usedPositions.reduce((s, p) => s + p.x, 0) / Math.max(usedPositions.length, 1);
      const cy     = usedPositions.reduce((s, p) => s + p.y, 0) / Math.max(usedPositions.length, 1);
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    }

    let newIdx = 0;
    proposedNodes.forEach((n) => {
      if (!acceptedNodes.has(n.id)) return;
      const hidden = hiddenNodes.has(n.id) ? true : undefined;
      if (n.isNew) {
        addNode({ id: n.id, type: n.type, name: n.name, summary: n.summary, tags: n.tags, hidden, position: findPosition(newIdx++) });
      } else if (n.existingId) {
        updateNode(n.existingId, { summary: n.summary, tags: n.tags, ...(hidden !== undefined ? { hidden } : {}) });
      }
    });

    proposedEdges.forEach((e) => {
      if (!acceptedEdges.has(e.id)) return;
      const hidden = hiddenEdges.has(e.id) ? true : undefined;
      addEdge({ id: e.id, source: e.source, target: e.target, label: e.label, type: e.type, hidden });
    });

    proposedPlots.forEach((p) => {
      if (!acceptedPlots.has(p.id)) return;
      const hidden = hiddenPlots.has(p.id) ? true : undefined;
      if (p.isNew) {
        addPlot({ id: p.id, title: p.title, summary: p.summary, status: p.status, relatedNodeIds: p.relatedNodeIds, session: p.session, hidden });
      } else if (p.existingId) {
        updatePlot(p.existingId, { summary: p.summary, status: p.status, relatedNodeIds: p.relatedNodeIds, ...(hidden !== undefined ? { hidden } : {}) });
      }
    });

    handleClose();
  }

  if (!open) return null;

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 60,
    background: 'rgba(0,0,0,0.6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24,
  };

  const modal: React.CSSProperties = {
    background: '#16171c',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 16,
    width: '100%',
    maxWidth: 680,
    maxHeight: '90vh',
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
    <div style={overlay} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={modal}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#f3f4f6' }}>
              {step === 'paste' && '✨ Import Transcript'}
              {step === 'loading' && '✨ Analysing…'}
              {step === 'review' && '✨ Review Proposals'}
              {step === 'error' && '✨ Import Failed'}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>
              {step === 'paste' && 'Paste a session transcript or summary below.'}
              {step === 'loading' && 'Claude is reading the transcript…'}
              {step === 'review' && 'Accept or reject each proposed addition before saving.'}
              {step === 'error' && 'Something went wrong.'}
            </p>
          </div>
          <button onClick={handleClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 6, color: '#9ca3af', width: 30, height: 30, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── PASTE STEP ── */}
          {step === 'paste' && (
            <div>
              <div style={sectionLabel}>Session transcript or summary</div>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste your session notes, transcript, or player-facing summary here. Claude will extract characters, places, factions, and relationships."
                style={{
                  width: '100%', minHeight: 260, boxSizing: 'border-box',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 10, padding: '12px 14px',
                  color: '#e5e7eb', fontSize: 13.5, lineHeight: 1.65,
                  resize: 'vertical', outline: 'none',
                  fontFamily: "system-ui, 'Segoe UI', sans-serif",
                }}
              />
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#4b5563' }}>
                Tip: You can paste raw chat logs, bullet-point summaries, or full narrative write-ups — Claude handles all formats.
              </p>
            </div>
          )}

          {/* ── LOADING STEP ── */}
          {step === 'loading' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200, gap: 16 }}>
              <div style={{ fontSize: 36 }}>⚔️</div>
              <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>Reading transcript…</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: 8, height: 8, borderRadius: '50%', background: '#4f46e5',
                    animation: `bounce 1s ease-in-out ${i * 0.15}s infinite`,
                  }} />
                ))}
              </div>
            </div>
          )}

          {/* ── ERROR STEP ── */}
          {step === 'error' && (
            <div style={{ background: 'rgba(220,38,38,0.1)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 10, padding: 16 }}>
              <p style={{ margin: 0, color: '#fca5a5', fontSize: 13.5, whiteSpace: 'pre-wrap' }}>{errorMsg}</p>
            </div>
          )}

          {/* ── REVIEW STEP ── */}
          {step === 'review' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* Proposed nodes */}
              {proposedNodes.length > 0 && (
                <div>
                  <div style={sectionLabel}>
                    Entities ({acceptedNodes.size}/{proposedNodes.length} accepted)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {proposedNodes.map((n) => {
                      const accepted = acceptedNodes.has(n.id);
                      const isHidden = hiddenNodes.has(n.id);
                      const color    = TYPE_COLORS[n.type] ?? '#6b7280';
                      return (
                        <div
                          key={n.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            border: `1px solid ${accepted ? (isHidden ? 'rgba(234,179,8,0.4)' : 'rgba(79,70,229,0.4)') : 'rgba(255,255,255,0.06)'}`,
                            background: accepted ? (isHidden ? 'rgba(234,179,8,0.06)' : 'rgba(79,70,229,0.08)') : 'rgba(255,255,255,0.03)',
                            transition: 'all 0.15s',
                            opacity: accepted ? 1 : 0.45,
                          }}
                        >
                          {/* Checkbox */}
                          <div onClick={() => toggleNode(n.id)} style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1, cursor: 'pointer',
                            border: `2px solid ${accepted ? '#4f46e5' : 'rgba(255,255,255,0.2)'}`,
                            background: accepted ? '#4f46e5' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {accepted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>

                          {/* Content */}
                          <div onClick={() => toggleNode(n.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} />
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{n.name}</span>
                              <span style={{ fontSize: 10, color: color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{n.type}</span>
                              {!n.isNew && (
                                <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                                  update
                                </span>
                              )}
                            </div>
                            <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{n.summary}</p>
                            {n.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: 4, marginTop: 6, flexWrap: 'wrap' }}>
                                {n.tags.map((t) => (
                                  <span key={t} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}>{t}</span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* GM-only toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHiddenNode(n.id); }}
                            title={isHidden ? 'GM only — click to make player-visible' : 'Visible to players — click to make GM only'}
                            style={{
                              flexShrink: 0, marginTop: 1, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                              background: isHidden ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isHidden ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.1)'}`,
                              color: isHidden ? '#fbbf24' : '#4b5563',
                              transition: 'all 0.15s', fontFamily: "system-ui,'Segoe UI',sans-serif",
                            }}
                          >
                            {isHidden ? '🔒 GM' : '👁'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Proposed edges */}
              {proposedEdges.length > 0 && (
                <div>
                  <div style={sectionLabel}>
                    Connections ({acceptedEdges.size}/{proposedEdges.length} accepted)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {proposedEdges.map((e) => {
                      const accepted = acceptedEdges.has(e.id);
                      const isHidden = hiddenEdges.has(e.id);
                      return (
                        <div
                          key={e.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '8px 12px', borderRadius: 10,
                            border: `1px solid ${accepted ? (isHidden ? 'rgba(234,179,8,0.4)' : 'rgba(79,70,229,0.4)') : 'rgba(255,255,255,0.06)'}`,
                            background: accepted ? (isHidden ? 'rgba(234,179,8,0.06)' : 'rgba(79,70,229,0.08)') : 'rgba(255,255,255,0.03)',
                            transition: 'all 0.15s',
                            opacity: accepted ? 1 : 0.45,
                          }}
                        >
                          {/* Checkbox */}
                          <div onClick={() => toggleEdge(e.id)} style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0, cursor: 'pointer',
                            border: `2px solid ${accepted ? '#4f46e5' : 'rgba(255,255,255,0.2)'}`,
                            background: accepted ? '#4f46e5' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {accepted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>

                          <div onClick={() => toggleEdge(e.id)} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#e5e7eb' }}>{e.sourceName}</span>
                            <span style={{ fontSize: 12, color: '#6b7280', fontStyle: 'italic' }}>→ {e.label} →</span>
                            <span style={{ fontSize: 13, fontWeight: 500, color: '#e5e7eb' }}>{e.targetName}</span>
                          </div>

                          {/* GM-only toggle */}
                          <button
                            onClick={(e2) => { e2.stopPropagation(); toggleHiddenEdge(e.id); }}
                            title={isHidden ? 'GM only — click to make player-visible' : 'Visible to players — click to make GM only'}
                            style={{
                              flexShrink: 0, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                              background: isHidden ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isHidden ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.1)'}`,
                              color: isHidden ? '#fbbf24' : '#4b5563',
                              transition: 'all 0.15s', fontFamily: "system-ui,'Segoe UI',sans-serif",
                            }}
                          >
                            {isHidden ? '🔒 GM' : '👁'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Proposed plot threads */}
              {proposedPlots.length > 0 && (
                <div>
                  <div style={sectionLabel}>
                    Plot Threads ({acceptedPlots.size}/{proposedPlots.length} accepted)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {proposedPlots.map((p) => {
                      const accepted    = acceptedPlots.has(p.id);
                      const isHidden    = hiddenPlots.has(p.id);
                      const statusColor = STATUS_COLORS[p.status] ?? '#6b7280';
                      return (
                        <div
                          key={p.id}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 12,
                            padding: '10px 12px', borderRadius: 10,
                            border: `1px solid ${accepted ? (isHidden ? 'rgba(234,179,8,0.4)' : 'rgba(79,70,229,0.4)') : 'rgba(255,255,255,0.06)'}`,
                            background: accepted ? (isHidden ? 'rgba(234,179,8,0.06)' : 'rgba(79,70,229,0.08)') : 'rgba(255,255,255,0.03)',
                            transition: 'all 0.15s',
                            opacity: accepted ? 1 : 0.45,
                          }}
                        >
                          {/* Checkbox */}
                          <div onClick={() => togglePlot(p.id)} style={{
                            width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 2, cursor: 'pointer',
                            border: `2px solid ${accepted ? '#4f46e5' : 'rgba(255,255,255,0.2)'}`,
                            background: accepted ? '#4f46e5' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {accepted && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                          </div>

                          <div onClick={() => togglePlot(p.id)} style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                              <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: statusColor, flexShrink: 0, boxShadow: `0 0 5px ${statusColor}88` }} />
                              <span style={{ fontSize: 14, fontWeight: 600, color: '#f3f4f6' }}>{p.title}</span>
                              <span style={{ fontSize: 10, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>{p.status}</span>
                              {!p.isNew && (
                                <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 4, padding: '1px 6px' }}>
                                  update
                                </span>
                              )}
                              {p.session != null && (
                                <span style={{ fontSize: 10, color: '#6b7280', marginLeft: 'auto' }}>S{p.session}</span>
                              )}
                            </div>
                            {p.summary && (
                              <p style={{ margin: 0, fontSize: 12, color: '#9ca3af', lineHeight: 1.5 }}>{p.summary}</p>
                            )}
                          </div>

                          {/* GM-only toggle */}
                          <button
                            onClick={(e) => { e.stopPropagation(); toggleHiddenPlot(p.id); }}
                            title={isHidden ? 'GM only — click to make player-visible' : 'Visible to players — click to make GM only'}
                            style={{
                              flexShrink: 0, marginTop: 1, padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11,
                              background: isHidden ? 'rgba(234,179,8,0.15)' : 'rgba(255,255,255,0.05)',
                              border: `1px solid ${isHidden ? 'rgba(234,179,8,0.4)' : 'rgba(255,255,255,0.1)'}`,
                              color: isHidden ? '#fbbf24' : '#4b5563',
                              transition: 'all 0.15s', fontFamily: "system-ui,'Segoe UI',sans-serif",
                            }}
                          >
                            {isHidden ? '🔒 GM' : '👁'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid rgba(255,255,255,0.07)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          {(step === 'paste' || step === 'error') && (
            <>
              <button onClick={handleClose} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={step === 'error' ? () => setStep('paste') : handleParse}
                disabled={step === 'paste' && !transcript.trim()}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: transcript.trim() ? '#4f46e5' : 'rgba(79,70,229,0.3)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: transcript.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                {step === 'error' ? 'Try Again' : 'Parse Transcript →'}
              </button>
            </>
          )}

          {step === 'review' && (
            <>
              <button onClick={() => setStep('paste')} style={{ padding: '8px 18px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#9ca3af', fontSize: 13, cursor: 'pointer' }}>
                ← Back
              </button>
              <button
                onClick={handleConfirm}
                disabled={acceptedNodes.size === 0 && acceptedEdges.size === 0 && acceptedPlots.size === 0}
                style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none',
                  background: (acceptedNodes.size > 0 || acceptedEdges.size > 0 || acceptedPlots.size > 0) ? '#4f46e5' : 'rgba(79,70,229,0.3)',
                  color: '#fff', fontSize: 13, fontWeight: 600,
                  cursor: (acceptedNodes.size > 0 || acceptedEdges.size > 0 || acceptedPlots.size > 0) ? 'pointer' : 'not-allowed',
                }}
              >
                Add {acceptedNodes.size + acceptedEdges.size + acceptedPlots.size} items to map →
              </button>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
