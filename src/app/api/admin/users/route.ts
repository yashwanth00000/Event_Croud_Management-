import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET() {
  try {
    await requireRoles('ADMIN');
    const users = await prisma.user.findMany({
      select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true, staffProfile: { select: { staffCode: true, department: true } }, roles: { select: { role: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ data: users.map(user => ({ ...user, roles: user.roles.map(item => item.role.name) })) });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN');
    const body = await request.json();
    const userId = String(body.userId ?? '');
    const status = String(body.status ?? '').toUpperCase();
    if (!userId || !['ACTIVE', 'INACTIVE', 'BLOCKED'].includes(status)) return badRequest('User ID and valid status are required');
    if (userId === actor.id && status !== 'ACTIVE') return badRequest('You cannot deactivate your own administrator account');
    const target = await prisma.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!target) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (target.status === 'ACTIVE' && status !== 'ACTIVE' && target.roles.some(item => item.role.name === 'ADMIN')) {
      const activeAdmins = await prisma.user.count({ where: { status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } } });
      if (activeAdmins < 2) return badRequest('The last active administrator cannot be deactivated');
    }
    const user = await prisma.user.update({ where: { id: userId }, data: { status: status as 'ACTIVE' | 'INACTIVE' | 'BLOCKED' }, select: { id: true, fullName: true, email: true, status: true } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'STATUS_CHANGE', entity: 'User', entityId: user.id, details: { status } } });
    return NextResponse.json({ data: user });
  } catch (error) { return apiError(error); }
}
