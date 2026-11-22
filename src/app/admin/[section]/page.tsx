import { notFound } from 'next/navigation';
import { Activity, CalendarDays, ClipboardList, ShieldAlert, Users } from 'lucide-react';
import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import ApiTable from '@/components/portal/ApiTable';
import AdminManager from '@/components/portal/AdminManager';
import PortalOverview from '@/components/portal/PortalOverview';
import TicketScanner from '@/components/portal/TicketScanner';
import TicketScanLog from '@/components/portal/TicketScanLog';
import RecentCheckIns from '@/components/portal/RecentCheckIns';
import IncidentSearch from '@/components/portal/IncidentSearch';
import CivicNotifications from '@/components/portal/CivicNotifications';
import IncidentAssignmentManager from '@/components/portal/IncidentAssignmentManager';

const config: Record<string, { title: string; endpoint?: string }> = {
  overview: { title: 'Admin dashboard' },
  users: { title: 'User management' },
  staff: { title: 'Security staff' },
  events: { title: 'Event management', endpoint: '/api/events' },
  venues: { title: 'Venue management', endpoint: '/api/venues' },
  zones: { title: 'Zone management' },
  gates: { title: 'Gate management' },
  assignments: { title: 'Volunteer and staff assignments' },
  'ticket-types': { title: 'Ticket types' },
  departments: { title: 'Departments' },
  categories: { title: 'Incident categories' },
  registrations: { title: 'Registrations', endpoint: '/api/registrations' },
  tickets: { title: 'Ticket management', endpoint: '/api/tickets' },
  scans: { title: 'Ticket scan log' },
  scanner: { title: 'Ticket scanner' },
  crowd: { title: 'Crowd monitoring', endpoint: '/api/crowd-observations' },
  incidents: { title: 'Incident management', endpoint: '/api/incidents' },
  complaints: { title: 'Resident complaints', endpoint: '/api/complaints' },
  feedback: { title: 'Resident feedback', endpoint: '/api/feedback' },
  notifications: { title: 'Notifications', endpoint: '/api/notifications' },
  alerts: { title: 'Alerts', endpoint: '/api/alerts' },
  reports: { title: 'Reports' },
  'audit-logs': { title: 'Audit logs' },
  settings: { title: 'System settings' },
  profile: { title: 'Admin profile' },
};
const adminHref = (key: string) => key === 'overview' ? '/admin/dashboard' : `/admin/${key}`;
const links = [{ label: 'Overview', href: adminHref('overview') }];
const navGroups = [
  { label: 'Events & spaces', keys: ['events', 'venues', 'zones', 'gates', 'ticket-types'] },
  { label: 'Incident taxonomy', keys: ['departments', 'categories'] },
  { label: 'People & shifts', keys: ['users', 'staff', 'assignments'] },
  { label: 'Tickets & entry', keys: ['registrations', 'tickets', 'scanner', 'scans'] },
  { label: 'Safety', keys: ['crowd', 'incidents', 'complaints', 'feedback', 'notifications', 'alerts'] },
  { label: 'Reports', keys: ['reports', 'audit-logs'] },
  { label: 'Account', keys: ['settings', 'profile'] },
].map(group => ({ label: group.label, links: group.keys.map(key => ({ label: config[key].title, href: adminHref(key) })) }));

export default async function AdminSection({ params }: { params: Promise<{ section: string }> }) {
  await requirePageRole('ADMIN');
  const { section } = await params;
  const page = config[section];
  if (!page) notFound();
  return (
    <PortalShell title={page.title} subtitle="Administrator control centre" links={links} groups={navGroups}>
      {section === 'overview' ? <><PortalOverview
        heading="Welcome to EventCrowd"
        description="Manage event operations, coordinate your teams, and keep an eye on safety from one workspace."
        primaryAction={{ label: 'Manage events', href: '/admin/events' }}
        cards={[
          { title: 'Events & spaces', description: 'Set up events, venues, zones, gates, and ticket types.', href: '/admin/events', icon: CalendarDays },
          { title: 'People & shifts', description: 'Manage accounts and assign staff or volunteer access.', href: '/admin/assignments', icon: Users, accent: 'bg-violet-50 text-violet-700' },
          { title: 'Tickets & entry', description: 'Review registrations, scan tickets, and monitor check-ins.', href: '/admin/scans', icon: ClipboardList, accent: 'bg-emerald-50 text-emerald-700' },
          { title: 'Safety', description: 'Monitor incidents, crowd levels, and active alerts.', href: '/admin/incidents', icon: ShieldAlert, accent: 'bg-amber-50 text-amber-700' },
          { title: 'Reports & audit', description: 'Review event summaries and recorded changes.', href: '/admin/reports', icon: Activity },
        ]}
      /><RecentCheckIns/></> : section === 'scanner' ? <TicketScanner /> : section === 'scans' ? <TicketScanLog /> : section === 'incidents' ? <><IncidentSearch/><IncidentAssignmentManager/><ApiTable title={page.title} endpoint={page.endpoint!}/></> : section === 'notifications' ? <CivicNotifications /> : ['events', 'venues', 'zones', 'gates', 'ticket-types', 'departments', 'categories', 'registrations', 'users', 'audit-logs', 'staff', 'assignments'].includes(section) ? <AdminManager resource={section} /> : page.endpoint ? <ApiTable title={page.title} endpoint={page.endpoint} /> : <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">{page.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">This section is part of the administrator workspace. Use the event, venue, team, report, and audit tools from the navigation to manage connected project data.</p></div>}
    </PortalShell>
  );
}
