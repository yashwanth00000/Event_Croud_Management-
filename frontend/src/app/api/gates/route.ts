import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const roles = user.roles.map(item => item.role.name.toUpperCase());
    const isAdmin = roles.includes('ADMIN') || roles.includes('ORGANIZER');
    if (!isAdmin && !roles.includes('SECURITY_STAFF') && !roles.includes('VOLUNTEER')) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    const zoneId = request.nextUrl.searchParams.get('zoneId');
    const eventId = request.nextUrl.searchParams.get('eventId');
    const forScanning = request.nextUrl.searchParams.get('forScanning') === 'true';
    const assignments = isAdmin ? [] : await Promise.all([
      roles.includes('SECURITY_STAFF') ? prisma.staffAssignment.findMany({ where: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, ...(eventId ? { eventId } : {}) }, select: { eventId: true, event: { select: { venueId: true } }, zoneId: true } }) : Promise.resolve([]),
      roles.includes('VOLUNTEER') ? prisma.volunteerAssignment.findMany({ where: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, ...(forScanning ? { canScanTickets: true } : {}), ...(eventId ? { eventId } : {}) }, select: { eventId: true, event: { select: { venueId: true } }, zoneId: true } }) : Promise.resolve([]),
    ]).then(([staff, volunteers]) => [...staff, ...volunteers]);
    if (!isAdmin && !assignments.length) return NextResponse.json({ data: [] });
    const assignedZones = assignments.flatMap(item => item.zoneId ? [item.zoneId] : []);
    const allZonesInVenue = assignments.filter(item => !item.zoneId).map(item => item.event.venueId);
    const data = await prisma.gate.findMany({
      where: {
        ...(zoneId ? { zoneId } : {}),
        ...(!isAdmin ? { OR: [{ zoneId: { in: assignedZones } }, { zone: { venueId: { in: allZonesInVenue } } }] } : {}),
      },
      include: { zone: { include: { venue: { select: { id: true, name: true } } } }, _count: { select: { gateScans: true } } },
      orderBy: [{ zone: { venue: { name: 'asc' } } }, { zone: { name: 'asc' } }, { gateCode: 'asc' }],
    });
    const scopedData = isAdmin ? data : data.map(gate => ({ ...gate, eventIds: assignments.filter(item => item.zoneId ? item.zoneId === gate.zoneId : item.event.venueId === gate.zone.venue.id).map(item => item.eventId) }));
    return NextResponse.json({ data: scopedData });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    const gateCode = String(body.gateCode ?? '').trim();
    const zoneId = String(body.zoneId ?? '');
    if (name.length < 2 || gateCode.length < 1 || !zoneId) return badRequest('Zone, gate name, and gate code are required');
    const data = await prisma.gate.create({ data: { name, gateCode, zoneId }, include: { zone: { include: { venue: { select: { id: true, name: true } } } } } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Gate', entityId: data.id } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
