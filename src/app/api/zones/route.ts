import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    await requireRoles('ADMIN', 'ORGANIZER');
    const venueId = request.nextUrl.searchParams.get('venueId');
    const data = await prisma.zone.findMany({
      where: venueId ? { venueId } : undefined,
      include: { venue: { select: { id: true, name: true, city: true } }, _count: { select: { gates: true, volunteerAssignments: true, staffAssignments: true } } },
      orderBy: [{ venue: { name: 'asc' } }, { name: 'asc' }],
    });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const venueId = String(body.venueId ?? '');
    const capacity = Number(body.capacity);
    if (name.length < 2 || !venueId || !Number.isInteger(capacity) || capacity < 1) return badRequest('Venue, zone name, and positive integer capacity are required');
    const data = await prisma.zone.create({ data: { name, venueId, capacity }, include: { venue: { select: { id: true, name: true, city: true } } } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Zone', entityId: data.id } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
