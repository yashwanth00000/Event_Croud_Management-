import { prisma } from '@/lib/prisma';

export async function notifyAdmins(input: { actorId: string; incidentId: string; type: string; message: string; complaintId?: string; feedbackId?: string }) {
  const admins = await prisma.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } }, select: { id: true } });
  const incident = await prisma.incident.findUnique({ where: { id: input.incidentId }, select: { assignedToId: true, assignments: { select: { officerId: true } } } });
  const recipients = [...new Set([...admins.map(admin => admin.id), ...(incident?.assignedToId ? [incident.assignedToId] : []), ...(incident?.assignments.map(assignment => assignment.officerId) ?? [])].filter(id => id !== input.actorId))];
  if (!recipients.length) return;
  await prisma.civicNotification.createMany({ data: recipients.map(recipientId => ({ recipientId, actorId: input.actorId, incidentId: input.incidentId, type: input.type, message: input.message, complaintId: input.complaintId, feedbackId: input.feedbackId })) });
}

export async function notifyIncidentStakeholders(input: { reporterId: string; actorId: string; incidentId: string; type: string; message: string }) {
  const recipients = await prisma.user.findMany({ where: { status: 'ACTIVE', roles: { some: { role: { name: 'ADMIN' } } } }, select: { id: true } });
  const incident = await prisma.incident.findUnique({ where: { id: input.incidentId }, select: { assignedToId: true, assignments: { select: { officerId: true } } } });
  const ids = [...new Set([input.reporterId, ...recipients.map(user => user.id), ...(incident?.assignedToId ? [incident.assignedToId] : []), ...(incident?.assignments.map(assignment => assignment.officerId) ?? [])].filter(id => id !== input.actorId))];
  if (!ids.length) return;
  await prisma.civicNotification.createMany({ data: ids.map(recipientId => ({ recipientId, actorId: input.actorId, incidentId: input.incidentId, type: input.type, message: input.message })) });
}
