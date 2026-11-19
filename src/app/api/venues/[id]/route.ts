import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const user = await requireRoles('ADMIN', 'ORGANIZER');
    const { id } = await params;
    const body = await request.json();
    const data: Prisma.VenueUpdateInput = {};
    for (const field of ['name', 'address', 'city', 'state', 'country']) {
      if (body[field] !== undefined) (data as Record<string, unknown>)[field] = String(body[field]).trim();
    }
    if (body.totalCapacity !== undefined) {
      if (body.totalCapacity === null || body.totalCapacity === '') data.totalCapacity = null;
      else {
        const capacity = Number(body.totalCapacity);
        if (!Number.isInteger(capacity) || capacity < 1) return NextResponse.json({ error: 'Capacity must be a positive whole number, or blank if unknown' }, { status: 400 });
        data.totalCapacity = capacity;
      }
    }
    const venue = await prisma.venue.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'UPDATE', entity: 'Venue', entityId: id } });
    return NextResponse.json({ data: venue });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    await requireRoles('ADMIN');
    const { id } = await params;
    await prisma.venue.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
