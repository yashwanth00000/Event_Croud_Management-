import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET() {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const isAdmin = actor.roles.some(r => r.role.name.toUpperCase() === 'ADMIN');
    const scope = isAdmin ? undefined : { event: { organizerId: actor.id } };
    const [volunteers, staff] = await Promise.all([
      prisma.volunteerAssignment.findMany({ where: scope, include: { volunteer: { select: { id: true, fullName: true, email: true } }, event: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } } }, orderBy: { shiftStart: 'desc' } }),
      prisma.staffAssignment.findMany({ where: scope, include: { staff: { select: { id: true, fullName: true, email: true } }, event: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } } }, orderBy: { shiftStart: 'desc' } }),
    ]);
    return NextResponse.json({ data: [...volunteers.map(a => ({ ...a, role: 'VOLUNTEER', person: a.volunteer })), ...staff.map(a => ({ ...a, role: 'SECURITY_STAFF', person: a.staff }))] });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const body = await request.json();
    const role = String(body.role ?? '').toUpperCase();
    const userId = String(body.userId ?? '');
    const eventId = String(body.eventId ?? '');
    const zoneId = body.zoneId ? String(body.zoneId) : null;
    const shiftStart = new Date(body.shiftStart);
    const shiftEnd = new Date(body.shiftEnd);
    if (!['VOLUNTEER', 'SECURITY_STAFF'].includes(role) || !userId || !eventId || Number.isNaN(+shiftStart) || Number.isNaN(+shiftEnd) || shiftEnd <= shiftStart) return badRequest('Choose a role, person, event and a valid shift range');
    const targetRole = role === 'VOLUNTEER' ? 'VOLUNTEER' : 'SECURITY_STAFF';
    const [person, event, zone] = await Promise.all([
      prisma.user.findFirst({ where: { id: userId, status: 'ACTIVE', roles: { some: { role: { name: targetRole } } } }, select: { id: true } }),
      prisma.event.findUnique({ where: { id: eventId }, select: { id: true, venueId: true, organizerId: true } }),
      zoneId ? prisma.zone.findUnique({ where: { id: zoneId }, select: { id: true, venueId: true } }) : Promise.resolve(null),
    ]);
    if (!person) return badRequest(`Select an active ${role === 'VOLUNTEER' ? 'volunteer' : 'security staff member'}`);
    if (!event || (actor.roles.some(r => r.role.name.toUpperCase() === 'ORGANIZER') && event.organizerId !== actor.id)) return badRequest('Event is unavailable to this account');
    if (zoneId && (!zone || zone.venueId !== event.venueId)) return badRequest('The selected zone must belong to the event venue');
    const data = role === 'VOLUNTEER'
      ? await prisma.volunteerAssignment.create({ data: { volunteerId: userId, eventId, zoneId, shiftStart, shiftEnd, canScanTickets: body.canScanTickets === true }, include: { volunteer: { select: { id: true, fullName: true } }, event: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } } } })
      : await prisma.staffAssignment.create({ data: { staffId: userId, eventId, zoneId, shiftStart, shiftEnd }, include: { staff: { select: { id: true, fullName: true } }, event: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } } } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'ASSIGN', entity: role === 'VOLUNTEER' ? 'VolunteerAssignment' : 'StaffAssignment', entityId: data.id } });
    return NextResponse.json({ data: { ...data, role } }, { status: 201 });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN');
    const body = await request.json();
    const id = String(body.id ?? '');
    const role = String(body.role ?? '').toUpperCase();
    const status = String(body.status ?? '').toUpperCase();
    if (!id || !['VOLUNTEER', 'SECURITY_STAFF'].includes(role)) return badRequest('Assignment ID and valid role are required');
    if (role === 'VOLUNTEER' && typeof body.canScanTickets === 'boolean') {
      const assignment = await prisma.volunteerAssignment.update({ where: { id }, data: { canScanTickets: body.canScanTickets } });
      await prisma.auditLog.create({ data: { userId: actor.id, action: body.canScanTickets ? 'GRANT_SCAN_ACCESS' : 'REVOKE_SCAN_ACCESS', entity: 'VolunteerAssignment', entityId: id, details: { canScanTickets: body.canScanTickets } } });
      return NextResponse.json({ data: assignment });
    }
    if (!['ASSIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].includes(status)) return badRequest('A valid assignment status is required');
    const assignment = role === 'VOLUNTEER'
      ? await prisma.volunteerAssignment.update({ where: { id }, data: { status: status as 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' } })
      : await prisma.staffAssignment.update({ where: { id }, data: { status: status as 'ASSIGNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'STATUS_CHANGE', entity: role === 'VOLUNTEER' ? 'VolunteerAssignment' : 'StaffAssignment', entityId: id, details: { status } } });
    return NextResponse.json({ data: assignment });
  } catch (error) { return apiError(error); }
}
