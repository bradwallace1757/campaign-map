import type { MapNode, MapEdge, NodeType, EdgeType } from '../types';

export interface ProposedNode {
  id: string;
  type: NodeType;
  name: string;
  summary: string;
  tags: string[];
  isNew: boolean;        // false = update to existing node
  existingId?: string;   // if updating, the id of the existing node
}

export interface ProposedEdge {
  id: string;
  source: string;
  target: string;
  label: string;
  type: EdgeType;
  isNew: boolean;
  sourceName: string;    // human-readable, for display in review UI
  targetName: string;
}

export interface ParseResult {
  nodes: ProposedNode[];
  edges: ProposedEdge[];
  error?: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export async function parseTranscript(
  transcript: string,
  existingNodes: MapNode[],
  existingEdges: MapEdge[]
): Promise<ParseResult> {

  const existingSummary = existingNodes.map((n) =>
    `- id:"${n.id}" name:"${n.name}" type:${n.type}`
  ).join('\n');

  const existingEdgeSummary = existingEdges.map((e) => {
    const src = existingNodes.find((n) => n.id === e.source)?.name ?? e.source;
    const tgt = existingNodes.find((n) => n.id === e.target)?.name ?? e.target;
    return `- "${src}" → "${tgt}" (${e.label})`;
  }).join('\n');

  const systemPrompt = `You are a D&D campaign archivist. Your job is to read session transcripts or summaries and extract structured data about the people, places, and factions mentioned.

You will return ONLY a valid JSON object — no markdown, no explanation, just raw JSON.

The JSON must have this exact shape:
{
  "nodes": [
    {
      "id": "slug-id-here",
      "type": "pc | npc | place | faction | item | other",
      "name": "Full Name",
      "summary": "1-3 sentence description of who/what this is based on the transcript",
      "tags": ["tag1", "tag2"],
      "action": "add | update",
      "existingId": "existing-node-id-if-updating"
    }
  ],
  "edges": [
    {
      "id": "e-slug-here",
      "source": "source-node-id",
      "target": "target-node-id",
      "label": "short relationship label",
      "type": "allied | enemy | seeks | knows | member | loves | distrusts | serves | other",
      "action": "add | skip"
    }
  ]
}

Rules:
- node "id" must be a lowercase kebab-case slug of the name (e.g. "odvar-finch")
- For nodes that ALREADY EXIST in the list below, set action:"update" and set existingId to their existing id. Only update if the transcript adds meaningful new information.
- For truly new nodes, set action:"add"
- For edges, use the node ids (existing or new) for source/target
- If an edge ALREADY EXISTS (check the list below), set action:"skip"
- Only include edges where both source and target are either in the existing list or being added in this response
- Keep labels short (2-5 words): "patron of", "allied with", "seeks to kill", "member of", etc.
- Tags should be short lowercase words: roles, traits, locations, affiliations
- Do not invent information not supported by the transcript

EXISTING NODES (do not duplicate these):
${existingSummary || '(none yet)'}

EXISTING EDGES (do not duplicate these):
${existingEdgeSummary || '(none yet)'}`;

  const userPrompt = `Extract all entities and relationships from this transcript/summary:\n\n${transcript}`;

  const controller = new AbortController();
  const timeout    = setTimeout(() => controller.abort(), 60000); // 60s timeout

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
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('aborted') || msg.includes('abort')) {
      return { nodes: [], edges: [], error: 'Request timed out after 30 seconds. Check your internet connection and try again.' };
    }
    return { nodes: [], edges: [], error: `Network error — could not reach the Anthropic API.\n\nDetails: ${msg}\n\nMake sure your API key is correct and you have an internet connection.` };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    const err = await response.text();
    return { nodes: [], edges: [], error: `API error ${response.status}: ${err}` };
  }

  let json: { content?: Array<{ text?: string }> };
  try {
    json = await response.json();
  } catch (err) {
    return { nodes: [], edges: [], error: `Could not parse API response as JSON. ${err}` };
  }
  const raw = json.content?.[0]?.text ?? '';

  let parsed: {
    nodes: Array<{
      id: string; type: NodeType; name: string; summary: string;
      tags: string[]; action: 'add' | 'update'; existingId?: string;
    }>;
    edges: Array<{
      id: string; source: string; target: string; label: string;
      type: EdgeType; action: 'add' | 'skip';
    }>;
  };

  try {
    // Strip any accidental markdown fences
    const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```$/i, '').trim();
    parsed = JSON.parse(cleaned);
  } catch {
    return { nodes: [], edges: [], error: `Could not parse Claude's response as JSON.\n\nRaw response:\n${raw}` };
  }

  // Build a combined name→id map (existing + proposed new nodes)
  const nameToId = new Map<string, string>();
  existingNodes.forEach((n) => nameToId.set(n.name.toLowerCase(), n.id));
  parsed.nodes
    .filter((n) => n.action === 'add')
    .forEach((n) => nameToId.set(n.name.toLowerCase(), n.id));

  // Resolve node proposals
  const proposedNodes: ProposedNode[] = parsed.nodes.map((n) => ({
    id:         n.action === 'update' && n.existingId ? n.existingId : slugify(n.name),
    type:       n.type,
    name:       n.name,
    summary:    n.summary,
    tags:       n.tags ?? [],
    isNew:      n.action === 'add',
    existingId: n.existingId,
  }));

  // Resolve edge proposals — skip duplicates flagged by Claude or already in store
  const existingEdgeKeys = new Set(
    existingEdges.map((e) => `${e.source}::${e.target}::${e.label.toLowerCase()}`)
  );

  const allNodeIds = new Set([
    ...existingNodes.map((n) => n.id),
    ...proposedNodes.map((n) => n.id),
  ]);

  const proposedEdges: ProposedEdge[] = parsed.edges
    .filter((e) => e.action !== 'skip')
    .filter((e) => allNodeIds.has(e.source) && allNodeIds.has(e.target))
    .filter((e) => !existingEdgeKeys.has(`${e.source}::${e.target}::${e.label.toLowerCase()}`))
    .map((e) => {
      const srcNode = existingNodes.find((n) => n.id === e.source)
        ?? proposedNodes.find((n) => n.id === e.source);
      const tgtNode = existingNodes.find((n) => n.id === e.target)
        ?? proposedNodes.find((n) => n.id === e.target);
      return {
        id:         e.id || `e-${slugify(e.source)}-${slugify(e.target)}`,
        source:     e.source,
        target:     e.target,
        label:      e.label,
        type:       e.type,
        isNew:      true,
        sourceName: srcNode?.name ?? e.source,
        targetName: tgtNode?.name ?? e.target,
      };
    });

  return { nodes: proposedNodes, edges: proposedEdges };
}
