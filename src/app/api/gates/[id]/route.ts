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
    const data: { name?: string; gateCode?: string; isActive?: boolean } = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (name.length < 2) return badRequest('Gate name must contain at least two characters');
      data.name = name;
    }
    if (body.gateCode !== undefined) {
      const gateCode = String(body.gateCode).trim();
      if (!gateCode) return badRequest('Gate code cannot be empty');
      data.gateCode = gateCode;
    }
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== 'boolean') return badRequest('isActive must be true or false');
      data.isActive = body.isActive;
    }
    if (!Object.keys(data).length) return badRequest('Provide gate name, code, or active status to update');
    const gate = await prisma.gate.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'Gate', entityId: id } });
    return NextResponse.json({ data: gate });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN');
    const { id } = await params;
    const gate = await prisma.gate.findUnique({ where: { id }, include: { _count: { select: { gateScans: true } } } });
    if (!gate) return NextResponse.json({ error: 'Gate not found' }, { status: 404 });
    if (gate._count.gateScans > 0) return NextResponse.json({ error: 'This gate has scan history. Deactivate it to preserve the audit trail.' }, { status: 409 });
    await prisma.gate.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'DELETE', entity: 'Gate', entityId: id } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
