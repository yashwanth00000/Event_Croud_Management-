import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth/session';
import { apiError, badRequest } from '@/lib/api';
import { notifyAdmins } from '@/lib/civic-notifications';

export async function GET() {
  try {
    const user = await requireUser();
    const isAdmin = user.roles.some(role => role.role.name.toUpperCase() === 'ADMIN');
    const data = await prisma.incidentFeedback.findMany({ where: isAdmin ? {} : { submittedById: user.id }, include: { incident: { select: { id: true, title: true, status: true, event: { select: { name: true } } } }, submittedBy: { select: { fullName: true, email: true } } }, orderBy: { submittedAt: 'desc' }, take: 500 });
    return NextResponse.json({ data });
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    if (!user.roles.some(role => role.role.name.toUpperCase() === 'ATTENDEE')) return NextResponse.json({ error: 'Only attendees can submit incident feedback' }, { status: 403 });
    const body = await request.json();
    const incidentId = String(body.incidentId ?? ''), rating = Number(body.rating), comment = String(body.comment ?? '').trim();
    if (!incidentId || !Number.isInteger(rating) || rating < 1 || rating > 5 || comment.length > 4000) return badRequest('Select an incident, a rating from 1 to 5, and a comment under 4000 characters');
    const incident = await prisma.incident.findFirst({ where: { id: incidentId, reporterId: user.id, status: { in: ['RESOLVED', 'CLOSED'] } }, select: { id: true, title: true } });
    if (!incident) return NextResponse.json({ error: 'Feedback is available only for your resolved incidents' }, { status: 404 });
    const feedback = await prisma.incidentFeedback.create({ data: { incidentId, submittedById: user.id, rating, comment: comment || null } });
    await notifyAdmins({ actorId: user.id, incidentId, feedbackId: feedback.id, type: 'INCIDENT_FEEDBACK', message: `A resident left ${rating}-star feedback for “${incident.title}”.` }).catch(error => console.error('Feedback notification failed:', error));
    return NextResponse.json({ data: feedback }, { status: 201 });
  } catch (error) { return apiError(error); }
}
