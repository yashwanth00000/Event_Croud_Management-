import { existsSync, readFileSync } from 'node:fs';
import { randomBytes, scryptSync } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { MongoClient } from 'mongodb';

// Load local configuration when invoked directly with `npm run`.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
  }
}

if (!process.env.DATABASE_URL) throw new Error('Set DATABASE_URL in .env before seeding.');
if (!process.env.MONGODB_URI) throw new Error('Set MONGODB_URI in .env before seeding.');

const prisma = new PrismaClient();
const mongo = new MongoClient(process.env.MONGODB_URI);
const database = process.env.MONGODB_DATABASE || 'eventcrowd';
const base = 'd1000000-0000-4000-8000-0000000000';
const ids = {
  venue: `${base}01`, event: 'd2000000-0000-4000-8000-000000000001',
  liveEvent: 'd2000000-0000-4000-8000-000000000002',
  zones: ['d3000000-0000-4000-8000-000000000001', 'd3000000-0000-4000-8000-000000000002'],
  gates: ['d4000000-0000-4000-8000-000000000001', 'd4000000-0000-4000-8000-000000000002'],
};
const prefix = 'EventCrowd Synthetic Demo';
const now = new Date();
const eventStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
const eventEnd = new Date(eventStart.getTime() + 10 * 60 * 60 * 1000);
const credentials = [];
const counts = {};

function passwordHash(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}

async function ensureUser({ fullName, email, roleName, fixedPassword }) {
  const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: `Synthetic demo ${roleName.toLowerCase()} role` } });
  let user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    const password = fixedPassword || `Demo!${randomBytes(10).toString('base64url')}9`;
    user = await prisma.user.create({ data: { fullName, email, passwordHash: passwordHash(password), status: 'ACTIVE' } });
    credentials.push({ role: roleName, email, password });
  } else if (fixedPassword) {
    await prisma.user.update({ where: { id: user.id }, data: { fullName, status: 'ACTIVE', passwordHash: passwordHash(fixedPassword) } });
    credentials.push({ role: roleName, email, password: fixedPassword });
  }
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: user.id, roleId: role.id } }, update: {}, create: { userId: user.id, roleId: role.id } });
  if (roleName === 'VOLUNTEER') await prisma.volunteerProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, skills: ['Synthetic demo', 'Guest assistance'] } });
  if (roleName === 'SECURITY_STAFF') await prisma.staffProfile.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id, staffCode: `DEMO-${user.id.slice(0, 8)}`, department: 'Synthetic demo operations' } });
  return user;
}

