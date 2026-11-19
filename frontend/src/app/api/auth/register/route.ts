import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createSession, hashPassword } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const fullName = String(body.fullName ?? '').trim();
    const email = String(body.email ?? '').trim().toLowerCase();
    const password = String(body.password ?? '');
    if (fullName.length < 2 || fullName.length > 100) return badRequest('Name must be 2–100 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest('A valid email is required');
    if (password.length < 10 || password.length > 128) return badRequest('Password must be 10–128 characters');
    const roleName = 'ATTENDEE';
    const role = await prisma.role.upsert({ where: { name: roleName }, update: {}, create: { name: roleName, description: `${roleName} role` } });
    const user = await prisma.user.create({ data: { fullName, email, passwordHash: hashPassword(password), roles: { create: { roleId: role.id } } }, select: { id: true, fullName: true, email: true, status: true, createdAt: true } });
    await createSession(user.id);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) { return apiError(error); }
}
