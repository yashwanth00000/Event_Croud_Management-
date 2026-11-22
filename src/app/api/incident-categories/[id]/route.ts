import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN'); const { id } = await params; const body = await request.json();
    const data: { name?: string; departmentId?: string; isActive?: boolean } = {};
    if (body.name !== undefined) { const name = String(body.name).trim(); if (name.length < 2 || name.length > 120) return badRequest('Category name must be 2 to 120 characters'); data.name = name; }
    if (body.departmentId !== undefined) data.departmentId = String(body.departmentId);
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);
    if (!Object.keys(data).length) return badRequest('No category changes supplied');
    const updated = await prisma.incidentCategory.update({ where: { id }, data, include: { department: true } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'IncidentCategory', entityId: id } });
    return NextResponse.json({ data: updated });
  } catch (error) { return apiError(error); }
}
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN'); const { id } = await params;
    const updated = await prisma.incidentCategory.update({ where: { id }, data: { isActive: false } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'DEACTIVATE', entity: 'IncidentCategory', entityId: id } });
    return NextResponse.json({ data: updated });
  } catch (error) { return apiError(error); }
}
