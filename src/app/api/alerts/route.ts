import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
export async function GET() {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF');
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const where: Prisma.AlertWhereInput = isAdmin ? {} : { event: { staffAssignments: { some: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } } };
    return NextResponse.json({ data: await prisma.alert.findMany({ where, include: { event: true, zone: true, createdBy: { select: { id: true, fullName: true } } }, orderBy: { createdAt: 'desc' } }) });
  } catch(e) { return apiError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF');
    const body = await req.json();
    const eventId = String(body.eventId ?? ''), zoneId = body.zoneId ? String(body.zoneId) : null;
    const message = String(body.message ?? '').trim();
    if (!eventId || !message) return badRequest('Event and alert message are required');
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { venueId: true } });
    if (!event) return badRequest('Event was not found');
    if (zoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { venueId: true } });
      if (!zone || zone.venueId !== event.venueId) return badRequest('Zone must belong to the event venue');
    }
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    if (!isAdmin) {
      const assignment = await prisma.staffAssignment.findFirst({ where: { staffId: user.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId }, { zoneId: null }] } });
      if (!assignment) return NextResponse.json({ error: 'You are not assigned to this event or zone' }, { status: 403 });
    }
    const types = ['CAPACITY', 'CROWD_DENSITY', 'SECURITY', 'EMERGENCY'];
    const data = await prisma.alert.create({ data: { eventId, zoneId, createdById: user.id, type: types.includes(body.type) ? body.type : 'SECURITY', message: message.slice(0, 2000) } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'CREATE', entity: 'Alert', entityId: data.id } });
    return NextResponse.json({ data }, { status: 201 });
  } catch(e) { return apiError(e); }
}
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF');
    const body = await req.json();
    if (!body.id || !['ACKNOWLEDGED', 'RESOLVED'].includes(body.status)) return badRequest('Alert id and valid status required');
    const existing = await prisma.alert.findUnique({ where: { id: String(body.id) }, select: { eventId: true, zoneId: true } });
    if (!existing) return NextResponse.json({ error: 'Alert not found' }, { status: 404 });
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    if (!isAdmin) {
      const assignment = await prisma.staffAssignment.findFirst({ where: { staffId: user.id, eventId: existing.eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId: existing.zoneId }, { zoneId: null }] } });
      if (!assignment) return NextResponse.json({ error: 'You are not assigned to this alert event or zone' }, { status: 403 });
    }
    const data = await prisma.alert.update({ where: { id: String(body.id) }, data: { status: body.status, resolvedAt: body.status === 'RESOLVED' ? new Date() : null } });
    await prisma.auditLog.create({ data: { userId: user.id, action: body.status, entity: 'Alert', entityId: data.id } });
    return NextResponse.json({ data });
  } catch(e) { return apiError(e); }
}