try {
  const admin = await prisma.user.findFirst({ where: { status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } }, orderBy: { createdAt: 'asc' } });
  if (!admin) throw new Error('Create an administrator first with `npm run admin:create`.');

  await prisma.venue.upsert({ where: { id: ids.venue }, update: {}, create: { id: ids.venue, name: `${prefix} Venue`, address: '100 Demo Avenue', city: 'Bengaluru', state: 'Karnataka', country: 'India', totalCapacity: 250 } });
  await prisma.zone.upsert({ where: { id: ids.zones[0] }, update: {}, create: { id: ids.zones[0], name: 'Demo Main Entrance', capacity: 100, venueId: ids.venue } });
  await prisma.zone.upsert({ where: { id: ids.zones[1] }, update: {}, create: { id: ids.zones[1], name: 'Demo Auditorium', capacity: 150, venueId: ids.venue } });
  await prisma.gate.upsert({ where: { id: ids.gates[0] }, update: {}, create: { id: ids.gates[0], name: 'Demo Gate A', gateCode: 'DEMO-A', zoneId: ids.zones[0] } });
  await prisma.gate.upsert({ where: { id: ids.gates[1] }, update: {}, create: { id: ids.gates[1], name: 'Demo Gate B', gateCode: 'DEMO-B', zoneId: ids.zones[1] } });
  const event = await prisma.event.upsert({ where: { id: ids.event }, update: { startDate: eventStart, endDate: eventEnd, status: 'PUBLISHED' }, create: { id: ids.event, name: `${prefix} Festival`, description: 'Clearly labeled fictional event for demonstrating EventCrowd screens and database operations.', slug: 'eventcrowd-synthetic-demo-festival', status: 'PUBLISHED', startDate: eventStart, endDate: eventEnd, venueId: ids.venue, organizerId: admin.id } });
  const liveStart = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const liveEnd = new Date(now.getTime() + 6 * 60 * 60 * 1000);
  const liveEvent = await prisma.event.upsert({ where: { id: ids.liveEvent }, update: { startDate: liveStart, endDate: liveEnd, status: 'ONGOING' }, create: { id: ids.liveEvent, name: `${prefix} Live Operations`, description: 'Synthetic ongoing event for demonstrating live check-in, crowd monitoring, staff assignments, and incident workflows.', slug: 'eventcrowd-synthetic-live-operations', status: 'ONGOING', startDate: liveStart, endDate: liveEnd, venueId: ids.venue, organizerId: admin.id } });
  counts.venues = 1; counts.events = 2; counts.zones = 2; counts.gates = 2;

  const ticketTypes = await Promise.all([
    prisma.ticketType.upsert({ where: { eventId_name: { eventId: event.id, name: 'Demo General Admission' } }, update: { quantity: 100, price: 250, soldCount: 0 }, create: { eventId: event.id, name: 'Demo General Admission', quantity: 100, price: 250 } }),
    prisma.ticketType.upsert({ where: { eventId_name: { eventId: event.id, name: 'Demo Student Pass' } }, update: { quantity: 75, price: 100, soldCount: 0 }, create: { eventId: event.id, name: 'Demo Student Pass', quantity: 75, price: 100 } }),
  ]);
  const liveTicketType = await prisma.ticketType.upsert({ where: { eventId_name: { eventId: liveEvent.id, name: 'Synthetic Live Entry' } }, update: { quantity: 100, price: 0 }, create: { eventId: liveEvent.id, name: 'Synthetic Live Entry', quantity: 100, price: 0 } });
  counts.ticketTypes = ticketTypes.length + 1;

  const staffNames = ['Yashwanth', 'Sharvesh', 'Harshitha', 'Yash', 'Roith'];
  const volunteerNames = ['Hema', 'Varsha', 'Dhanush', 'Tejas', 'Koushik'];
  const staff = await Promise.all(staffNames.map(name => ensureUser({ fullName: name, email: `${name.toLowerCase()}.staff@example.com`, roleName: 'SECURITY_STAFF' })));
  const volunteers = await Promise.all(volunteerNames.map(name => ensureUser({ fullName: name, email: `${name.toLowerCase()}.volunteer@example.com`, roleName: 'VOLUNTEER' })));
  const attendees = await Promise.all(['Aarav Mehta', 'Mira Shah', 'Kabir Rao', 'Diya Nair'].map((name, index) => ensureUser({ fullName: name, email: `demo.attendee.${index + 1}@example.com`, roleName: 'ATTENDEE', fixedPassword: 'EventCrowd@Demo2026' })));
  counts.staff = staff.length; counts.volunteers = volunteers.length; counts.attendees = attendees.length;

  const ticketRows = [];
  for (let index = 0; index < attendees.length; index += 1) {
    const registration = await prisma.registration.upsert({ where: { attendeeId_eventId: { attendeeId: attendees[index].id, eventId: event.id } }, update: { status: 'CONFIRMED' }, create: { registrationNumber: `DEMO-REG-${index + 1}`, attendeeId: attendees[index].id, eventId: event.id, status: 'CONFIRMED' } });
    {
      const ticket = await prisma.ticket.upsert({ where: { qrCode: `SYNTHETIC-DEMO-TICKET-${index + 1}` }, update: {}, create: { registrationId: registration.id, ticketTypeId: ticketTypes[index % ticketTypes.length].id, qrCode: `SYNTHETIC-DEMO-TICKET-${index + 1}`, status: index === 0 ? 'USED' : 'ACTIVE' } });
      ticketRows.push(ticket);
    }
  }
  await Promise.all(ticketTypes.map(type => prisma.ticketType.update({ where: { id: type.id }, data: { soldCount: 2 } })));
  const liveRegistrationRows = [];
  const liveTicketRows = [];
  for (let index = 0; index < 2; index += 1) {
    const attendee = attendees[index];
    const registration = await prisma.registration.upsert({ where: { attendeeId_eventId: { attendeeId: attendee.id, eventId: liveEvent.id } }, update: { status: 'CONFIRMED' }, create: { registrationNumber: `DEMO-LIVE-REG-${index + 1}`, attendeeId: attendee.id, eventId: liveEvent.id, status: 'CONFIRMED' } });
    liveRegistrationRows.push(registration);
    const qrCode = `SYNTHETIC-LIVE-EVENT-TICKET-${index + 1}`;
    const ticket = await prisma.ticket.upsert({ where: { qrCode }, update: { registrationId: registration.id, ticketTypeId: liveTicketType.id, status: index === 0 ? 'USED' : 'ACTIVE' }, create: { registrationId: registration.id, ticketTypeId: liveTicketType.id, qrCode, status: index === 0 ? 'USED' : 'ACTIVE' } });
    liveTicketRows.push(ticket);
  }
  await prisma.ticketType.update({ where: { id: liveTicketType.id }, data: { soldCount: liveTicketRows.length } });
  counts.liveEventRegistrations = liveRegistrationRows.length;
  counts.registrations = attendees.length + liveRegistrationRows.length; counts.tickets = ticketRows.length + liveTicketRows.length;

  const assignmentData = [];
  for (let index = 0; index < staff.length; index += 1) {
    const assignmentId = `d5000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    assignmentData.push(await prisma.staffAssignment.upsert({ where: { id: assignmentId }, update: {}, create: { id: assignmentId, staffId: staff[index].id, eventId: event.id, zoneId: ids.zones[index % 2], shiftStart: eventStart, shiftEnd: eventEnd, status: 'ASSIGNED' } }));
  }
  for (let index = 0; index < volunteers.length; index += 1) {
    const assignmentId = `d6000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    assignmentData.push(await prisma.volunteerAssignment.upsert({ where: { id: assignmentId }, update: {}, create: { id: assignmentId, volunteerId: volunteers[index].id, eventId: event.id, zoneId: ids.zones[index % 2], shiftStart: eventStart, shiftEnd: eventEnd, status: 'ASSIGNED' } }));
  }
  assignmentData.push(await prisma.staffAssignment.upsert({ where: { id: 'd5000000-0000-4000-8000-000000000011' }, update: { shiftStart: liveStart, shiftEnd: liveEnd, status: 'ACTIVE' }, create: { id: 'd5000000-0000-4000-8000-000000000011', staffId: staff[0].id, eventId: liveEvent.id, zoneId: ids.zones[0], shiftStart: liveStart, shiftEnd: liveEnd, status: 'ACTIVE' } }));
  assignmentData.push(await prisma.volunteerAssignment.upsert({ where: { id: 'd6000000-0000-4000-8000-000000000011' }, update: { shiftStart: liveStart, shiftEnd: liveEnd, status: 'ACTIVE' }, create: { id: 'd6000000-0000-4000-8000-000000000011', volunteerId: volunteers[0].id, eventId: liveEvent.id, zoneId: ids.zones[1], shiftStart: liveStart, shiftEnd: liveEnd, status: 'ACTIVE' } }));
  counts.assignments = assignmentData.length;

  const incidentRows = [];
  for (let index = 0; index < 4; index += 1) {
    const id = `d7000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const incidentStatus = ['REPORTED', 'INVESTIGATING', 'RESOLVED', 'CLOSED'][index];
    const reportedAt = new Date(now.getTime() - (index + 1) * 12 * 60 * 60 * 1000);
    incidentRows.push(await prisma.incident.upsert({ where: { id }, update: {}, create: { id, eventId: event.id, zoneId: ids.zones[index % 2], reporterId: index % 2 ? volunteers[index].id : staff[index].id, assignedToId: staff[(index + 1) % staff.length].id, title: `Synthetic demo incident ${index + 1}`, description: ['A guest asked for directions near the entrance.', 'A short queue formed near the auditorium.', 'A lost item was reported at the help point.', 'First aid was requested for a minor concern.'][index], severity: ['LOW', 'MEDIUM', 'HIGH', 'LOW'][index], status: incidentStatus, reportedAt, resolvedAt: incidentStatus === 'RESOLVED' || incidentStatus === 'CLOSED' ? new Date(reportedAt.getTime() + 60 * 60 * 1000) : null } }));
  }
  counts.incidents = incidentRows.length;
  for (let index = 0; index < 2; index += 1) {
    const id = `d7000000-0000-4000-8000-${String(index + 11).padStart(12, '0')}`;
    incidentRows.push(await prisma.incident.upsert({ where: { id }, update: {}, create: { id, eventId: liveEvent.id, zoneId: ids.zones[index], reporterId: index ? volunteers[0].id : staff[0].id, assignedToId: staff[0].id, title: `Synthetic live incident ${index + 1}`, description: ['Sample: entrance queue is being monitored by the live team.', 'Sample: guest assistance requested at the auditorium zone.'][index], severity: index ? 'LOW' : 'MEDIUM', status: index ? 'INVESTIGATING' : 'REPORTED', reportedAt: new Date(now.getTime() - (index + 1) * 8 * 60 * 1000) } }));
  }
  counts.incidents = incidentRows.length;

  const alertRows = [];
  for (let index = 0; index < 3; index += 1) {
    const id = `d8000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    alertRows.push(await prisma.alert.upsert({ where: { id }, update: {}, create: { id, eventId: event.id, zoneId: ids.zones[index % 2], createdById: admin.id, type: ['SECURITY', 'CROWD_DENSITY', 'CAPACITY'][index], message: `Synthetic demo alert ${index + 1}: ${['staff review requested', 'occupancy is approaching the guide level', 'capacity monitor sample'][index]}.`, status: index === 2 ? 'RESOLVED' : 'ACTIVE', createdAt: new Date(now.getTime() - (index + 1) * 3 * 60 * 60 * 1000) } }));
  }
  counts.alerts = alertRows.length;
  for (let index = 0; index < 2; index += 1) {
    const id = `d8000000-0000-4000-8000-${String(index + 11).padStart(12, '0')}`;
    alertRows.push(await prisma.alert.upsert({ where: { id }, update: {}, create: { id, eventId: liveEvent.id, zoneId: ids.zones[index], createdById: admin.id, type: index ? 'SECURITY' : 'CROWD_DENSITY', message: `Synthetic live alert ${index + 1}: ${index ? 'monitor the auditorium entry line.' : 'entrance occupancy is elevated; observe flow.'}`, status: 'ACTIVE', createdAt: new Date(now.getTime() - (index + 1) * 4 * 60 * 1000) } }));
  }
  counts.alerts = alertRows.length;

  const observationRows = [];
  const levels = [32, 47, 58, 64, 73, 81, 88, 92, 55, 39, 67, 76];
  for (let index = 0; index < levels.length; index += 1) {
    const id = `d9000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const occupancy = levels[index];
    observationRows.push(await prisma.crowdObservation.upsert({ where: { id }, update: {}, create: { id, eventId: event.id, zoneId: ids.zones[index % 2], occupancy, capacity: index % 2 ? 150 : 100, percentage: Math.round(occupancy / (index % 2 ? 150 : 100) * 100), source: 'synthetic', observedBy: index % 2 ? volunteers[index % volunteers.length].id : staff[index % staff.length].id, observedAt: new Date(now.getTime() - index * 10 * 60 * 1000) } }));
  }
  for (let index = 0; index < 4; index += 1) {
    const id = `d9000000-0000-4000-8000-${String(index + 13).padStart(12, '0')}`;
    const occupancy = [54, 72, 86, 63][index];
    const capacity = index % 2 ? 150 : 100;
    observationRows.push(await prisma.crowdObservation.upsert({ where: { id }, update: {}, create: { id, eventId: liveEvent.id, zoneId: ids.zones[index % 2], occupancy, capacity, percentage: Math.round(occupancy / capacity * 100), source: 'synthetic', observedBy: index % 2 ? volunteers[0].id : staff[0].id, observedAt: new Date(now.getTime() - index * 5 * 60 * 1000) } }));
  }
  counts.crowdObservations = observationRows.length;

  const contactRows = [];
  const contactSamples = [
    ['Aarav Mehta', 'demo.attendee.1@example.com', 'Venue accessibility', 'Could you share the accessible route to the main auditorium?'],
    ['Mira Shah', 'demo.attendee.2@example.com', 'Schedule question', 'Where can I find the complete demo event schedule?'],
    ['Kabir Rao', 'demo.attendee.3@example.com', 'Ticket help', 'I would like help understanding the synthetic ticket example.'],
    ['Diya Nair', 'demo.attendee.4@example.com', 'Volunteer check-in', 'What time should the demo volunteers check in?'],
  ];
  for (let index = 0; index < contactSamples.length; index += 1) {
    const id = `da000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    const [name, email, subject, message] = contactSamples[index];
    contactRows.push(await prisma.contactMessage.upsert({ where: { id }, update: {}, create: { id, name, email, subject: `[SYNTHETIC] ${subject}`, message, status: index ? 'IN_PROGRESS' : 'NEW', createdAt: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000) } }));
  }
  counts.contactMessages = contactRows.length;

  if (ticketRows.length) {
    await prisma.gateScan.upsert({ where: { id: 'db000000-0000-4000-8000-000000000001' }, update: {}, create: { id: 'db000000-0000-4000-8000-000000000001', ticketId: ticketRows[0].id, gateId: ids.gates[0], eventId: event.id, scannedById: staff[0].id, scanType: 'ENTRY', result: 'ACCEPTED' } });
  }
  await prisma.gateScan.upsert({ where: { id: 'db000000-0000-4000-8000-000000000011' }, update: {}, create: { id: 'db000000-0000-4000-8000-000000000011', ticketId: liveTicketRows[0].id, gateId: ids.gates[0], eventId: liveEvent.id, scannedById: staff[0].id, scanType: 'ENTRY', result: 'ACCEPTED', scannedAt: new Date(now.getTime() - 18 * 60 * 1000) } });
  await prisma.gateScan.upsert({ where: { id: 'db000000-0000-4000-8000-000000000012' }, update: {}, create: { id: 'db000000-0000-4000-8000-000000000012', ticketId: liveTicketRows[0].id, gateId: ids.gates[0], eventId: liveEvent.id, scannedById: staff[0].id, scanType: 'ENTRY', result: 'REJECTED', scannedAt: new Date(now.getTime() - 17 * 60 * 1000) } });

  await prisma.auditLog.upsert({ where: { id: 'dc000000-0000-4000-8000-000000000001' }, update: {}, create: { id: 'dc000000-0000-4000-8000-000000000001', userId: admin.id, action: 'SEED_SYNTHETIC', entity: 'EventCrowdDemo', entityId: event.id, details: { synthetic: true, counts } } });

  await mongo.connect();
  const db = mongo.db(database);
  const syntheticBatch = 'eventcrowd-all-pages-demo-v1';
  for (const row of contactRows) {
    await db.collection('contact_messages').updateOne({ seedKey: `${syntheticBatch}-${row.id}` }, { $set: { seedKey: `${syntheticBatch}-${row.id}`, postgresId: row.id, name: row.name, email: row.email, subject: row.subject, message: row.message, status: row.status, createdAt: row.createdAt, synthetic: true, seedBatch: syntheticBatch } }, { upsert: true });
  }
  for (const row of incidentRows) {
    await db.collection('incident_timeline').updateOne({ seedKey: `${syntheticBatch}-${row.id}` }, { $set: { seedKey: `${syntheticBatch}-${row.id}`, incidentId: row.id, eventId: row.eventId, action: row.status, actorId: row.reporterId, note: row.description, createdAt: row.reportedAt, synthetic: true, seedBatch: syntheticBatch } }, { upsert: true });
  }
  for (const row of observationRows) {
    await db.collection('crowd_observations').updateOne({ seedKey: `${syntheticBatch}-${row.id}` }, { $set: { seedKey: `${syntheticBatch}-${row.id}`, postgresId: row.id, eventId: row.eventId, zoneId: row.zoneId, occupancy: row.occupancy, capacity: row.capacity, percentage: row.percentage, source: 'synthetic', observedBy: row.observedBy, observedAt: row.observedAt, synthetic: true, seedBatch: syntheticBatch } }, { upsert: true });
  }
  await db.collection('system_activity').updateOne({ seedKey: `${syntheticBatch}-capacity-alert` }, { $set: { seedKey: `${syntheticBatch}-capacity-alert`, type: 'CAPACITY_WARNING', eventId: event.id, zoneId: ids.zones[0], percentage: 88, message: 'Synthetic demo occupancy warning.', createdAt: now, actorId: staff[0].id, synthetic: true, seedBatch: syntheticBatch } }, { upsert: true });
  await db.collection('system_activity').updateOne({ seedKey: `${syntheticBatch}-live-event-check-in` }, { $set: { seedKey: `${syntheticBatch}-live-event-check-in`, type: 'ATTENDEE_CHECK_IN', eventId: liveEvent.id, ticketId: liveTicketRows[0].id, attendeeId: attendees[0].id, gateId: ids.gates[0], scannedById: staff[0].id, result: 'ACCEPTED', createdAt: new Date(now.getTime() - 18 * 60 * 1000), synthetic: true, seedBatch: syntheticBatch } }, { upsert: true });

  console.log(JSON.stringify({ database, synthetic: true, liveEvent: { id: liveEvent.id, name: liveEvent.name, status: liveEvent.status }, counts, MongoDB: { contact_messages: contactRows.length, incident_timeline: incidentRows.length, crowd_observations: observationRows.length, system_activity: 2 }, newAccountCredentials: credentials }, null, 2));
} finally {
  await mongo.close().catch(() => {});
  await prisma.$disconnect();
}
