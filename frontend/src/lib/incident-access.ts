import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth/session';

export async function visibleIncidentIds(user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) {
  const roles = user.roles.map(item => item.role.name.toUpperCase());
  if (roles.includes('ADMIN')) return null;
  const where: Prisma.IncidentWhereInput = roles.includes('ORGANIZER')
    ? { event: { organizerId: user.id } }
    : roles.includes('VOLUNTEER')
      ? { OR: [ { reporterId: user.id }, { event: { volunteerAssignments: { some: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } } } ] }
      : roles.includes('SECURITY_STAFF')
        ? { OR: [ { reporterId: user.id }, { assignedToId: user.id }, { assignments: { some: { officerId: user.id } } }, { event: { staffAssignments: { some: { staffId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] } } } } }, ...(user.isDepartmentManager && user.departmentId ? [{ category: { departmentId: user.departmentId } }] : []) ] }
        : { reporterId: user.id };
  const incidents = await prisma.incident.findMany({ where, select: { id: true } });
  return incidents.map(incident => incident.id);
}
