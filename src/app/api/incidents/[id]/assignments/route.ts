import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF'); const { id } = await params;
    const incident = await prisma.incident.findUnique({ where: { id }, select: { eventId: true, category: { select: { departmentId: true } } } });
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const scope = await prisma.staffAssignment.findFirst({ where: { staffId: user.id, eventId: incident.eventId, status: { in: ['ASSIGNED', 'ACTIVE'] } } });
    if (!isAdmin && !scope && !(user.isDepartmentManager && user.departmentId === incident.category?.departmentId)) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    const data = await prisma.incidentAssignment.findMany({ where: { incidentId: id }, include: { officer: { select: { id: true, fullName: true, email: true } }, assignedBy: { select: { fullName: true } } }, orderBy: { assignedAt: 'asc' } });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN'); const { id } = await params; const body = await request.json();
    const incident = await prisma.incident.findUnique({ where: { id }, select: { id: true, status: true, assignedToId: true, category: { select: { departmentId: true } } } });
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    if (!['REPORTED', 'INVESTIGATING'].includes(incident.status)) return badRequest('Only open incidents can be assigned');
    const officerIds: string[] = [...new Set<string>((Array.isArray(body.officerIds) ? body.officerIds : body.officerId ? [body.officerId] : []).map((value: unknown) => String(value)).filter(Boolean))];
    if (!officerIds.length || officerIds.length > 20) return badRequest('Select between 1 and 20 officers');
    const officers = await prisma.user.findMany({ where: { id: { in: officerIds }, status: 'ACTIVE', departmentId: incident.category?.departmentId ?? undefined, roles: { some: { role: { name: 'SECURITY_STAFF' } } } }, select: { id: true } });
    if (officers.length !== officerIds.length) return badRequest('Every selected officer must be active and belong to the incident department');
    const data = await prisma.$transaction(async tx => {
      const assignments = await Promise.all(officerIds.map(officerId => tx.incidentAssignment.upsert({ where: { incidentId_officerId: { incidentId: id, officerId } }, create: { incidentId: id, officerId, assignedById: actor.id }, update: {} })));
      if (!incident.assignedToId) await tx.incident.update({ where: { id }, data: { assignedToId: officerIds[0], status: 'INVESTIGATING' } });
      if (incident.status === 'REPORTED') await tx.incidentStatusHistory.create({ data: { incidentId: id, changedById: actor.id, oldStatus: 'REPORTED', newStatus: 'INVESTIGATING', remarks: 'Assigned to department officers' } });
      await tx.auditLog.create({ data: { userId: actor.id, action: 'ASSIGN', entity: 'Incident', entityId: id, details: { officerIds } } });
      return assignments;
    });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
