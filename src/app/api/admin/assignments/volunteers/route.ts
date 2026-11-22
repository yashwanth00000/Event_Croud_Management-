import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
export async function GET() {
  try {
    const user = await requireRoles('ADMIN', 'VOLUNTEER');
    const isAdmin = user.roles.some(r => r.role.name.toUpperCase() === 'ADMIN');
    const data = await prisma.volunteerAssignment.findMany({ where: isAdmin ? {} : { volunteerId: user.id }, include: { volunteer: { select: { id: true, fullName: true, email: true } }, event: true, zone: true }, orderBy: { shiftStart: 'asc' } });
    return NextResponse.json({ data });
  } catch (e) { return apiError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const admin = await requireRoles('ADMIN');
    const b = await req.json();
    const volunteerId = String(b.volunteerId ?? ''), eventId = String(b.eventId ?? '');
    const shiftStart = new Date(b.shiftStart), shiftEnd = new Date(b.shiftEnd);
    if (!volunteerId || !eventId || isNaN(+shiftStart) || isNaN(+shiftEnd) || shiftEnd <= shiftStart) return badRequest('Volunteer, event and valid shift times are required');
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { venueId: true } });
    if (!event) return badRequest('Event was not found');
    if (b.zoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: String(b.zoneId) }, select: { venueId: true } });
      if (!zone || zone.venueId !== event.venueId) return badRequest('Zone must belong to the event venue');
    }
    const volunteer = await prisma.user.findFirst({ where: { id: volunteerId, status: 'ACTIVE', roles: { some: { role: { name: 'VOLUNTEER' } } } } });
    if (!volunteer) return badRequest('Volunteer must be approved and active');
    const data = await prisma.volunteerAssignment.create({ data: { volunteerId, eventId, zoneId: b.zoneId || null, shiftStart, shiftEnd } });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'ASSIGN', entity: 'VolunteerAssignment', entityId: data.id } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (e) { return apiError(e); }
}
