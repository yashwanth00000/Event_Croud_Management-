import { existsSync, readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';

if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

if (!process.env.DATABASE_URL || !process.env.MONGODB_URI) throw new Error('Set DATABASE_URL and MONGODB_URI before seeding.');

const prisma = new PrismaClient();
const mongo = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 3000 });
const database = process.env.MONGODB_DATABASE || 'eventcrowd';
const batch = 'eventcrowd-pes-events-synthetic-operations-v1';
const events = [
  { key: 'EUPHORIA', id: '5e000000-0000-4000-8000-000000000001', zoneId: '5e100000-0000-4000-8000-000000000001', gateId: '5e200000-0000-4000-8000-000000000001', zoneName: 'Synthetic Main Entrance', gateName: 'Synthetic Gate A', gateCode: 'SYN-EUP-G1' },
  { key: 'AAT', id: '5e000000-0000-4000-8000-000000000002', zoneId: '5e100000-0000-4000-8000-000000000002', gateId: '5e200000-0000-4000-8000-000000000002', zoneName: 'Synthetic Main Entrance', gateName: 'Synthetic Gate A', gateCode: 'SYN-AAT-G1' },
];
const makeId = (prefix, number) => `${prefix}-0000-4000-8000-${String(number).padStart(12, '0')}`;

