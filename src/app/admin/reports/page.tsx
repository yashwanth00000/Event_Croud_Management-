import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import AdminReports from '@/components/portal/AdminReports';

const links = [
  { label: 'Dashboard', href: '/admin/overview' }, { label: 'Users', href: '/admin/users' },
  { label: 'Volunteers', href: '/admin/volunteers' }, { label: 'Staff', href: '/admin/staff' },
  { label: 'Events', href: '/admin/events' }, { label: 'Venues', href: '/admin/venues' },
  { label: 'Zones', href: '/admin/zones' }, { label: 'Gates', href: '/admin/gates' },
  { label: 'Registrations', href: '/admin/registrations' }, { label: 'Tickets', href: '/admin/tickets' },
  { label: 'Crowd', href: '/admin/crowd' }, { label: 'Incidents', href: '/admin/incidents' },
  { label: 'Alerts', href: '/admin/alerts' }, { label: 'Reports', href: '/admin/reports' },
  { label: 'Audit logs', href: '/admin/audit-logs' }, { label: 'Settings', href: '/admin/settings' },
];

export default async function AdminReportsPage() {
  await requirePageRole('ADMIN');
  return <PortalShell title="Reports & analytics" subtitle="Live event and crowd reports from PostgreSQL" links={links}><AdminReports /></PortalShell>;
}
