import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import AttendeeEventList from '@/components/portal/AttendeeEventList';

const links = [
  { label: 'Dashboard', href: '/attendee/overview' },
  { label: 'Events', href: '/attendee/events' },
  { label: 'Registrations', href: '/attendee/registrations' },
  { label: 'Tickets', href: '/attendee/tickets' },
  { label: 'Notifications', href: '/attendee/notifications' },
  { label: 'Profile', href: '/attendee/profile' },
];

export default async function AttendeeEventsPage() {
  await requirePageRole('ATTENDEE');
  return <PortalShell title="Available events" subtitle="Browse published events and choose tickets" links={links}>
    <AttendeeEventList />
  </PortalShell>;
}
