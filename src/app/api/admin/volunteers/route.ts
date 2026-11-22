import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import { hashPassword } from '@/lib/auth/session';
export async function GET() {
  try {
    await requireRoles('ADMIN');
    const data = await prisma.user.findMany({ where: { roles: { some: { role: { name: 'VOLUNTEER' } } } }, select: { id: true, fullName: true, email: true, phone: true, status: true, createdAt: true, volunteerProfile: true, volunteerAssignments: { include: { event: true, zone: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ data });
  } catch (e) { return apiError(e); }
}

export async function POST(req: NextRequest) {
  try {
    const admin = await requireRoles('ADMIN');
    const b = await req.json();
    const fullName = String(b.fullName ?? '').trim(), email = String(b.email ?? '').trim().toLowerCase(), password = String(b.password ?? '');
    if (fullName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 10) return badRequest('Valid name, email and password (at least 10 characters) are required');
    const role = await prisma.role.upsert({ where: { name: 'VOLUNTEER' }, update: {}, create: { name: 'VOLUNTEER' } });
    const user = await prisma.user.create({ data: { fullName, email, phone: b.phone ? String(b.phone) : null, passwordHash: hashPassword(password), status: 'ACTIVE', roles: { create: { roleId: role.id } }, volunteerProfile: { create: { skills: Array.isArray(b.skills) ? b.skills.map(String) : [] } } }, select: { id: true, fullName: true, email: true, status: true } });
    await prisma.auditLog.create({ data: { userId: admin.id, action: 'CREATE', entity: 'Volunteer', entityId: user.id } });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (e) { return apiError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const admin = await requireRoles('ADMIN');
    const b = await req.json(); const userId = String(b.userId ?? '');
    const action = String(b.action ?? '').toUpperCase();
    if (!userId || !['APPROVE','REJECT','DEACTIVATE','REACTIVATE'].includes(action)) return badRequest('A userId and valid action are required');
    const target = await prisma.user.findFirst({ where: { id: userId, roles: { some: { role: { name: 'VOLUNTEER' } } } } });
    if (!target) return NextResponse.json({ error: 'Volunteer not found' }, { status: 404 });
    const status = action === 'APPROVE' || action === 'REACTIVATE' ? 'ACTIVE' : 'INACTIVE';
    const updated = await prisma.user.update({ where: { id: userId }, data: { status }, select: { id: true, fullName: true, email: true, status: true } });
    await prisma.auditLog.create({ data: { userId: admin.id, action, entity: 'Volunteer', entityId: userId, details: { previousStatus: target.status, status } } });
    return NextResponse.json({ data: updated });
  } catch (e) { return apiError(e); }
}
