'use client';

import { useEffect, useState } from 'react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type OperationsRow = {
  eventId: string;
  eventName: string;
  eventStatus: string;
  venueName: string;
  venueCity: string;
  registrationCount: number;
  confirmedRegistrations: number;
  ticketCount: number;
  usedTicketCount: number;
  acceptedEntries: number;
  incidentCount: number;
  openCriticalIncidents: number;
  volunteerAssignments: number;
  staffAssignments: number;
};
type CrowdRow = {
  eventName: string;
  zoneName: string;
  rowKey: string;
  sampleCount: number;
  averageOccupancy: number;
  peakOccupancy: number;
  latestCapacity: number;
  latestPercentage: number;
  latestObservedAt: string;
  latestSource: string;
};

async function getRows<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Unable to load report data');
  return Array.isArray(result.data) ? result.data : [];
}

export default function AdminReports() {
  const [events, setEvents] = useState<OperationsRow[]>([]);
  const [crowd, setCrowd] = useState<CrowdRow[]>([]);
  const [eventError, setEventError] = useState('');
  const [crowdError, setCrowdError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  useRealtimeRefresh(() => setRefreshKey(current => current + 1));

  useEffect(() => {
    let active = true;
    Promise.allSettled([getRows<OperationsRow>('/api/reports/operations'), getRows<CrowdRow>('/api/reports/crowd')]).then(([operations, crowdResult]) => {
      if (!active) return;
      if (operations.status === 'fulfilled') { setEvents(operations.value); setEventError(''); }
      else setEventError(operations.reason instanceof Error ? operations.reason.message : 'Could not load PostgreSQL report');
      if (crowdResult.status === 'fulfilled') { setCrowd(crowdResult.value); setCrowdError(''); }
      else setCrowdError(crowdResult.reason instanceof Error ? crowdResult.reason.message : 'Could not load crowd report');
      setLoading(false);
    });
    return () => { active = false; };
  }, [refreshKey]);

  const summary = [
    ['Events reported', events.length],
    ['Registrations', events.reduce((sum, row) => sum + row.registrationCount, 0)],
    ['Accepted entries', events.reduce((sum, row) => sum + row.acceptedEntries, 0)],
    ['Open critical incidents', events.reduce((sum, row) => sum + row.openCriticalIncidents, 0)],
  ];

  return <div className="space-y-6">
    {loading && <p role="status" className="rounded-lg border bg-white p-4 text-sm text-slate-600">Loading live PostgreSQL reports…</p>}
    <section aria-label="Event operations summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {summary.map(([label, value]) => <article key={label} className="rounded-xl border bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-3xl font-bold text-slate-900">{value}</p></article>)}
    </section>
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b p-5"><h2 className="font-bold">Event operations · PostgreSQL view</h2><p className="mt-1 text-sm text-slate-500">Registrations, tickets, gate entries, incidents, and staffing by event.</p></div>
      {eventError ? <p role="alert" className="p-5 text-sm text-red-700">{eventError}</p> : events.length === 0 && !loading ? <p className="p-5 text-sm text-slate-600">No event summary data is available. Apply the reporting migration and create events to populate this report.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Event','Status','Registrations','Tickets used','Entries','Incidents','Volunteers','Staff'].map(name => <th key={name} className="px-4 py-3">{name}</th>)}</tr></thead><tbody>{events.map(row => <tr key={row.eventId} className="border-t"><td className="px-4 py-3"><p className="font-semibold">{row.eventName}</p><p className="text-xs text-slate-500">{row.venueName} · {row.venueCity}</p></td><td className="px-4 py-3">{row.eventStatus}</td><td className="px-4 py-3">{row.confirmedRegistrations} / {row.registrationCount}</td><td className="px-4 py-3">{row.usedTicketCount} / {row.ticketCount}</td><td className="px-4 py-3">{row.acceptedEntries}</td><td className="px-4 py-3">{row.incidentCount}{row.openCriticalIncidents > 0 && <span className="ml-2 text-red-700">({row.openCriticalIncidents} critical)</span>}</td><td className="px-4 py-3">{row.volunteerAssignments}</td><td className="px-4 py-3">{row.staffAssignments}</td></tr>)}</tbody></table></div>}
    </section>
    <section className="overflow-hidden rounded-xl border bg-white">
      <div className="border-b p-5"><h2 className="font-bold">Crowd observation aggregation · PostgreSQL</h2><p className="mt-1 text-sm text-slate-500">Live aggregated readings for the past 30 days, grouped by event and zone.</p></div>
      {crowdError ? <p role="alert" className="p-5 text-sm text-red-700">{crowdError}</p> : crowd.length === 0 && !loading ? <p className="p-5 text-sm text-slate-600">No crowd observations were recorded in the past 30 days.</p> : <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Event','Zone','Samples','Average occupancy','Peak','Latest capacity','Latest reading','Source'].map(name => <th key={name} className="px-4 py-3">{name}</th>)}</tr></thead><tbody>{crowd.map(row => <tr key={row.rowKey} className="border-t"><td className="px-4 py-3 font-medium">{row.eventName}</td><td className="px-4 py-3">{row.zoneName}</td><td className="px-4 py-3">{row.sampleCount}</td><td className="px-4 py-3">{Math.round(row.averageOccupancy)}</td><td className="px-4 py-3">{row.peakOccupancy}</td><td className="px-4 py-3">{row.latestCapacity}</td><td className="px-4 py-3">{row.latestPercentage}% · {new Date(row.latestObservedAt).toLocaleString()}</td><td className="px-4 py-3">{row.latestSource}</td></tr>)}</tbody></table></div>}
    </section>
  </div>;
}
