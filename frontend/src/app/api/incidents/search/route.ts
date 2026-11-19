import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import { visibleIncidentIds } from '@/lib/incident-access';
import { searchIncidentVectors } from '@/lib/incident-search';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const query = (request.nextUrl.searchParams.get('q') ?? '').trim();
    if (query.length < 2 || query.length > 300) return badRequest('Search text must be 2 to 300 characters');
    const allowedIds = await visibleIncidentIds(user);
    if (allowedIds && !allowedIds.length) return NextResponse.json({ data: [], mode: 'none' });
    let vectorIds: string[] = [];
    let mode = 'postgres-full-text';
    try { vectorIds = await searchIncidentVectors(query, 50); mode = 'qdrant-vector'; } catch { /* PostgreSQL remains available when Qdrant is offline. */ }

    const textRows = await prisma.$queryRaw<Array<{ id: string; rank: number }>>`
      SELECT "id", ts_rank("searchVector", plainto_tsquery('english', ${query})) AS rank
      FROM "Incident"
      WHERE "searchVector" @@ plainto_tsquery('english', ${query})
      ORDER BY rank DESC
      LIMIT 50
    `;
    const rank = new Map<string, number>();
    textRows.forEach((row, index) => rank.set(row.id, Math.max(rank.get(row.id) ?? 0, 1000 - index)));
    vectorIds.forEach((id, index) => rank.set(id, Math.max(rank.get(id) ?? 0, 500 - index)));
    const candidateIds = [...rank.keys()].filter(id => !allowedIds || allowedIds.includes(id));
    const records = candidateIds.length ? await prisma.incident.findMany({ where: { id: { in: candidateIds } }, include: { event: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } }, category: { select: { name: true, department: { select: { name: true } } } } } }) : [];
    records.sort((a, b) => (rank.get(b.id) ?? 0) - (rank.get(a.id) ?? 0));
    if (mode === 'qdrant-vector' && textRows.length) mode = 'qdrant-vector+postgres-full-text';
    return NextResponse.json({ data: records, mode });
  } catch (error) { return apiError(error); }
}
