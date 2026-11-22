import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import type { Prisma } from '@prisma/client';
import { getMongoClient } from '@/lib/mongodb';

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const roles = user.roles.map(role => role.role.name.toUpperCase());
    const requestedEvent = req.nextUrl.searchParams.get('eventId');
    const isAdmin = roles.includes('ADMIN') || roles.includes('ORGANIZER');
    let where: Prisma.CrowdObservationWhereInput = requestedEvent ? { eventId: requestedEvent } : {};
    if (!isAdmin) {
      const assignments = roles.includes('VOLUNTEER')
        ? await prisma.volunteerAssignment.findMany({ where: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, event: { name: { not: { contains: 'demo' } } }, ...(requestedEvent ? { eventId: requestedEvent } : {}) }, select: { eventId: true, zoneId: true } })
        : roles.includes('SECURITY_STAFF')
          ? await prisma.staffAssignment.findMany({ where: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, event: { name: { not: { contains: 'demo' } } }, ...(requestedEvent ? { eventId: requestedEvent } : {}) }, select: { eventId: true, zoneId: true } })
          : [];
      if (!assignments.length) {
        // Unassigned training accounts may view only clearly labeled MongoDB sample data in development.
        // This never grants access to operational PostgreSQL observations or to production users.
        const isTrainingRole = roles.includes('VOLUNTEER') || roles.includes('SECURITY_STAFF');
        if (process.env.NODE_ENV !== 'production' && isTrainingRole) {
          try {
            const client = await getMongoClient();
            const syntheticRows = await client.db(process.env.MONGODB_DATABASE || 'eventcrowd')
              .collection('crowd_observations')
              .find({ synthetic: true, ...(requestedEvent ? { eventId: requestedEvent } : {}) })
              .sort({ observedAt: -1 })
              .limit(200)
              .toArray();
            if (syntheticRows.length) {
              const eventIds = [...new Set(syntheticRows.map(row => String(row.eventId ?? '')).filter(Boolean))];
              const zoneIds = [...new Set(syntheticRows.map(row => String(row.zoneId ?? '')).filter(Boolean))];
              const [events, zones] = await Promise.all([
                prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true } }),
                prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } }),
              ]);
              const eventById = new Map(events.map(event => [event.id, event]));
              const zoneById = new Map(zones.map(zone => [zone.id, zone]));
              const data = syntheticRows.filter(row => {
                const event = eventById.get(String(row.eventId ?? ''));
                return event && !event.name.toLowerCase().includes('demo');
              }).map(row => {
                const eventId = String(row.eventId ?? 'synthetic-event');
                const zoneId = String(row.zoneId ?? 'synthetic-zone');
                const event = eventById.get(eventId);
                const zone = zoneById.get(zoneId);
                return {
                  id: String(row.seedKey ?? row._id),
                  name: 'Synthetic crowd reading',
                  status: `${Number(row.percentage ?? 0)}% occupied · SAMPLE`,
                  event: { id: eventId, name: event?.name ?? 'Event' },
                  zone: { id: zoneId, name: zone?.name ?? 'Zone' },
                  occupancy: Number(row.occupancy ?? 0),
                  capacity: Number(row.capacity ?? 0),
                  percentage: Number(row.percentage ?? 0),
                  observedAt: row.observedAt,
                  source: 'synthetic',
                  synthetic: true,
                };
              });
              if (data.length) return NextResponse.json({ data, notice: 'Sample crowd readings are labeled as synthetic. An active event assignment is required for live operational data.' });
            }
          } catch (mongoError) {
            console.error('Synthetic MongoDB training samples unavailable:', mongoError);
          }
        }
        return NextResponse.json({ error: 'You have no active event assignments yet. Ask an administrator to assign you to an event.' }, { status: 403 });
      }
      const eventIds = [...new Set(assignments.map(item => item.eventId))];
      const zones = assignments.flatMap(item => item.zoneId ? [item.zoneId] : []);
      const allZonesForEvent = assignments.some(item => !item.zoneId);
      where = { eventId: { in: eventIds }, ...(allZonesForEvent ? {} : { zoneId: { in: zones } }) };
    }
    const data = await prisma.crowdObservation.findMany({ where, include: { event: { select: { id: true, name: true } }, zone: { select: { id: true, name: true } } }, orderBy: { observedAt: 'desc' }, take: 200 });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF', 'VOLUNTEER');
    const body = await req.json();
    const eventId = String(body.eventId ?? ''), zoneId = String(body.zoneId ?? '');
    const occupancy = Number(body.occupancy), capacity = Number(body.capacity);
    if (!eventId || !zoneId || !Number.isInteger(occupancy) || occupancy < 0 || !Number.isInteger(capacity) || capacity < 1 || occupancy > capacity * 2) return badRequest('Valid eventId, zoneId, occupancy and capacity are required');
    const [event, zone] = await Promise.all([
      prisma.event.findUnique({ where: { id: eventId }, select: { venueId: true } }),
      prisma.zone.findUnique({ where: { id: zoneId }, select: { venueId: true } }),
    ]);
    if (!event || !zone || event.venueId !== zone.venueId) return badRequest('The zone must belong to the event venue');
    const roles = user.roles.map(role => role.role.name.toUpperCase());
    const isAdmin = roles.includes('ADMIN') || roles.includes('ORGANIZER');
    if (!isAdmin) {
      const assignment = roles.includes('VOLUNTEER')
        ? await prisma.volunteerAssignment.findFirst({ where: { volunteerId: user.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId }, { zoneId: null }] } })
        : await prisma.staffAssignment.findFirst({ where: { staffId: user.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId }, { zoneId: null }] } });
      if (!assignment) return NextResponse.json({ error: 'You are not assigned to this event or zone' }, { status: 403 });
    }
    const percentage = Math.round(occupancy / capacity * 100);
    const result = await prisma.$transaction(async tx => {
      const data = await tx.crowdObservation.create({ data: { eventId, zoneId, occupancy, capacity, percentage, source: 'staff', observedBy: user.id } });
      if (percentage >= 85) {
        await tx.alert.create({ data: { eventId, zoneId, createdById: user.id, type: percentage >= 100 ? 'CAPACITY' : 'CROWD_DENSITY', message: `Zone occupancy reached ${percentage}% (${occupancy}/${capacity})` } });
      }
      await tx.auditLog.create({ data: { userId: user.id, action: 'CREATE', entity: 'CrowdObservation', entityId: data.id, details: { eventId, zoneId, percentage } } });
      return data;
    });
    // PostgreSQL is the source of truth; MongoDB keeps the time-series document for NoSQL reporting.
    try {
      const client = await getMongoClient();
      const db = client.db(process.env.MONGODB_DATABASE || 'eventcrowd');
      await db.collection('crowd_observations').insertOne({ postgresId: result.id, eventId, zoneId, occupancy, capacity, percentage, source: 'staff', observedBy: user.id, observedAt: result.observedAt });
      if (percentage >= 85) await db.collection('system_activity').insertOne({ type: 'CAPACITY_WARNING', eventId, zoneId, percentage, message: `Zone occupancy reached ${percentage}%`, createdAt: result.observedAt, actorId: user.id });
    } catch (mirrorError) {
      console.error('Crowd observation MongoDB mirror failed; PostgreSQL record was saved:', mirrorError);
    }
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (error) { return apiError(error); }
}
