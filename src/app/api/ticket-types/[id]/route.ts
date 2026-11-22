import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const { id } = await params;
    const body = await request.json();
    const current = await prisma.ticketType.findUnique({ where: { id }, select: { soldCount: true, event: { select: { organizerId: true } } } });
    if (!current) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    if (!actor.roles.some(r => r.role.name.toUpperCase() === 'ADMIN') && current.event.organizerId !== actor.id) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    const data: { name?: string; price?: number; quantity?: number } = {};
    if (body.name !== undefined) { const name = String(body.name).trim(); if (name.length < 2) return badRequest('Ticket type name must contain at least two characters'); data.name = name; }
    if (body.price !== undefined) { const price = Number(body.price); if (!Number.isFinite(price) || price < 0) return badRequest('Price must be zero or greater'); data.price = price; }
    if (body.quantity !== undefined) { const quantity = Number(body.quantity); if (!Number.isInteger(quantity) || quantity < current.soldCount) return badRequest(`Inventory cannot be lower than ${current.soldCount} tickets already sold`); data.quantity = quantity; }
    if (!Object.keys(data).length) return badRequest('Provide a name, price, or inventory value');
    const result = await prisma.ticketType.update({ where: { id }, data });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'UPDATE', entity: 'TicketType', entityId: id } });
    return NextResponse.json({ data: result });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const actor = await requireRoles('ADMIN');
    const { id } = await params;
    const type = await prisma.ticketType.findUnique({ where: { id }, include: { _count: { select: { tickets: true } } } });
    if (!type) return NextResponse.json({ error: 'Ticket type not found' }, { status: 404 });
    if (type._count.tickets > 0) return NextResponse.json({ error: 'Ticket types with issued tickets are retained for history.' }, { status: 409 });
    await prisma.ticketType.delete({ where: { id } });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'DELETE', entity: 'TicketType', entityId: id } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiError(error); }
}
