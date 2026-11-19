import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const { id } = await params;
    const body = await request.json();
    const data: { name?: string; capacity?: number } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) return badRequest('Zone name must contain at least two characters');
      data.name = name;
    }
    if (body.capacity !== undefined) {
      const capacity = Number(body.capacity);
      if (!Number.isInteger(capacity) || capacity < 1) return badRequest('Capacity must be a positive integer');
      data.capacity = capacity;
    }
    if (!Object.keys(data).length) return badRequest('Provide a zone name or capacity to update');
    const zone = await prisma.zone.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Zone', entityId: id } });
    return NextResponse.json({ data: zone });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN');
    const { id } = await params;
    const zone = await prisma.zone.findUnique({ where: { id }, include: { _count: { select: { gates: true, volunteerAssignments: true, staffAssignments: true, incidents: true, alerts: true } } } });
    if (!zone) return NextResponse.json({ error: 'Zone not found' }, { status: 404 });
    const used = Object.values(zone._count).some(count => count > 0);
    if (used) return NextResponse.json({ error: 'This zone has operational history or assignments and cannot be deleted. Keep it for audit history.' }, { status: 409 });
    await prisma.zone.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'DELETE', entity: 'Zone', entityId: id } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
