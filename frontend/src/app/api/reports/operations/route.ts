import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    await requireRoles('ADMIN');
    const eventId = request.nextUrl.searchParams.get('eventId');
    const rows = eventId
      ? await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "EventOperationsSummary" WHERE "eventId"::text = ${eventId} ORDER BY "startDate" DESC`
      : await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM "EventOperationsSummary" ORDER BY "startDate" DESC`;
    const data = rows.map(row => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, typeof value === 'bigint' ? Number(value) : value])));
    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}
