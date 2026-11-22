import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET() {
  try {
    await requireUser();
    const data = await prisma.department.findMany({ where: { isActive: true }, include: { categories: { where: { isActive: true }, orderBy: { name: 'asc' } } }, orderBy: { name: 'asc' } });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN');
    const body = await request.json();
    const name = String(body.name ?? '').trim();
    if (name.length < 2 || name.length > 120) return badRequest('Department name must be 2 to 120 characters');
    const data = await prisma.department.create({ data: { name } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'CREATE', entity: 'Department', entityId: data.id } });
    return NextResponse.json({ data }, { status: 201 });
  } catch (error) { return apiError(error); }
}
