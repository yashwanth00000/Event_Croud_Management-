import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const organizerEmail = process.env.EVENT_ORGANIZER_EMAIL || 'admin@gmail.com';
const eventRecords = [
  {
    id: '5e000000-0000-4000-8000-000000000001',
    slug: 'euphoria-cultural-fest-2026',
    name: 'Euphoria Cultural Fest 2026',
    venueId: '2e000000-0000-4000-8000-000000000001',
    venue: {
      name: 'MRD Student Center, PES University EC Campus',
      address: 'Hosur Road, 1 km before Electronic City',
    },
    startDate: new Date('2026-02-23T00:00:00+05:30'),
    endDate: new Date('2026-02-23T23:59:59+05:30'),
    description: 'PES University Faculty of Management and Commerce cultural fest held on 23 February 2026 at the MRD Student Center, Electronic City Campus. Official information: https://news.pes.edu/12044/',
    source: 'https://news.pes.edu/12044/',
  },
  {
    id: '5e000000-0000-4000-8000-000000000002',
    slug: 'aatmatrisha-2026',
    name: 'Aatmatrisha 2026',
    venueId: '2e000000-0000-4000-8000-000000000002',
    venue: {
      name: 'PES University Ring Road Campus (event venue TBA)',
      address: '100 Feet Ring Road, Banashankari Stage III',
    },
    startDate: new Date('2026-04-03T00:00:00+05:30'),
    endDate: new Date('2026-04-04T23:59:59+05:30'),
    description: 'PES University annual techno-cultural fest held 3–4 April 2026 at PESU Ring Road Campus. The official listing shows the specific venue as TBA. Official information: https://events.pes.edu/11476/',
    source: 'https://events.pes.edu/11476/',
  },
];

try {
  const organizer = await prisma.user.findUnique({ where: { email: organizerEmail }, select: { id: true, roles: { select: { role: { select: { name: true } } } } } });
  if (!organizer || !organizer.roles.some(item => item.role.name.toUpperCase() === 'ADMIN')) {
    throw new Error(`An existing administrator account was not found for EVENT_ORGANIZER_EMAIL=${organizerEmail}. Set EVENT_ORGANIZER_EMAIL to an active admin's email.`);
  }
  const saved = await prisma.$transaction(async tx => {
    const result = [];
    for (let index = 0; index < eventRecords.length; index++) {
      const item = eventRecords[index];
      await tx.venue.upsert({
        where: { id: item.venueId },
        update: { ...item.venue, city: 'Bengaluru', state: 'Karnataka', country: 'India', totalCapacity: null },
        create: { id: item.venueId, ...item.venue, city: 'Bengaluru', state: 'Karnataka', country: 'India', totalCapacity: null },
      });
      const event = await tx.event.upsert({
        where: { slug: item.slug },
        update: { name: item.name, description: item.description, status: 'COMPLETED', startDate: item.startDate, endDate: item.endDate, venueId: item.venueId, organizerId: organizer.id },
        create: { id: item.id, slug: item.slug, name: item.name, description: item.description, status: 'COMPLETED', startDate: item.startDate, endDate: item.endDate, venueId: item.venueId, organizerId: organizer.id },
      });
      const auditId = index === 0 ? 'd1000000-0000-4000-8000-000000000001' : 'd1000000-0000-4000-8000-000000000002';
      await tx.auditLog.upsert({
        where: { id: auditId },
        update: { userId: organizer.id, action: 'OFFICIAL_EVENT_IMPORT', entity: 'Event', entityId: event.id, details: { source: item.source } },
        create: { id: auditId, userId: organizer.id, action: 'OFFICIAL_EVENT_IMPORT', entity: 'Event', entityId: event.id, details: { source: item.source } },
      });
      result.push({ name: event.name, status: event.status, eventId: event.id });
    }
    return result;
  });
  console.log(JSON.stringify({ imported: saved, organizer: organizerEmail, attendeeRecordsCreated: 0, ticketRecordsCreated: 0 }, null, 2));
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
