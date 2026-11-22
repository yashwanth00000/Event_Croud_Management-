import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireUser, requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import { getMongoClient } from '@/lib/mongodb';
import { syncIncidentToVectorIndex } from '@/lib/incident-search';
export async function GET() {
  try {
    const user = await requireUser();
    const roles = user.roles.map(r => r.role.name.toUpperCase());
    let where: Prisma.IncidentWhereInput = {};
    if (roles.includes('ADMIN')) where = {};
    else if (roles.includes('ORGANIZER')) where = { event: { organizerId: user.id } };
    else if (roles.includes('VOLUNTEER')) where = { OR: [{ reporterId: user.id }, { event: { volunteerAssignments: { some: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } } }] };
    else if (roles.includes('SECURITY_STAFF')) where = { OR: [{ reporterId: user.id }, { assignedToId: user.id }, { assignments: { some: { officerId: user.id } } }, { event: { staffAssignments: { some: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } } }, ...(user.isDepartmentManager && user.departmentId ? [{ category: { departmentId: user.departmentId } }] : [])] };
    else if (roles.includes('ATTENDEE')) where = { reporterId: user.id };
    else return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    return NextResponse.json({ data: await prisma.incident.findMany({ where, include: { event: { select: { id: true, name: true } }, zone: true, category: { include: { department: true } }, reporter: { select: { id: true, fullName: true } }, assignedTo: { select: { id: true, fullName: true } }, statusHistory: { orderBy: { changedAt: 'asc' }, include: { changedBy: { select: { fullName: true } } } }, assignments: { include: { officer: { select: { id: true, fullName: true } } } } }, orderBy: { reportedAt: 'desc' } }) });
  } catch(e) { return apiError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF', 'VOLUNTEER', 'ATTENDEE');
    const body = await req.json();
    const eventId = String(body.eventId ?? ''), zoneId = body.zoneId ? String(body.zoneId) : null, categoryId = body.categoryId ? String(body.categoryId) : null;
    const title = String(body.title ?? '').trim(), description = String(body.description ?? '').trim();
    if (!eventId || title.length < 4 || description.length < 8) return badRequest('Event, incident title and description are required');
    const event = await prisma.event.findUnique({ where: { id: eventId }, select: { venueId: true } });
    if (!event) return badRequest('Event was not found');
    if (categoryId && !await prisma.incidentCategory.findFirst({ where: { id: categoryId, isActive: true, department: { isActive: true } } })) return badRequest('Choose an active incident category');
    if (zoneId) {
      const zone = await prisma.zone.findUnique({ where: { id: zoneId }, select: { venueId: true } });
      if (!zone || zone.venueId !== event.venueId) return badRequest('Zone must belong to the event venue');
    }
    const roles = user.roles.map(r => r.role.name.toUpperCase());
    if (roles.includes('ATTENDEE')) {
      const registration = await prisma.registration.findFirst({ where: { attendeeId: user.id, eventId, status: 'CONFIRMED' } });
      if (!registration) return NextResponse.json({ error: 'Register for this event before reporting an incident' }, { status: 403 });
    } else if (!roles.includes('ADMIN')) {
      const assignment = roles.includes('VOLUNTEER')
        ? await prisma.volunteerAssignment.findFirst({ where: { volunteerId: user.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId }, { zoneId: null }] } })
        : await prisma.staffAssignment.findFirst({ where: { staffId: user.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId }, { zoneId: null }] } });
      if (!assignment) return NextResponse.json({ error: 'You are not assigned to this event or zone' }, { status: 403 });
    }
    const incident = await prisma.$transaction(async tx => {
      const created = await tx.incident.create({ data: { eventId, zoneId, categoryId, reporterId: user.id, title, description, severity: ['LOW','MEDIUM','HIGH','CRITICAL'].includes(body.severity) ? body.severity : 'MEDIUM' } });
      await tx.incidentStatusHistory.create({ data: { incidentId: created.id, changedById: user.id, newStatus: created.status, remarks: 'Incident reported' } });
      await tx.incidentVectorSync.upsert({ where: { incidentId: created.id }, create: { incidentId: created.id }, update: { indexedAt: null, lastError: null } });
      await tx.auditLog.create({ data: { userId: user.id, action: 'REPORTED', entity: 'Incident', entityId: created.id, details: { eventId, zoneId, severity: created.severity } } });
      return created;
    });
    await syncIncidentToVectorIndex(incident.id);
    try {
      const client = await getMongoClient();
      await client.db(process.env.MONGODB_DATABASE || 'eventcrowd').collection('incident_timeline').insertOne({ incidentId: incident.id, eventId: incident.eventId, action: 'REPORTED', actorId: user.id, note: description, createdAt: incident.reportedAt });
    } catch (mirrorError) {
      console.error('Incident timeline MongoDB mirror failed; PostgreSQL incident was saved:', mirrorError);
    }
    return NextResponse.json({ data: incident }, { status: 201 });
  } catch(e) { return apiError(e); }
}
