import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import { notifyIncidentStakeholders } from '@/lib/civic-notifications';
import { syncIncidentToVectorIndex } from '@/lib/incident-search';
import { getMongoClient } from '@/lib/mongodb';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF', 'ATTENDEE');
    const { id } = await params;
    const existing = await prisma.incident.findUnique({ where: { id }, include: { event: { select: { organizerId: true } } } });
    if (!existing) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const isReporter = existing.reporterId === user.id;
    const canEditNewReport = isReporter && existing.status === 'REPORTED' && user.roles.some(role => role.role.name.toUpperCase() === 'ATTENDEE');
    if (!isAdmin && !canEditNewReport) {
      if (user.isDepartmentManager && user.departmentId && existing.categoryId) {
        const category = await prisma.incidentCategory.findFirst({ where: { id: existing.categoryId, departmentId: user.departmentId, isActive: true } });
        if (category) {
          // Department managers can manage incidents in their own category department.
        } else {
          return NextResponse.json({ error: 'You are not assigned to this incident department' }, { status: 403 });
        }
      } else {
      const assignment = await prisma.staffAssignment.findFirst({ where: { staffId: user.id, eventId: existing.eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId: existing.zoneId }, { zoneId: null }] } });
      if (!assignment) return NextResponse.json({ error: 'You are not assigned to this incident event or zone' }, { status: 403 });
      }
    }

    const body = await request.json();
    const data: Prisma.IncidentUncheckedUpdateInput = {};
    if (canEditNewReport) {
      if (typeof body.title === 'string') {
        const title = body.title.trim();
        if (title.length < 4 || title.length > 160) return badRequest('Incident title must be 4 to 160 characters');
        data.title = title;
      }
      if (typeof body.description === 'string') {
        const description = body.description.trim();
        if (description.length < 8 || description.length > 4000) return badRequest('Incident description must be 8 to 4000 characters');
        data.description = description;
      }
      if (body.categoryId !== undefined) {
        const categoryId = body.categoryId ? String(body.categoryId) : null;
        if (categoryId && !await prisma.incidentCategory.findFirst({ where: { id: categoryId, isActive: true } })) return badRequest('Choose an active incident category');
        data.categoryId = categoryId;
      }
      if (body.severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(body.severity)) data.severity = body.severity;
    }
    if (!canEditNewReport && ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'].includes(body.status)) {
      data.status = body.status;
      data.resolvedAt = ['RESOLVED', 'CLOSED'].includes(body.status) ? new Date() : null;
    }
    if (!canEditNewReport && body.assignedToId !== undefined) {
      const assignedToId = body.assignedToId ? String(body.assignedToId) : null;
      if (assignedToId) {
        const candidate = await prisma.user.findFirst({ where: { id: assignedToId, status: 'ACTIVE', roles: { some: { role: { name: { in: ['VOLUNTEER', 'SECURITY_STAFF'] } } } } } });
        if (!candidate) return badRequest('Assignee must be an active volunteer or security staff member');
      }
      data.assignedToId = assignedToId;
    }
    if (body.categoryId !== undefined) {
      const categoryId = body.categoryId ? String(body.categoryId) : null;
      if (categoryId && !await prisma.incidentCategory.findFirst({ where: { id: categoryId, isActive: true } })) return badRequest('Choose an active incident category');
      data.categoryId = categoryId;
    }
    if (body.severity && ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(body.severity)) data.severity = body.severity;
    if (!Object.keys(data).length) return badRequest('No valid incident updates supplied');

    const incident = await prisma.$transaction(async tx => {
      const updated = await tx.incident.update({ where: { id }, data });
      if (data.status && data.status !== existing.status) {
        await tx.incidentStatusHistory.create({ data: { incidentId: id, changedById: user.id, oldStatus: existing.status, newStatus: updated.status, remarks: typeof body.remarks === 'string' ? body.remarks.slice(0, 1000) : null } });
      }
      if (data.assignedToId && data.assignedToId !== existing.assignedToId) {
        await tx.incidentAssignment.upsert({ where: { incidentId_officerId: { incidentId: id, officerId: data.assignedToId as string } }, create: { incidentId: id, officerId: data.assignedToId as string, assignedById: user.id }, update: {} });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: 'UPDATE', entity: 'Incident', entityId: id, details: { status: data.status, severity: data.severity, assignedToId: data.assignedToId, categoryId: data.categoryId } } });
      return updated;
    });

    if (data.status && data.status !== existing.status) {
      await notifyIncidentStakeholders({ reporterId: existing.reporterId, actorId: user.id, incidentId: id, type: 'INCIDENT_STATUS', message: `Incident status changed to ${String(data.status).toLowerCase().replace('_', ' ')}.` }).catch(error => console.error('Incident status notification failed:', error));
      getMongoClient().then(client => client.db(process.env.MONGODB_DATABASE || 'eventcrowd').collection('incident_timeline').insertOne({ incidentId: id, eventId: incident.eventId, action: 'STATUS_CHANGED', oldStatus: existing.status, newStatus: data.status, actorId: user.id, createdAt: new Date() })).catch(error => console.error('MongoDB incident history mirror failed:', error));
    }
    if (data.categoryId !== undefined || data.title !== undefined || data.description !== undefined) await syncIncidentToVectorIndex(id);
    return NextResponse.json({ data: incident });
  } catch (error) { return apiError(error); }
}
