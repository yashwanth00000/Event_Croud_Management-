import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET() {
  try {
    await requireUser();
    return NextResponse.json({ data: await prisma.incidentCategory.findMany({ where: { isActive: true, department: { isActive: true } }, include: { department: { select: { id: true, name: true } } }, orderBy: [{ department: { name: 'asc' } }, { name: 'asc' }] }) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN'); const body = await request.json();
    const departmentId = String(body.departmentId ?? ''), name = String(body.name ?? '').trim();
    if (!departmentId || name.length < 2 || name.length > 120) return badRequest('Choose a department and enter a category name between 2 and 120 characters');
    const data = await prisma.incidentCategory.create({ data: { departmentId, name }, include: { department: true } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'IncidentCategory', entityId: data.id } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
