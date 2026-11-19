import { notFound } from 'next/navigation';
import { CalendarDays, ClipboardList, ScanLine, ShieldAlert, Users } from 'lucide-react';
import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import ApiTable from '@/components/portal/ApiTable';
import PortalOverview from '@/components/portal/PortalOverview';
import TicketScanner from '@/components/portal/TicketScanner';
import { prisma } from '@/lib/prisma';

const cfg: Record<string, { title: string; endpoint?: string }> = {
  overview: { title: 'Volunteer dashboard' },
  events: { title: 'My assigned events', endpoint: '/api/admin/assignments/volunteers' },
  assignments: { title: 'My assignments', endpoint: '/api/admin/assignments/volunteers' },
  scanner: { title: 'Ticket scanner' },
  zones: { title: 'Assigned zones', endpoint: '/api/admin/assignments/volunteers' },
  incidents: { title: 'My incident reports', endpoint: '/api/incidents' },
  notifications: { title: 'Notifications' },
  profile: { title: 'My profile' },
};
const links = Object.keys(cfg).map(key => ({ label: cfg[key].title, href: `/volunteer/${key}` }));

export default async function VolunteerSection({ params }: { params: Promise<{ section: string }> }) {
  const user = await requirePageRole('VOLUNTEER');
  const { section } = await params;
  const page = cfg[section];
  if (!page) notFound();
  const canScanTickets = ['overview', 'scanner'].includes(section) && await prisma.volunteerAssignment.findFirst({ where: { volunteerId: user.id, status: { in: ['ASSIGNED', 'ACTIVE'] }, canScanTickets: true }, select: { id: true } });
  return (
    <PortalShell title={page.title} subtitle="Volunteer workspace" links={links}>
      {section === 'overview' ? <PortalOverview
        heading="Thanks for being part of the team"
        description="Check your assigned shifts and events, and use your workspace to help keep event operations running smoothly."
        primaryAction={{ label: 'View my assignments', href: '/volunteer/assignments' }}
        cards={[
          { title: 'My events', description: 'See the events and locations you are assigned to support.', href: '/volunteer/events', icon: CalendarDays },
          { title: 'My assignments', description: 'Review shift times, zones, and current assignment status.', href: '/volunteer/assignments', icon: ClipboardList, accent: 'bg-violet-50 text-violet-700' },
          ...(canScanTickets ? [{ title: 'Ticket scanner', description: 'Scan attendee QR tickets for events the admin authorized you to support.', href: '/volunteer/scanner', icon: ScanLine, accent: 'bg-blue-50 text-blue-700' }] : []),
          { title: 'Incident reports', description: 'Review reports relevant to your assigned event.', href: '/volunteer/incidents', icon: ShieldAlert, accent: 'bg-amber-50 text-amber-700' },
        ]}
      /> : section === 'scanner' ? canScanTickets ? <TicketScanner /> : <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6"><h2 className="font-bold text-amber-950">Scanner access is not enabled</h2><p className="mt-2 text-sm leading-6 text-amber-900">An administrator must grant ticket-scanning access on your volunteer assignment before you can scan attendee tickets.</p></section> : page.endpoint ? <ApiTable title={page.title} endpoint={page.endpoint} /> : <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users size={21} /></span><h2 className="mt-4 text-lg font-bold">{page.title}</h2><p className="mt-1 text-sm leading-6 text-slate-600">This area is ready for your volunteer account settings and updates.</p></div>}
    </PortalShell>
  );
}
