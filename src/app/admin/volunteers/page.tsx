import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import AdminVolunteersManager from '@/components/portal/AdminVolunteersManager';

const links = [
  { label: 'Admin dashboard', href: '/admin/dashboard' },
  { label: 'User management', href: '/admin/users' },
  { label: 'Volunteer management', href: '/admin/volunteers' },
  { label: 'Security staff', href: '/admin/staff' },
  { label: 'Event management', href: '/admin/events' },
  { label: 'Assignments', href: '/admin/assignments' },
  { label: 'Audit logs', href: '/admin/audit-logs' },
];

export default async function AdminVolunteersPage() {
  await requirePageRole('ADMIN');
  return <PortalShell title="Volunteer management" subtitle="Review applications and manage volunteer access" links={links}><AdminVolunteersManager /></PortalShell>;
}
