import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
import { getMongoClient } from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await requireRoles('ADMIN');
    const eventId = request.nextUrl.searchParams.get('eventId');
    const requestedDays = Number(request.nextUrl.searchParams.get('days') ?? 30);
    const days = Number.isInteger(requestedDays) ? Math.min(Math.max(requestedDays, 1), 365) : 30;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const where = { observedAt: { gte: since }, ...(eventId ? { eventId } : {}) };
    try {
      const client = await getMongoClient();
      const match: Record<string, unknown> = { observedAt: { $gte: since } };
      if (eventId) match.eventId = eventId;
      const rows = await client.db(process.env.MONGODB_DATABASE || 'eventcrowd').collection('crowd_observations').aggregate([
        { $match: match },
        { $sort: { observedAt: 1 } },
        { $group: { _id: { eventId: '$eventId', zoneId: '$zoneId' }, sampleCount: { $sum: 1 }, averageOccupancy: { $avg: '$occupancy' }, peakOccupancy: { $max: '$occupancy' }, latestCapacity: { $last: '$capacity' }, latestPercentage: { $last: '$percentage' }, latestObservedAt: { $last: '$observedAt' }, latestSource: { $last: '$source' } } },
        { $sort: { latestObservedAt: -1 } },
        { $limit: 200 },
      ]).toArray();
      if (rows.length) {
        const eventIds = [...new Set(rows.map(row => String((row._id as { eventId?: string })?.eventId ?? '')).filter(Boolean))];
        const zoneIds = [...new Set(rows.map(row => String((row._id as { zoneId?: string })?.zoneId ?? '')).filter(Boolean))];
        const [events, zones] = await Promise.all([
          prisma.event.findMany({ where: { id: { in: eventIds } }, select: { id: true, name: true } }),
          prisma.zone.findMany({ where: { id: { in: zoneIds } }, select: { id: true, name: true } }),
        ]);
        const eventNames = new Map(events.map(item => [item.id, item.name]));
        const zoneNames = new Map(zones.map(item => [item.id, item.name]));
        return NextResponse.json({ data: rows.map(({ _id, ...row }, index) => {
          const ids = _id as { eventId?: string; zoneId?: string };
          return { ...row, eventName: eventNames.get(String(ids?.eventId ?? '')) ?? 'Unknown event', zoneName: zoneNames.get(String(ids?.zoneId ?? '')) ?? 'Unknown zone', rowKey: `${index}-${String(row.latestObservedAt ?? '')}` };
        }) });
      }
    } catch (mongoError) {
      console.error('MongoDB crowd report unavailable; using PostgreSQL observations:', mongoError);
    }
    const observations = await prisma.crowdObservation.findMany({
      where,
      select: { eventId: true, zoneId: true, occupancy: true, capacity: true, percentage: true, source: true, observedAt: true },
      orderBy: { observedAt: 'desc' },
      take: 10000,
    });
    const groups = new Map<string, { eventId: string; zoneId: string | null; sampleCount: number; totalOccupancy: number; peakOccupancy: number; latestCapacity: number; latestPercentage: number; latestObservedAt: Date; latestSource: string }>();
    for (const row of observations) {
      const key = `${row.eventId}:${row.zoneId ?? ''}`;
      const group = groups.get(key);
      if (group) {
        group.sampleCount += 1;
        group.totalOccupancy += row.occupancy;
        group.peakOccupancy = Math.max(group.peakOccupancy, row.occupancy);
      } else {
        groups.set(key, { eventId: row.eventId, zoneId: row.zoneId, sampleCount: 1, totalOccupancy: row.occupancy, peakOccupancy: row.occupancy, latestCapacity: row.capacity, latestPercentage: row.percentage, latestObservedAt: row.observedAt, latestSource: row.source });
      }
    }
    const grouped = [...groups.values()].map(({ totalOccupancy, ...group }) => ({ ...group, averageOccupancy: totalOccupancy / group.sampleCount })).slice(0, 200);
    const [events, zones] = await Promise.all([
      prisma.event.findMany({ where: { id: { in: [...new Set(grouped.map(row => row.eventId))] } }, select: { id: true, name: true } }),
      prisma.zone.findMany({ where: { id: { in: [...new Set(grouped.flatMap(row => row.zoneId ? [row.zoneId] : []))] } }, select: { id: true, name: true } }),
    ]);
    const eventNames = new Map(events.map(item => [item.id, item.name]));
    const zoneNames = new Map(zones.map(item => [item.id, item.name]));
    const data = grouped.map(({ eventId, zoneId, ...row }, index) => {
      const eventName = eventNames.get(eventId) ?? 'Unknown event';
      const zoneName = zoneId ? zoneNames.get(zoneId) ?? 'Unknown zone' : 'Unassigned zone';
      return { ...row, eventName, zoneName, rowKey: `${eventName}-${zoneName}-${index}` };
    });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}
