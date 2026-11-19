import { NextResponse } from 'next/server';
import { getMongoClient } from '@/lib/mongodb';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';
export async function POST() {
  try {
    await requireRoles('ADMIN');
    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DATABASE || 'eventcrowd');
    await Promise.all([
      db.collection('crowd_observations').createIndex({ eventId: 1, zoneId: 1, observedAt: -1 }),
      db.collection('crowd_observations').createIndex({ observedAt: -1 }),
      db.collection('incident_timeline').createIndex({ incidentId: 1, createdAt: 1 }),
      db.collection('system_activity').createIndex({ eventId: 1, createdAt: -1 }),
      db.collection('contact_messages').createIndex({ createdAt: -1 }),
    ]);
    return NextResponse.json({ success: true, indexes: ['crowd_observations:event-zone-time', 'crowd_observations:time', 'incident_timeline:incident-time', 'system_activity:event-time', 'contact_messages:time'] });
  } catch (error) { return apiError(error); }
}
