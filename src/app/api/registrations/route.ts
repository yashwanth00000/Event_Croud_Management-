import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { requireRoles, requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
export async function GET() {
  try {
    const user = await requireUser();
    const isAdmin = user.roles.some(r => ['ADMIN','ORGANIZER'].includes(r.role.name.toUpperCase()));
    const data = await prisma.registration.findMany({ where: isAdmin ? {} : { attendeeId: user.id }, include: { event: { include: { venue: true } }, attendee: { select: { id: true, fullName: true, email: true } }, tickets: { include: { ticketType: true } } }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ data });
  } catch (e) { return apiError(e); }
}
export async function POST(req: NextRequest) {
  try {
    const user = await requireRoles('ATTENDEE');
    const b = await req.json();
    const eventId = String(b.eventId ?? ''), ticketTypeId = String(b.ticketTypeId ?? '');
    const quantity = Number(b.quantity ?? 1);
    if (!eventId || !ticketTypeId || !Number.isInteger(quantity) || quantity < 1 || quantity > 8) return badRequest('Choose an event, ticket type and quantity from 1 to 8');
    const event = await prisma.event.findFirst({ where: { id: eventId, status: 'PUBLISHED', endDate: { gte: new Date() } } });
    if (!event) return badRequest('Event is not open for registration');
    const result = await prisma.$transaction(async tx => {
      const type = await tx.ticketType.findFirst({ where: { id: ticketTypeId, eventId } });
      if (!type) throw new Error('INSUFFICIENT_TICKETS');
      const inventory = await tx.ticketType.updateMany({
        where: { id: type.id, soldCount: { lte: type.quantity - quantity } },
        data: { soldCount: { increment: quantity } },
      });
      if (inventory.count !== 1) throw new Error('INSUFFICIENT_TICKETS');
      const registration = await tx.registration.create({ data: { registrationNumber: `EC-${randomBytes(6).toString('hex').toUpperCase()}`, attendeeId: user.id, eventId, status: 'CONFIRMED' } });
      const tickets = await Promise.all(Array.from({ length: quantity }, (_, i) => tx.ticket.create({ data: { registrationId: registration.id, ticketTypeId: type.id, qrCode: `EC1.${randomBytes(24).toString('base64url')}.${i}` } })));
      return { registration, tickets };
    });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'REGISTER', entity: 'Registration', entityId: result.registration.id } });
    return NextResponse.json({ data: result }, { status: 201 });
  } catch (e) { if (e instanceof Error && e.message === 'INSUFFICIENT_TICKETS') return NextResponse.json({ error: 'Not enough tickets remain' }, { status: 409 }); return apiError(e); }
}

export async function PATCH(req: NextRequest) {
  try {
    const actor = await requireRoles('ADMIN', 'ORGANIZER');
    const body = await req.json();
    const registrationId = String(body.registrationId ?? body.id ?? '');
    if (!registrationId || String(body.status ?? '').toUpperCase() !== 'CANCELLED') return badRequest('Registration ID and CANCELLED status are required');
    const registration = await prisma.registration.findUnique({ where: { id: registrationId }, include: { tickets: { select: { id: true, ticketTypeId: true, status: true } }, event: { select: { organizerId: true } } } });
    if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
    const isAdmin = actor.roles.some(r => r.role.name.toUpperCase() === 'ADMIN');
    if (!isAdmin && registration.event.organizerId !== actor.id) return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    if (registration.status === 'CANCELLED') return NextResponse.json({ error: 'Registration is already cancelled' }, { status: 409 });
    const activeTickets = registration.tickets.filter(ticket => ticket.status === 'ACTIVE');
    const counts = new Map<string, number>();
    for (const ticket of activeTickets) counts.set(ticket.ticketTypeId, (counts.get(ticket.ticketTypeId) ?? 0) + 1);
    const updated = await prisma.$transaction(async tx => {
      const changed = await tx.registration.updateMany({ where: { id: registrationId, status: { in: ['PENDING', 'CONFIRMED'] } }, data: { status: 'CANCELLED' } });
      if (changed.count !== 1) throw new Error('REGISTRATION_ALREADY_CANCELLED');
      await tx.ticket.updateMany({ where: { registrationId, status: 'ACTIVE' }, data: { status: 'CANCELLED' } });
      for (const [ticketTypeId, count] of counts) {
        const inventory = await tx.ticketType.updateMany({ where: { id: ticketTypeId, soldCount: { gte: count } }, data: { soldCount: { decrement: count } } });
        if (inventory.count !== 1) throw new Error('TICKET_INVENTORY_INCONSISTENT');
      }
      return tx.registration.findUniqueOrThrow({ where: { id: registrationId }, include: { tickets: true } });
    }, { isolationLevel: 'Serializable' });
    await prisma.auditLog.create({ data: { userId: actor.id, action: 'CANCEL', entity: 'Registration', entityId: registrationId } });
    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'REGISTRATION_ALREADY_CANCELLED') return NextResponse.json({ error: 'Registration is already cancelled' }, { status: 409 });
    if (error instanceof Error && error.message === 'TICKET_INVENTORY_INCONSISTENT') return NextResponse.json({ error: 'Ticket inventory changed unexpectedly; transaction was rolled back' }, { status: 409 });
    return apiError(error);
  }
}
