import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
type Ctx = { params: Promise<{ id: string }> };
export async function GET(_r: NextRequest, { params }: Ctx) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const roles = user.roles.map(r => r.role.name.toUpperCase());
    const conditions: Prisma.EventWhereInput[] = [{ id }];
    if (!roles.includes('ADMIN')) {
      if (roles.includes('ORGANIZER')) conditions.push({ organizerId: user.id });
      else if (roles.includes('ATTENDEE')) conditions.push({ status: 'PUBLISHED', endDate: { gte: new Date() } });
      else if (roles.includes('VOLUNTEER')) conditions.push({ volunteerAssignments: { some: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } });
      else if (roles.includes('SECURITY_STAFF')) conditions.push({ staffAssignments: { some: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } });
      else return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }
    const data = await prisma.event.findFirst({ where: { AND: conditions }, include: { venue: true, ticketTypes: true, _count: { select: { registrations: true } } } });
    return data ? NextResponse.json({ data }) : NextResponse.json({ error: 'Event not found' }, { status: 404 });
  } catch(e) { return apiError(e); }
}
export async function PATCH(req: NextRequest, { params }: Ctx) { try { const user = await requireRoles('ADMIN','ORGANIZER'); const { id } = await params; const b = await req.json(); const data: Prisma.EventUpdateInput = {}; if (b.name !== undefined) data.name = String(b.name).trim(); if (b.description !== undefined) data.description = String(b.description); if (b.venueId !== undefined) data.venue = { connect: { id: String(b.venueId) } }; if (['DRAFT','PUBLISHED','ONGOING','COMPLETED','CANCELLED'].includes(b.status)) data.status = b.status; if (b.startDate) data.startDate = new Date(b.startDate); if (b.endDate) data.endDate = new Date(b.endDate); if (data.startDate && data.endDate && new Date(data.endDate as Date) <= new Date(data.startDate as Date)) return badRequest('End date must be after start date'); const event = await prisma.event.update({ where: { id }, data }); await prisma.auditLog.create({ data: { userId: user.id, action: 'UPDATE', entity: 'Event', entityId: id } }); return NextResponse.json({ data: event }); } catch(e) { return apiError(e); } }
export async function DELETE(_r: NextRequest, { params }: Ctx) { try { const user = await requireRoles('ADMIN'); const { id } = await params; await prisma.event.delete({ where: { id } }); await prisma.auditLog.create({ data: { userId: user.id, action: 'DELETE', entity: 'Event', entityId: id } }); return NextResponse.json({ success: true }); } catch(e) { return apiError(e); } }
