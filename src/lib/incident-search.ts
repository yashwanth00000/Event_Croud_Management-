import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';

export const INCIDENT_VECTOR_DIMENSIONS = 384;
const collection = 'eventcrowd_incidents';

export function incidentVector(text: string): number[] {
  const tokens = text.toLowerCase().normalize('NFKC').match(/[\p{L}\p{N}]+/gu) ?? [];
  const features = [...tokens, ...tokens.slice(0, -1).map((token, index) => `${token}_${tokens[index + 1]}`)];
  const vector = new Array<number>(INCIDENT_VECTOR_DIMENSIONS).fill(0);
  for (const feature of features) {
    const digest = createHash('sha256').update(feature).digest();
    const index = digest.readUInt32BE(0) % INCIDENT_VECTOR_DIMENSIONS;
    vector[index] += (digest[4] & 1) === 0 ? 1 : -1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
  return norm ? vector.map(value => value / norm) : vector;
}

function qdrantHeaders() {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (process.env.QDRANT_API_KEY) headers['api-key'] = process.env.QDRANT_API_KEY;
  return headers;
}

async function ensureCollection() {
  const base = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/$/, '');
  const current = await fetch(`${base}/collections/${collection}`, { headers: qdrantHeaders(), cache: 'no-store' });
  if (current.status === 404) {
    const created = await fetch(`${base}/collections/${collection}`, { method: 'PUT', headers: qdrantHeaders(), body: JSON.stringify({ vectors: { size: INCIDENT_VECTOR_DIMENSIONS, distance: 'Cosine' } }), cache: 'no-store' });
    if (!created.ok) throw new Error(`Qdrant collection setup failed (${created.status})`);
  } else if (!current.ok) throw new Error(`Qdrant collection check failed (${current.status})`);
  return base;
}

export async function syncIncidentToVectorIndex(incidentId: string) {
  try {
    const incident = await prisma.incident.findUnique({ where: { id: incidentId }, include: { category: true } });
    if (!incident) return;
    const base = await ensureCollection();
    const vector = incidentVector(`${incident.title} ${incident.description} ${incident.category?.name ?? ''} ${incident.eventId} ${incident.zoneId ?? ''}`);
    const response = await fetch(`${base}/collections/${collection}/points?wait=true`, {
      method: 'PUT', headers: qdrantHeaders(), cache: 'no-store',
      body: JSON.stringify({ points: [{ id: incident.id, vector, payload: { incidentId: incident.id, eventId: incident.eventId, zoneId: incident.zoneId, categoryId: incident.categoryId, title: incident.title, description: incident.description } }] }),
    });
    if (!response.ok) throw new Error(`Qdrant point upsert failed (${response.status})`);
    await prisma.incidentVectorSync.upsert({ where: { incidentId }, create: { incidentId, indexedAt: new Date(), lastError: null }, update: { indexedAt: new Date(), lastError: null } });
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1000) : 'Unknown Qdrant sync error';
    await prisma.incidentVectorSync.upsert({ where: { incidentId }, create: { incidentId, lastError: message }, update: { lastError: message } }).catch(() => undefined);
    console.error('Incident vector indexing deferred; PostgreSQL record remains available:', message);
  }
}

export async function searchIncidentVectors(query: string, limit = 20): Promise<string[]> {
  const base = (process.env.QDRANT_URL || 'http://127.0.0.1:6333').replace(/\/$/, '');
  const response = await fetch(`${base}/collections/${collection}/points/search`, {
    method: 'POST', headers: qdrantHeaders(), cache: 'no-store',
    body: JSON.stringify({ vector: incidentVector(query), limit, with_payload: true }),
  });
  if (!response.ok) throw new Error(`Qdrant search failed (${response.status})`);
  const body = await response.json() as { result?: Array<{ id?: string; payload?: { incidentId?: string } }> };
  return (body.result ?? []).map(point => String(point.payload?.incidentId ?? point.id ?? '')).filter(Boolean);
}
