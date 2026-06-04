import type { MapNode, MapEdge } from '../types';

export type ChangeType = 'delete_edge' | 'delete_node' | 'update_node_summary' | 'update_node_tags';

export interface ProposedChange {
  id: string;           // unique id for this change proposal
  type: ChangeType;
  targetId: string;     // node or edge id being changed
  description: string;  // human-readable explanation shown in review UI
  reason: string;       // why Claude is proposing this
  // For update_node_summary
  newSummary?: string;
  // For update_node_tags
  newTags?: string[];
}

export interface EditResult {
  changes: ProposedChange[];
  error?: string;
}

export async function editMap(
  instruction: string,
  nodes: MapNode[],
  edges: MapEdge[]
): Promise<EditResult> {

  const nodeList = nodes.map((n) =>
    `id:"${n.id}" name:"${n.name}" type:${n.type} summary:"${n.summary}" tags:[${n.tags.join(', ')}]`
  ).join('\n');

  const edgeList = edges.map((e) => {
    const src = nodes.find((n) => n.id === e.source)?.name ?? e.source;
    const tgt = nodes.find((n) => n.id === e.target)?.name ?? e.target;
    return `id:"${e.id}" "${src}" → "${tgt}" label:"${e.label}"`;
  }).join('\n');

  const systemPrompt = `You are a D&D campaign map editor. You are given a full list of nodes (characters, places, factions) and edges (relationships) currently on a campaign relationship map, along with an instruction from the Game Master.

Your job is to propose specific changes to the map based on the instruction. Return ONLY a valid JSON object — no markdown, no explanation.

Shape:
{
  "changes": [
    {
      "id": "change-1",
      "type": "delete_edge | delete_node | update_node_summary | update_node_tags",
      "targetId": "the-node-or-edge-id",
      "description": "Short human-readable label for this change (shown in the UI)",
      "reason": "Why you are proposing this change",
      "newSummary": "...",
      "newTags": ["..."]
    }
  ]
}

Rules:
- Only propose changes that are clearly supported by the instruction
- For delete_edge / delete_node: set targetId to the id of the edge or node to remove
- For update_node_summary: include newSummary with the revised text
- For update_node_tags: include newTags with the revised tag list
- description should be a concise label like: 'Remove "patron of" edge between Raven Queen and Vaelios'
- reason should explain why this satisfies the instruction
- If the instruction is ambiguous, propose the most conservative interpretation
- Do NOT invent nodes or edges that don't exist

CURRENT NODES:
${nodeList}

CURRENT EDGES:
${edgeList}`;

  const userPrompt = `Instruction: ${instruction}`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch('http://localhost:3001', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('abort')) {
      return { changes: [], error: 'Request timed out after 30 seconds. Check your internet connection and try again.' };
    }
    return { changes: [], error: `Network error — could not reach the Anthropic API.\n\nDetails: ${msg}` };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text();
    return { changes: [], error: `API error ${response.status}: ${err}` };
  }

  let json: { content?: Array<{ text?: string }> };
  try {
    json = await response.json();
  } catch (err) {
    return { changes: [], error: `Could not parse API response. ${err}` };
  }
  const raw = json.content?.[0]?.text ?? '';

  try {
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    const parsed  = JSON.parse(cleaned) as { changes: ProposedChange[] };
    return { changes: parsed.changes ?? [] };
  } catch {
    return { changes: [], error: `Could not parse Claude's response.\n\nRaw:\n${raw}` };
  }
}
