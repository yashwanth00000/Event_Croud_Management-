import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';

export async function GET() {
  try {
    const user = await requireRoles('ADMIN', 'SECURITY_STAFF', 'VOLUNTEER');
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const roles = user.roles.map(role => role.role.name.toUpperCase());
    const assignments = isAdmin ? [] : await Promise.all([
      roles.includes('SECURITY_STAFF') ? prisma.staffAssignment.findMany({ where: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } }, select: { eventId: true } }) : Promise.resolve([]),
      roles.includes('VOLUNTEER') ? prisma.volunteerAssignment.findMany({ where: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, canScanTickets: true }, select: { eventId: true } }) : Promise.resolve([]),
    ]).then(([staff, volunteers]) => [...staff, ...volunteers]);
    if (!isAdmin && !assignments.length) return NextResponse.json({ data: [] });
    const scans = await prisma.gateScan.findMany({
      where: isAdmin ? {} : { eventId: { in: [...new Set(assignments.map(item => item.eventId))] } },
      include: { ticket: { select: { qrCode: true, status: true, registration: { select: { registrationNumber: true, attendee: { select: { fullName: true, email: true } } } }, ticketType: { select: { name: true } } } }, event: { select: { id: true, name: true } }, gate: { select: { name: true, gateCode: true } }, scannedBy: { select: { fullName: true, email: true } } },
      orderBy: { scannedAt: 'desc' }, take: 300,
    });
    const data = scans.map(scan => ({ id: scan.id, event: scan.event.name, attendee: scan.ticket.registration.attendee.fullName, attendeeEmail: scan.ticket.registration.attendee.email, registrationNumber: scan.ticket.registration.registrationNumber, ticketType: scan.ticket.ticketType.name, gate: scan.gate.name, gateCode: scan.gate.gateCode, scannedBy: scan.scannedBy.fullName, scanType: scan.scanType, result: scan.result, ticketStatus: scan.ticket.status, scannedAt: scan.scannedAt, synthetic: scan.ticket.qrCode.startsWith('SYNTHETIC-') }));
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(req: NextRequest) {
  try {
    const operator = await requireRoles('ADMIN', 'SECURITY_STAFF', 'VOLUNTEER');
    const body = await req.json();
    const qrCode = String(body.qrCode ?? '').trim();
    const gateId = String(body.gateId ?? '');
    const eventId = String(body.eventId ?? '');
    const scanType = body.scanType === 'EXIT' ? 'EXIT' : 'ENTRY';
    if (!qrCode || !gateId || !eventId) return badRequest('QR code, gate and event are required');

    const isAdmin = operator.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const result = await prisma.$transaction(async tx => {
      const ticket = await tx.ticket.findUnique({ where: { qrCode }, include: { registration: true, ticketType: true } });
      const gate = await tx.gate.findUnique({ where: { id: gateId }, include: { zone: true } });
      const event = await tx.event.findUnique({ where: { id: eventId }, select: { venueId: true } });
      if (!ticket || !gate || !event) {
        return { result: 'REJECTED' as const, reason: 'Ticket, event or gate is invalid', scanId: null as string | null };
      }

      if (!isAdmin) {
        const roles = operator.roles.map(role => role.role.name.toUpperCase());
        const assignmentChecks = await Promise.all([
          roles.includes('SECURITY_STAFF') ? tx.staffAssignment.findFirst({ where: { staffId: operator.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, OR: [{ zoneId: gate.zoneId }, { zoneId: null }] }, select: { id: true } }) : Promise.resolve(null),
          roles.includes('VOLUNTEER') ? tx.volunteerAssignment.findFirst({ where: { volunteerId: operator.id, eventId, status: { in: ['ASSIGNED', 'ACTIVE'] }, canScanTickets: true, OR: [{ zoneId: gate.zoneId }, { zoneId: null }] }, select: { id: true } }) : Promise.resolve(null),
        ]);
        if (!assignmentChecks.some(Boolean)) return { result: 'REJECTED' as const, reason: 'You are not assigned to this event or gate zone', scanId: null as string | null };
      }

      const contextValid = gate.isActive && gate.zone.venueId === event.venueId && ticket.registration.eventId === eventId && ticket.ticketType.eventId === eventId && ticket.registration.status === 'CONFIRMED';
      const previous = await tx.gateScan.findFirst({ where: { ticketId: ticket.id, result: 'ACCEPTED' }, orderBy: { scannedAt: 'desc' } });
      let scanResult: 'ACCEPTED' | 'REJECTED' = 'REJECTED';
      let reason = 'Ticket, event or gate is invalid';

      if (contextValid && scanType === 'ENTRY' && ticket.status === 'ACTIVE' && (!previous || previous.scanType === 'EXIT')) {
        scanResult = 'ACCEPTED';
        reason = 'Ticket accepted for entry';
        await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'USED' } });
      } else if (contextValid && scanType === 'EXIT' && ticket.status === 'USED' && previous?.scanType === 'ENTRY') {
        scanResult = 'ACCEPTED';
        reason = 'Ticket accepted for exit';
        await tx.ticket.update({ where: { id: ticket.id }, data: { status: 'ACTIVE' } });
      } else if (contextValid) {
        reason = scanType === 'ENTRY' ? 'Ticket has already been used for entry' : 'Ticket has no active entry to exit';
      }

      const scan = await tx.gateScan.create({ data: { ticketId: ticket.id, gateId, eventId, scannedById: operator.id, scanType, result: scanResult } });
      return { result: scanResult, reason, scanId: scan.id };
    }, { isolationLevel: 'Serializable' });

    await prisma.auditLog.create({ data: { userId: operator.id, action: 'TICKET_SCAN', entity: 'GateScan', entityId: result.scanId, details: { result: result.result, reason: result.reason, scanType } } });
    const status = result.result === 'ACCEPTED' ? 200 : result.reason.startsWith('You are not assigned') ? 403 : 422;
    return NextResponse.json({ result: result.result, reason: result.reason }, { status });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2034') {
      return NextResponse.json({ error: 'This ticket was scanned at the same time elsewhere. Retry the scan.' }, { status: 409 });
    }
    return apiError(error);
  }
}
