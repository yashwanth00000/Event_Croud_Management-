import { notFound } from 'next/navigation';
import { CalendarDays, ClipboardList, Ticket } from 'lucide-react';
import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import ApiTable from '@/components/portal/ApiTable';
import PortalOverview from '@/components/portal/PortalOverview';
import AttendeeTicketWallet from '@/components/portal/AttendeeTicketWallet';
import AttendeeIncidentFollowup from '@/components/portal/AttendeeIncidentFollowup';
import CivicNotifications from '@/components/portal/CivicNotifications';

const cfg: Record<string, { title: string; endpoint?: string }> = {
  overview: { title: 'Attendee dashboard' },
  events: { title: 'Available events', endpoint: '/api/events' },
  registrations: { title: 'My registrations', endpoint: '/api/registrations' },
  tickets: { title: 'My tickets', endpoint: '/api/registrations' },
  incidents: { title: 'My incident reports' },
  notifications: { title: 'Notifications', endpoint: '/api/notifications' },
  profile: { title: 'My profile' },
};
const links = Object.keys(cfg).map(key => ({ label: cfg[key].title, href: `/attendee/${key}` }));

export default async function AttendeeSection({ params }: { params: Promise<{ section: string }> }) {
  await requirePageRole('ATTENDEE');
  const { section } = await params;
  const page = cfg[section];
  if (!page) notFound();
  return (
    <PortalShell title={page.title} subtitle="Your EventCrowd account" links={links}>
      {section === 'overview' ? <PortalOverview
        heading="Your next event starts here"
        description="Explore published events, keep track of your registrations, and find your tickets in one place."
        primaryAction={{ label: 'Browse events', href: '/attendee/events' }}
        cards={[
          { title: 'Browse events', description: 'Find an event and choose the ticket that suits you.', href: '/attendee/events', icon: CalendarDays },
          { title: 'My registrations', description: 'Review the events you have registered for.', href: '/attendee/registrations', icon: ClipboardList, accent: 'bg-violet-50 text-violet-700' },
          { title: 'My tickets', description: 'Open your tickets and get ready to check in.', href: '/attendee/tickets', icon: Ticket, accent: 'bg-emerald-50 text-emerald-700' },
          { title: 'Report an issue', description: 'Report event concerns and follow up on incident progress.', href: '/attendee/incidents', icon: ClipboardList, accent: 'bg-amber-50 text-amber-700' },
        ]}
      /> : section === 'tickets' ? <AttendeeTicketWallet /> : section === 'incidents' ? <AttendeeIncidentFollowup /> : section === 'notifications' ? <CivicNotifications /> : page.endpoint ? <ApiTable title={page.title} endpoint={page.endpoint} /> : <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-bold text-slate-900">Your profile</h2><p className="mt-2 text-sm leading-6 text-slate-600">Your account details are managed securely with your EventCrowd account.</p></section>}
    </PortalShell>
  );
}
