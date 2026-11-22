import { readFileSync, existsSync } from 'node:fs';
import { MongoClient } from 'mongodb';

// Load the local .env for direct Node execution, without printing credentials.
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error('Set MONGODB_URI in .env before running this seed script.');

const databaseName = process.env.MONGODB_DATABASE || 'eventcrowd';
const batch = 'eventcrowd-synthetic-showcase-v1';
const now = new Date();
const eventEuphoria = '5e000000-0000-4000-8000-000000000001';
const eventAatmatrisha = '5e000000-0000-4000-8000-000000000002';
const actorId = 'synthetic-user-volunteer-01';

const contacts = [
  { seedKey: `${batch}-contact-1`, postgresId: 'synthetic-contact-001', name: 'Aarav Mehta', email: 'aarav.mehta@example.com', subject: 'Accessibility information', message: 'Could you share the accessible entrance details for the event venue?', status: 'NEW' },
  { seedKey: `${batch}-contact-2`, postgresId: 'synthetic-contact-002', name: 'Mira Shah', email: 'mira.shah@example.com', subject: 'Schedule question', message: 'Please let me know where the latest event schedule will be published.', status: 'NEW' },
  { seedKey: `${batch}-contact-3`, postgresId: 'synthetic-contact-003', name: 'Kabir Rao', email: 'kabir.rao@example.com', subject: 'Volunteer check-in', message: 'What time should volunteers arrive for their check-in shift?', status: 'NEW' },
].map((doc, index) => ({ ...doc, synthetic: true, seedBatch: batch, createdAt: new Date(now.getTime() - (index + 1) * 60 * 60 * 1000) }));

const incidentTimeline = [
  { seedKey: `${batch}-incident-1`, incidentId: 'synthetic-incident-001', eventId: eventEuphoria, action: 'REPORTED', actorId, note: 'Synthetic example: a guest requested first-aid assistance near the main entrance.' },
  { seedKey: `${batch}-incident-2`, incidentId: 'synthetic-incident-002', eventId: eventAatmatrisha, action: 'REPORTED', actorId, note: 'Synthetic example: a temporary queue formed near the auditorium entrance.' },
  { seedKey: `${batch}-incident-3`, incidentId: 'synthetic-incident-001', eventId: eventEuphoria, action: 'UPDATED', actorId, note: 'Synthetic example: the first-aid team acknowledged the request.' },
].map((doc, index) => ({ ...doc, synthetic: true, seedBatch: batch, createdAt: new Date(now.getTime() - (index + 1) * 30 * 60 * 1000) }));

const crowdObservations = [
  { seedKey: `${batch}-crowd-1`, eventId: eventEuphoria, zoneId: 'synthetic-zone-main-entrance', occupancy: 42, capacity: 100, percentage: 42 },
  { seedKey: `${batch}-crowd-2`, eventId: eventEuphoria, zoneId: 'synthetic-zone-main-entrance', occupancy: 68, capacity: 100, percentage: 68 },
  { seedKey: `${batch}-crowd-3`, eventId: eventAatmatrisha, zoneId: 'synthetic-zone-auditorium', occupancy: 91, capacity: 100, percentage: 91 },
].map((doc, index) => ({ ...doc, postgresId: `synthetic-observation-00${index + 1}`, source: 'synthetic', observedBy: actorId, synthetic: true, seedBatch: batch, observedAt: new Date(now.getTime() - (index + 1) * 15 * 60 * 1000) }));

// A second batch gives teams a larger dataset to browse and chart.
const extraBatch = `${batch}-more`;
const sampleNames = ['Anaya Rao', 'Ishaan Nair', 'Diya Kumar', 'Arjun Das', 'Sana Ali', 'Neel Shah', 'Tara Iyer', 'Rohan Sen', 'Leela Menon', 'Dev Patel'];
for (let index = 0; index < 10; index += 1) {
  const number = String(index + 1).padStart(3, '0');
  const name = sampleNames[index];
  const eventId = index % 2 === 0 ? eventEuphoria : eventAatmatrisha;
  const observedAt = new Date(now.getTime() - (index + 1) * 5 * 60 * 1000);
  contacts.push({
    seedKey: `${extraBatch}-contact-${number}`, postgresId: `synthetic-contact-${number}`,
    name, email: `${name.toLowerCase().replaceAll(' ', '.')}@example.com`,
    subject: ['Ticket help', 'Venue directions', 'Event schedule', 'Accessibility request', 'Volunteer information'][index % 5],
    message: `Synthetic sample message ${number}: could you please share more information about the event?`,
    status: index % 3 === 0 ? 'NEW' : 'IN_PROGRESS', synthetic: true, seedBatch: extraBatch,
    createdAt: new Date(now.getTime() - (index + 1) * 45 * 60 * 1000),
  });
  incidentTimeline.push({
    seedKey: `${extraBatch}-incident-${number}`, incidentId: `synthetic-incident-${number}`,
    eventId, action: index % 3 === 2 ? 'RESOLVED' : index % 3 === 1 ? 'UPDATED' : 'REPORTED',
    actorId, note: `Synthetic sample incident ${number}: ${['guest assistance requested near an entrance', 'queue flow monitored by event staff', 'lost item reported at an information desk', 'first-aid team notified of a minor concern', 'directional sign repositioned for clearer access'][index % 5]}.`,
    synthetic: true, seedBatch: extraBatch, createdAt: new Date(now.getTime() - (index + 1) * 20 * 60 * 1000),
  });
  const occupancy = [34, 51, 63, 77, 88, 46, 59, 72, 95, 41][index];
  crowdObservations.push({
    seedKey: `${extraBatch}-crowd-${number}`, postgresId: `synthetic-observation-${number}`,
    eventId, zoneId: index % 2 === 0 ? 'synthetic-zone-main-entrance' : 'synthetic-zone-auditorium',
    occupancy, capacity: 100, percentage: occupancy, source: 'synthetic', observedBy: actorId,
    synthetic: true, seedBatch: extraBatch, observedAt,
  });
}

const client = new MongoClient(uri);
try {
  await client.connect();
  const db = client.db(databaseName);
  for (const [collectionName, docs] of [
    ['contact_messages', contacts],
    ['incident_timeline', incidentTimeline],
    ['crowd_observations', crowdObservations],
  ]) {
    const collection = db.collection(collectionName);
    for (const doc of docs) {
      const { seedKey, ...fields } = doc;
      await collection.updateOne({ seedKey }, { $set: { seedKey, ...fields } }, { upsert: true });
    }
  }
  console.log(JSON.stringify({ database: databaseName, insertedOrUpdated: { contact_messages: contacts.length, incident_timeline: incidentTimeline.length, crowd_observations: crowdObservations.length }, synthetic: true }, null, 2));
} finally {
  await client.close();
}
