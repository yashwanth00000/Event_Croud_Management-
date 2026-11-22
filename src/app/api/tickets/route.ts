import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRoles } from '@/lib/auth/session';
import { apiError } from '@/lib/api';

export async function GET() {
  try {
    await requireRoles('ADMIN');
    const tickets = await prisma.ticket.findMany({
      include: {
        registration: { select: { registrationNumber: true, status: true, attendee: { select: { fullName: true, email: true } }, event: { select: { id: true, name: true } } } },
        ticketType: { select: { name: true } },
        gateScans: { orderBy: { scannedAt: 'desc' }, take: 1, include: { gate: { select: { name: true } }, scannedBy: { select: { fullName: true } } } },
      },
      orderBy: { issuedAt: 'desc' },
      take: 500,
    });
    const data = tickets.map(ticket => {
      const lastScan = ticket.gateScans[0];
      return {
        id: ticket.id,
        name: `${ticket.registration.attendee.fullName} · ${ticket.registration.event.name}`,
        status: ticket.status,
        attendeeEmail: ticket.registration.attendee.email,
        event: ticket.registration.event.name,
        ticketType: ticket.ticketType.name,
        registrationNumber: ticket.registration.registrationNumber,
        registrationStatus: ticket.registration.status,
        qrCode: ticket.qrCode,
        lastScanResult: lastScan?.result ?? 'NOT SCANNED',
        lastScanGate: lastScan?.gate.name ?? '—',
        scannedBy: lastScan?.scannedBy.fullName ?? '—',
        lastScannedAt: lastScan?.scannedAt ?? null,
        issuedAt: ticket.issuedAt,
        synthetic: ticket.qrCode.startsWith('SYNTHETIC-'),
      };
    });
    return NextResponse.json({ data });
  } catch (error) {
    return apiError(error);
  }
}
