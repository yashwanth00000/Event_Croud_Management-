import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser();
    const unreadOnly = request.nextUrl.searchParams.get('unread') === 'true';
    const data = await prisma.civicNotification.findMany({ where: { recipientId: user.id, ...(unreadOnly ? { readAt: null } : {}) }, include: { actor: { select: { fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 200 });
    return NextResponse.json({ data, unreadCount: data.filter(item => !item.readAt).length });
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await requireUser(); const body = await request.json();
    const id = String(body.id ?? '');
    if (!id) return badRequest('Notification ID is required');
    const changed = await prisma.civicNotification.updateMany({ where: { id, recipientId: user.id, readAt: null }, data: { readAt: new Date() } });
    if (!changed.count) return NextResponse.json({ error: 'Unread notification not found' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
