import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, verifyPassword } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (!email || !password) return badRequest('Email and password are required');
    const portal = String(body.portal ?? '').trim().toUpperCase();
    const user = await prisma.user.findUnique({ where: { email }, include: { roles: { include: { role: true } } } });
    if (!user || user.status !== 'ACTIVE' || !verifyPassword(password, user.passwordHash)) return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    const roles = user.roles.map(r => r.role.name.toUpperCase());
    if (portal && !roles.includes(portal)) return NextResponse.json({ error: 'This account is not authorized for this portal' }, { status: 403 });
    await createSession(user.id);
    return NextResponse.json({ user: { id: user.id, fullName: user.fullName, email: user.email, roles } });
  } catch (error) { return apiError(error); }
}
