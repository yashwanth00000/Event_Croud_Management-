import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function POST(req: NextRequest) {
  try {
    const b = await req.json();
    const fullName = String(b.fullName ?? '').trim();
    const email = String(b.email ?? '').trim().toLowerCase();
    const phone = String(b.phone ?? '').trim();
    const password = String(b.password ?? '');
    const skills = Array.isArray(b.skills) ? b.skills.map((x: unknown) => String(x).trim()).filter(Boolean).slice(0, 20) : [];
    if (fullName.length < 2 || fullName.length > 100) return badRequest('Name must be 2–100 characters');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest('Enter a valid email');
    if (password.length < 10 || password.length > 128) return badRequest('Password must be 10–128 characters');
    const role = await prisma.role.upsert({ where: { name: 'VOLUNTEER' }, update: {}, create: { name: 'VOLUNTEER', description: 'Event volunteer' } });
    const user = await prisma.user.create({ data: { fullName, email, phone: phone || null, passwordHash: hashPassword(password), status: 'INACTIVE', roles: { create: { roleId: role.id } }, volunteerProfile: { create: { skills } } }, select: { id: true, fullName: true, email: true, status: true, createdAt: true } });
    return NextResponse.json({ message: 'Application submitted. Wait for administrator approval.', user }, { status: 201 });
  } catch (e) { return apiError(e); }
}
