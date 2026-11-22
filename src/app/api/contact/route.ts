import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiError, badRequest } from '@/lib/api';
import { getMongoClient } from '@/lib/mongodb';
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const subject = String(body.subject ?? '').trim();
    const message = String(body.message ?? '').trim();
    if (name.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || subject.length < 3 || message.length < 10) return badRequest('Valid name, email, subject and message are required');
    const data = await prisma.contactMessage.create({ data: { name, email, subject, message } });
    try {
      const client = await getMongoClient();
      await client.db(process.env.MONGODB_DATABASE || 'eventcrowd').collection('contact_messages').insertOne({ postgresId: data.id, name, email, subject, message, status: 'NEW', createdAt: data.createdAt });
    } catch (mirrorError) {
      console.error('Contact message MongoDB mirror failed; PostgreSQL record was saved:', mirrorError);
    }
    return NextResponse.json({ success: true, id: data.id }, { status: 201 });
  } catch (error) { return apiError(error); }
}
