import { notFound } from 'next/navigation';
import { CalendarDays, ClipboardList, MapPinned, ShieldAlert } from 'lucide-react';
import { requirePageRole } from '@/lib/auth/page-guard';
import PortalShell from '@/components/portal/PortalShell';
import ApiTable from '@/components/portal/ApiTable';
import PortalOverview from '@/components/portal/PortalOverview';
import { prisma } from '@/lib/prisma';

const cfg: Record<string, { title: string; endpoint?: string }> = {
  overview: { title: 'Security staff dashboard' },
  events: { title: 'Assigned events', endpoint: '/api/admin/assignments/staff' },
  gates: { title: 'Gate assignments', endpoint: '/api/admin/assignments/staff' },
  crowd: { title: 'Crowd observations', endpoint: '/api/crowd-observations' },
  incidents: { title: 'Incident reports', endpoint: '/api/incidents' },
  notifications: { title: 'Notifications', endpoint: '/api/alerts' },
  profile: { title: 'Staff profile' },
};
const links = Object.keys(cfg).map(key => ({ label: cfg[key].title, href: `/staff/${key}` }));

export default async function StaffSection({ params }: { params: Promise<{ section: string }> }) {
  const currentUser = await requirePageRole('SECURITY_STAFF', 'ADMIN');
  const { section } = await params;
  const page = cfg[section];
  if (!page) notFound();
  const staff = section === 'profile' ? await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { fullName: true, email: true, phone: true, status: true, staffProfile: { select: { staffCode: true, department: true } }, _count: { select: { staffAssignments: true } } },
  }) : null;
  return (
    <PortalShell title={page.title} subtitle="Security operations workspace" links={links}>
      {section === 'overview' ? <PortalOverview
        heading="Your operations, at a glance"
        description="Quickly reach your assigned events, gates, crowd observations, and safety reports."
        primaryAction={{ label: 'View assigned events', href: '/staff/events' }}
        cards={[
          { title: 'Assigned events', description: 'Review your event shifts and assigned zones.', href: '/staff/events', icon: CalendarDays },
          { title: 'Gate assignments', description: 'Check gate coverage for your upcoming shifts.', href: '/staff/gates', icon: MapPinned, accent: 'bg-violet-50 text-violet-700' },
          { title: 'Incident reports', description: 'Review and update safety reports for your events.', href: '/staff/incidents', icon: ShieldAlert, accent: 'bg-amber-50 text-amber-700' },
          { title: 'Crowd observations', description: 'Review recent occupancy readings from assigned zones.', href: '/staff/crowd', icon: ClipboardList, accent: 'bg-emerald-50 text-emerald-700' },
        ]}
      /> : page.endpoint ? <ApiTable title={page.title} endpoint={page.endpoint} /> : <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="flex items-start gap-4"><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-xl font-bold text-blue-700">{staff?.fullName?.slice(0,1).toUpperCase() ?? 'S'}</div><div><h2 className="text-xl font-bold text-slate-900">{staff?.fullName ?? 'Staff profile'}</h2><p className="mt-1 text-sm text-slate-600">Your account and security staff details</p></div></div><dl className="mt-7 grid gap-4 sm:grid-cols-2">{[['Email',staff?.email],['Phone',staff?.phone],['Staff code',staff?.staffProfile?.staffCode],['Department',staff?.staffProfile?.department],['Account status',staff?.status],['Assignments',staff?._count.staffAssignments]].map(([label,value])=><div key={String(label)} className="rounded-xl bg-slate-50 p-4"><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 font-medium text-slate-900">{value ?? (label === 'Phone' ? 'Not provided' : 'Not assigned')}</dd></div>)}</dl></section>}
    </PortalShell>
  );
}
