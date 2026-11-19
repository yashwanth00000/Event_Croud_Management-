import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { getCurrentUser, requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      const data = await prisma.event.findMany({
        where: { status: 'PUBLISHED', endDate: { gte: new Date() } },
        select: { id: true, name: true, description: true, startDate: true, endDate: true, venue: { select: { name: true, city: true } } },
        orderBy: { startDate: 'asc' },
      });
      return NextResponse.json({ data });
    }
    if (user.status !== 'ACTIVE') return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const roles = user.roles.map(r => r.role.name.toUpperCase());
    let where: Prisma.EventWhereInput = {};
    if (roles.includes('ADMIN')) where = {};
    else if (roles.includes('ORGANIZER')) where = { organizerId: user.id };
    else if (roles.includes('ATTENDEE')) where = { status: 'PUBLISHED', endDate: { gte: new Date() } };
    else if (roles.includes('VOLUNTEER')) where = { volunteerAssignments: { some: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, ...(request.nextUrl.searchParams.get('purpose') === 'scanning' ? { canScanTickets: true } : {}) } } };
    else if (roles.includes('SECURITY_STAFF')) where = { staffAssignments: { some: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } };
    else return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    const events = await prisma.event.findMany({ where, include: { venue: true, organizer: { select: { id: true, fullName: true } }, _count: { select: { registrations: true, ticketTypes: true } } }, orderBy: { startDate: 'asc' } });
    return NextResponse.json({ data: events });
  }
  catch (e) { return apiError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'ORGANIZER'); const b = await req.json();
    const name = String(b.name ?? '').trim(); const venueId = String(b.venueId ?? ''); const startDate = new Date(b.startDate); const endDate = new Date(b.endDate);
    if (name.length < 3 || !venueId || isNaN(+startDate) || isNaN(+endDate) || endDate <= startDate) return badRequest('Provide a valid name, venue, start date and later end date');
    const slug = String(b.slug ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')).slice(0, 90) + '-' + Math.random().toString(36).slice(2, 7);
    const event = await prisma.event.create({ data: { name, description: b.description ? String(b.description).slice(0, 5000) : null, slug, startDate, endDate, venueId, organizerId: user.id, status: 'DRAFT' }, include: { venue: true } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'CREATE', entity: 'Event', entityId: event.id } });
    return NextResponse.json({ data: event }, { status: 201 });
  } catch (e) { return apiError(e); }
}
