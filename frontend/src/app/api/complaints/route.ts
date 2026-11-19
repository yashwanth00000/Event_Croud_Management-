import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import { notifyAdmins } from '@/lib/civic-notifications';

const progressRank: Record<string, number> = { REPORTED: 0, INVESTIGATING: 1, RESOLVED: 2, CLOSED: 2 };

export async function GET() {
  try {
    const user = await requireUser();
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const data = await prisma.incidentComplaint.findMany({ where: isAdmin ? {} : { submittedById: user.id }, include: { incident: { select: { id: true, title: true, status: true, event: { select: { name: true } } } }, submittedBy: { select: { fullName: true, email: true } } }, orderBy: { createdAt: 'desc' }, take: 500 });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.roles.some(role => role.role.name.toUpperCase() === 'ATTENDEE')) return NextResponse.json({ error: 'Only attendees can submit incident complaints' }, { status: 403 });
    const body = await request.json();
    const incidentId = String(body.incidentId ?? ''), reason = String(body.reason ?? '').trim();
    if (!incidentId || reason.length < 8 || reason.length > 4000) return badRequest('Choose an incident and enter a complaint of 8 to 4000 characters');
    const incident = await prisma.incident.findFirst({ where: { id: incidentId, reporterId: user.id }, select: { id: true, status: true, reportedAt: true, title: true } });
    if (!incident) return NextResponse.json({ error: 'Incident not found in your reports' }, { status: 404 });
    if (['RESOLVED', 'CLOSED'].includes(incident.status)) return badRequest('Complaints are closed for resolved incidents');

    const previous = await prisma.incidentComplaint.findFirst({ where: { incidentId, submittedById: user.id }, orderBy: { createdAt: 'desc' } });
    if (previous && Date.now() - previous.createdAt.getTime() < 24 * 60 * 60 * 1000) {
      const progress = await prisma.incidentStatusHistory.findFirst({ where: { incidentId, changedAt: { gt: previous.createdAt } }, orderBy: { changedAt: 'desc' }, select: { oldStatus: true, newStatus: true } });
      const regressed = Boolean(progress && progress.oldStatus && (progressRank[progress.newStatus] ?? 0) < (progressRank[progress.oldStatus] ?? 0));
      const advanced = Boolean(progress && (progressRank[progress.newStatus] ?? 0) > (progressRank[progress.oldStatus ?? 'REPORTED'] ?? 0));
      if (!regressed && !advanced) return NextResponse.json({ error: 'You can submit another complaint after 24 hours without status progress' }, { status: 429 });
    }

    const complaint = await prisma.incidentComplaint.create({ data: { incidentId, submittedById: user.id, reason, category: String(body.category ?? 'GENERAL').slice(0, 50).toUpperCase() } });
    await notifyAdmins({ actorId: user.id, incidentId, complaintId: complaint.id, type: 'INCIDENT_COMPLAINT', message: `A resident submitted a complaint about “${incident.title}”.` }).catch(error => console.error('Complaint notification failed:', error));
    return NextResponse.json({ data: complaint }, { status: 201 });
  } catch (error) { return apiError(error); }
}
