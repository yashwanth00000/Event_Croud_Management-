import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
import { syncIncidentToVectorIndex } from '@/lib/incident-search';

export async function POST() {
  try {
    await requireRoles('ADMIN');
    const pending = await prisma.incidentVectorSync.findMany({ where: { indexedAt: null }, orderBy: { updatedAt: 'asc' }, take: 50, select: { incidentId: true } });
    await Promise.all(pending.map(item => syncIncidentToVectorIndex(item.incidentId)));
    const remaining = await prisma.incidentVectorSync.count({ where: { indexedAt: null } });
    return NextResponse.json({ processed: pending.length, pending: remaining });
  } catch (error) { return apiError(error); }
}