try {
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } }, orderBy: { createdAt: 'asc' }, select: { id: true } });
  if (!admin) throw new Error('An active administrator is required to seed these records.');
  const [savedEvents, attendees, staff, volunteers] = await Promise.all([
    prisma.event.findMany({ where: { id: { in: events.map(event => event.id) } }, select: { id: true, name: true, status: true, venueId: true, startDate: true, endDate: true } }),
    prisma.user.findMany({ where: { status: 'ACTIVE', email: { startsWith: 'demo.attendee.' }, roles: { some: { role: { name: 'ATTENDEE' } } } }, orderBy: { email: 'asc' }, take: 4, select: { id: true, fullName: true, email: true } }),
    prisma.user.findMany({ where: { status: 'ACTIVE', email: { endsWith: '.staff@example.com' }, roles: { some: { role: { name: 'SECURITY_STAFF' } } } }, orderBy: { email: 'asc' }, take: 5, select: { id: true, fullName: true } }),
    prisma.user.findMany({ where: { status: 'ACTIVE', email: { endsWith: '.volunteer@example.com' }, roles: { some: { role: { name: 'VOLUNTEER' } } } }, orderBy: { email: 'asc' }, take: 5, select: { id: true, fullName: true } }),
  ]);
  if (savedEvents.length !== events.length) throw new Error('Import Euphoria and Aatmatrisha before running this seeder.');
  if (attendees.length < 4 || staff.length < 4 || volunteers.length < 4) throw new Error('Seed at least four demo attendees, four demo staff, and four demo volunteers first.');
  const eventById = new Map(savedEvents.map(event => [event.id, event]));

  const seeded = await prisma.$transaction(async tx => {
    const result = { zones: 0, gates: 0, ticketTypes: 0, registrations: 0, tickets: 0, staffAssignments: 0, volunteerAssignments: 0, scans: 0, crowdObservations: 0, incidents: 0, alerts: 0, auditLogs: 0 };
    const mongoRows = { incidents: [], observations: [], scans: [], alerts: [] };
    for (let eventIndex = 0; eventIndex < events.length; eventIndex++) {
      const seed = events[eventIndex];
      const event = eventById.get(seed.id);
      if (!event) throw new Error(`Missing event ${seed.key}.`);
      const zone = await tx.zone.upsert({ where: { venueId_name: { venueId: event.venueId, name: `[SYNTHETIC] ${seed.zoneName}` } }, update: { capacity: 300 }, create: { id: seed.zoneId, name: `[SYNTHETIC] ${seed.zoneName}`, capacity: 300, venueId: event.venueId } });
      const gate = await tx.gate.upsert({ where: { zoneId_gateCode: { zoneId: zone.id, gateCode: seed.gateCode } }, update: { name: `[SYNTHETIC] ${seed.gateName}`, isActive: true }, create: { id: seed.gateId, name: `[SYNTHETIC] ${seed.gateName}`, gateCode: seed.gateCode, zoneId: zone.id } });
      result.zones++; result.gates++;

      const types = await Promise.all(['General Admission', 'Student Pass'].map((name, typeIndex) => tx.ticketType.upsert({
        where: { eventId_name: { eventId: event.id, name: `[SYNTHETIC] ${name}` } },
        update: { quantity: 100, price: typeIndex ? 0 : 250, soldCount: 2 },
        create: { eventId: event.id, name: `[SYNTHETIC] ${name}`, quantity: 100, price: typeIndex ? 0 : 250, soldCount: 2 },
      })));
      result.ticketTypes += types.length;

      for (let index = 0; index < 2; index++) {
        const shiftStart = event.startDate, shiftEnd = event.endDate;
        const staffId = staff[(eventIndex * 2 + index) % staff.length].id;
        await tx.staffAssignment.upsert({ where: { id: makeId('5e300000', eventIndex * 2 + index + 1) }, update: { staffId, eventId: event.id, zoneId: zone.id, shiftStart, shiftEnd, status: 'COMPLETED' }, create: { id: makeId('5e300000', eventIndex * 2 + index + 1), staffId, eventId: event.id, zoneId: zone.id, shiftStart, shiftEnd, status: 'COMPLETED' } });
        const volunteerId = volunteers[(eventIndex * 2 + index) % volunteers.length].id;
        await tx.volunteerAssignment.upsert({ where: { id: makeId('5e400000', eventIndex * 2 + index + 1) }, update: { volunteerId, eventId: event.id, zoneId: zone.id, canScanTickets: index === 0, shiftStart, shiftEnd, status: 'COMPLETED' }, create: { id: makeId('5e400000', eventIndex * 2 + index + 1), volunteerId, eventId: event.id, zoneId: zone.id, canScanTickets: index === 0, shiftStart, shiftEnd, status: 'COMPLETED' } });
        result.staffAssignments++; result.volunteerAssignments++;
      }

      const tickets = [];
      for (let index = 0; index < 4; index++) {
        const attendee = attendees[index];
        const registration = await tx.registration.upsert({
          where: { attendeeId_eventId: { attendeeId: attendee.id, eventId: event.id } },
          update: { registrationNumber: `SYN-${seed.key}-${String(index + 1).padStart(3, '0')}`, status: 'CONFIRMED' },
          create: { registrationNumber: `SYN-${seed.key}-${String(index + 1).padStart(3, '0')}`, attendeeId: attendee.id, eventId: event.id, status: 'CONFIRMED', createdAt: event.startDate },
        });
        result.registrations++;
        const qrCode = `SYNTHETIC-${seed.key}-TICKET-${String(index + 1).padStart(3, '0')}`;
        const ticket = await tx.ticket.upsert({ where: { qrCode }, update: { registrationId: registration.id, ticketTypeId: types[index % 2].id, status: 'USED', issuedAt: event.startDate }, create: { registrationId: registration.id, ticketTypeId: types[index % 2].id, qrCode, status: 'USED', issuedAt: event.startDate } });
        tickets.push(ticket); result.tickets++;
        const scanId = makeId('5e800000', eventIndex * 10 + index + 1);
        const scannedById = staff[(eventIndex + index) % staff.length].id;
        const scanAt = new Date(event.startDate.getTime() + (index + 1) * 45 * 60 * 1000);
        await tx.gateScan.upsert({ where: { id: scanId }, update: { ticketId: ticket.id, gateId: gate.id, eventId: event.id, scannedById, scanType: 'ENTRY', result: 'ACCEPTED', scannedAt: scanAt }, create: { id: scanId, ticketId: ticket.id, gateId: gate.id, eventId: event.id, scannedById, scanType: 'ENTRY', result: 'ACCEPTED', scannedAt: scanAt } });
        mongoRows.scans.push({ id: scanId, ticketId: ticket.id, eventId: event.id, attendeeId: attendee.id, gateId: gate.id, scannedById, result: 'ACCEPTED', scannedAt: scanAt });
        result.scans++;
      }
      const duplicateScanId = makeId('5e800000', eventIndex * 10 + 9);
      const duplicateAt = new Date(event.endDate.getTime() - 10 * 60 * 1000);
      await tx.gateScan.upsert({ where: { id: duplicateScanId }, update: { ticketId: tickets[0].id, gateId: gate.id, eventId: event.id, scannedById: staff[eventIndex].id, scanType: 'ENTRY', result: 'REJECTED', scannedAt: duplicateAt }, create: { id: duplicateScanId, ticketId: tickets[0].id, gateId: gate.id, eventId: event.id, scannedById: staff[eventIndex].id, scanType: 'ENTRY', result: 'REJECTED', scannedAt: duplicateAt } });
      mongoRows.scans.push({ id: duplicateScanId, ticketId: tickets[0].id, eventId: event.id, attendeeId: attendees[0].id, gateId: gate.id, scannedById: staff[eventIndex].id, result: 'REJECTED', scannedAt: duplicateAt });
      result.scans++;

      for (let index = 0; index < 3; index++) {
        const occupancy = [48, 72, 91][index], capacity = zone.capacity;
        const observation = await tx.crowdObservation.upsert({ where: { id: makeId('5e700000', eventIndex * 10 + index + 1) }, update: { eventId: event.id, zoneId: zone.id, occupancy, capacity, percentage: Math.round(occupancy / capacity * 100), source: 'synthetic', observedBy: staff[index].id, observedAt: new Date(event.startDate.getTime() + (index + 1) * 60 * 60 * 1000) }, create: { id: makeId('5e700000', eventIndex * 10 + index + 1), eventId: event.id, zoneId: zone.id, occupancy, capacity, percentage: Math.round(occupancy / capacity * 100), source: 'synthetic', observedBy: staff[index].id, observedAt: new Date(event.startDate.getTime() + (index + 1) * 60 * 60 * 1000) } });
        mongoRows.observations.push(observation); result.crowdObservations++;
      }

      for (let index = 0; index < 2; index++) {
        const incidentId = makeId('5e500000', eventIndex * 2 + index + 1);
        const title = `[SYNTHETIC] ${index ? 'Queue flow support' : 'Guest assistance request'}`;
        const description = `[SYNTHETIC SAMPLE] ${index ? 'A short queue was monitored and cleared by the event team.' : 'A guest assistance request was received and resolved by the event team.'}`;
        const reportedAt = new Date(event.startDate.getTime() + (index + 2) * 60 * 60 * 1000);
        const incident = await tx.incident.upsert({ where: { id: incidentId }, update: { eventId: event.id, zoneId: zone.id, reporterId: volunteers[eventIndex * 2 + index].id, assignedToId: staff[eventIndex * 2 + index].id, title, description, severity: index ? 'MEDIUM' : 'LOW', status: 'RESOLVED', reportedAt, resolvedAt: new Date(reportedAt.getTime() + 20 * 60 * 1000) }, create: { id: incidentId, eventId: event.id, zoneId: zone.id, reporterId: volunteers[eventIndex * 2 + index].id, assignedToId: staff[eventIndex * 2 + index].id, title, description, severity: index ? 'MEDIUM' : 'LOW', status: 'RESOLVED', reportedAt, resolvedAt: new Date(reportedAt.getTime() + 20 * 60 * 1000) } });
        mongoRows.incidents.push(incident); result.incidents++;
      }

      for (let index = 0; index < 2; index++) {
        const alert = await tx.alert.upsert({ where: { id: makeId('5e600000', eventIndex * 2 + index + 1) }, update: { eventId: event.id, zoneId: zone.id, createdById: admin.id, type: index ? 'SECURITY' : 'CROWD_DENSITY', message: `[SYNTHETIC SAMPLE] ${index ? 'Security check completed at the demonstration gate.' : 'Demonstration crowd level reached the sample review threshold.'}`, status: 'RESOLVED', createdAt: new Date(event.endDate.getTime() - (index + 1) * 30 * 60 * 1000), resolvedAt: event.endDate }, create: { id: makeId('5e600000', eventIndex * 2 + index + 1), eventId: event.id, zoneId: zone.id, createdById: admin.id, type: index ? 'SECURITY' : 'CROWD_DENSITY', message: `[SYNTHETIC SAMPLE] ${index ? 'Security check completed at the demonstration gate.' : 'Demonstration crowd level reached the sample review threshold.'}`, status: 'RESOLVED', createdAt: new Date(event.endDate.getTime() - (index + 1) * 30 * 60 * 1000), resolvedAt: event.endDate } });
        mongoRows.alerts.push(alert); result.alerts++;
      }

      await tx.auditLog.upsert({ where: { id: makeId('5e900000', eventIndex + 1) }, update: { userId: admin.id, action: 'SEED_SYNTHETIC_EVENT_DATA', entity: 'Event', entityId: event.id, details: { synthetic: true, seedBatch: batch } }, create: { id: makeId('5e900000', eventIndex + 1), userId: admin.id, action: 'SEED_SYNTHETIC_EVENT_DATA', entity: 'Event', entityId: event.id, details: { synthetic: true, seedBatch: batch } } });
      result.auditLogs++;
    }
    return { counts: result, mongoRows };
  }, { timeout: 30000 });

  console.log(JSON.stringify({ synthetic: true, seedBatch: batch, postgres: seeded.counts, events: savedEvents.map(event => ({ id: event.id, name: event.name, status: event.status })) }, null, 2));
  const db = await mongo.connect().then(client => client.db(database));
  for (const incident of seeded.mongoRows.incidents) {
    await db.collection('incident_timeline').updateOne({ seedKey: `${batch}-incident-${incident.id}` }, { $set: { seedKey: `${batch}-incident-${incident.id}`, incidentId: incident.id, eventId: incident.eventId, action: incident.status, actorId: incident.reporterId, note: incident.description, createdAt: incident.reportedAt, synthetic: true, seedBatch: batch } }, { upsert: true });
  }
  for (const observation of seeded.mongoRows.observations) {
    await db.collection('crowd_observations').updateOne({ seedKey: `${batch}-crowd-${observation.id}` }, { $set: { seedKey: `${batch}-crowd-${observation.id}`, postgresId: observation.id, eventId: observation.eventId, zoneId: observation.zoneId, occupancy: observation.occupancy, capacity: observation.capacity, percentage: observation.percentage, source: 'synthetic', observedBy: observation.observedBy, observedAt: observation.observedAt, synthetic: true, seedBatch: batch } }, { upsert: true });
  }
  for (const scan of seeded.mongoRows.scans) {
    await db.collection('system_activity').updateOne({ seedKey: `${batch}-scan-${scan.id}` }, { $set: { seedKey: `${batch}-scan-${scan.id}`, type: 'ATTENDEE_CHECK_IN', ...scan, synthetic: true, seedBatch: batch } }, { upsert: true });
  }
  for (const alert of seeded.mongoRows.alerts) {
    await db.collection('system_activity').updateOne({ seedKey: `${batch}-alert-${alert.id}` }, { $set: { seedKey: `${batch}-alert-${alert.id}`, type: 'SYNTHETIC_ALERT', eventId: alert.eventId, zoneId: alert.zoneId, message: alert.message, status: alert.status, createdAt: alert.createdAt, synthetic: true, seedBatch: batch } }, { upsert: true });
  }
  console.log(JSON.stringify({ synthetic: true, seedBatch: batch, events: savedEvents.map(event => ({ id: event.id, name: event.name, status: event.status })), postgres: seeded.counts, mongodb: { incident_timeline: seeded.mongoRows.incidents.length, crowd_observations: seeded.mongoRows.observations.length, system_activity: seeded.mongoRows.scans.length + seeded.mongoRows.alerts.length } }, null, 2));
} catch (error) {
  console.error(`Synthetic PostgreSQL records may have been saved; MongoDB mirror was not confirmed. ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
} finally {
  await mongo.close().catch(() => {});
  await prisma.$disconnect();
}
