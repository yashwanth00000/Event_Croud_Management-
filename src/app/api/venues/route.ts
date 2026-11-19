import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET() {
  try {
    await requireUser();
    const data = await prisma.venue.findMany({ include: { zones: { include: { gates: true } }, _count: { select: { events: true } } }, orderBy: { name: 'asc' } });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'ORGANIZER');
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const rawCapacity = body.totalCapacity;
    const totalCapacity = rawCapacity === undefined || rawCapacity === null || rawCapacity === '' ? null : Number(rawCapacity);
    if (name.length < 2 || (totalCapacity !== null && (!Number.isInteger(totalCapacity) || totalCapacity < 1))) return badRequest('Venue name and, when known, a positive whole-number capacity are required');
    const venue = await prisma.venue.create({ data: { name, address: String(body.address ?? '').trim(), city: String(body.city ?? '').trim(), state: String(body.state ?? '').trim(), country: String(body.country ?? '').trim(), totalCapacity } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'CREATE', entity: 'Venue', entityId: venue.id } });
    return NextResponse.json({ data: venue }, { status: 201 });
  } catch (error) { return apiError(error); }
}
