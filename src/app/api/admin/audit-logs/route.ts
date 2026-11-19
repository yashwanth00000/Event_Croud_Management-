import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    await requireRoles('ADMIN');
    const limitValue = Number(request.nextUrl.searchParams.get('limit') ?? 100);
    const limit = Number.isInteger(limitValue) ? Math.min(Math.max(limitValue, 1), 250) : 100;
    const entity = request.nextUrl.searchParams.get('entity');
    const data = await prisma.auditLog.findMany({
      where: entity ? { entity: { contains: entity, mode: 'insensitive' } } : undefined,
      include: { user: { select: { id: true, fullName: true, email: true } } },
      orderBy: { createdAt: 'desc' }, take: limit,
    });
    return NextResponse.json({ data: data.map(({ entityId: _entityId, ...entry }) => entry) });
  } catch (error) { return apiError(error); }
}
