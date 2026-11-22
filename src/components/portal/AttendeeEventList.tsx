'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CalendarDays, MapPin, RefreshCw, Search, Ticket } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type EventItem = {
  id: string;
  name: string;
  description: string | null;
  startDate: string;
  endDate: string;
  venue: { name: string; city: string };
};

export default function AttendeeEventList() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useRealtimeRefresh(() => setRefreshKey(current => current + 1));

  useEffect(() => {
    let active = true;
    fetch('/api/events', { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load events');
        return result;
      })
      .then(result => { if (active) { setEvents(Array.isArray(result.data) ? result.data : []); setError(''); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load events'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  const filteredEvents = events.filter(event => `${event.name} ${event.description ?? ''} ${event.venue.name} ${event.venue.city}`.toLowerCase().includes(query.trim().toLowerCase()));

  return <section className="space-y-4" aria-live="polite">
    {loading && <div className="grid gap-4 sm:grid-cols-2"><div className="h-48 animate-pulse rounded-2xl bg-slate-200" /><div className="h-48 animate-pulse rounded-2xl bg-slate-200" /></div>}
    {error && <div role="alert" className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm"><p className="text-base font-semibold text-slate-900">Events couldn’t load</p><p className="mt-1 text-sm text-slate-600">{error}</p><div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={() => { setLoading(true); setError(''); setRefreshKey(current => current + 1); }} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800"><RefreshCw size={15} /> Try again</button><Link href="/attendee/overview" className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Back to dashboard</Link></div></div>}
    {!loading && !error && events.length > 0 && <label className="relative block"><span className="sr-only">Search available events</span><Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search events by name or venue" className="w-full rounded-2xl border border-slate-300 bg-white py-3.5 pl-11 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"/></label>}
    {!loading && !error && events.length === 0 && <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid items-center gap-6 p-6 sm:p-10 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:gap-8">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><CalendarDays size={30} strokeWidth={1.8} aria-hidden="true" /></span>
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">Event catalogue</p>
          <h2 className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">No events are open for registration yet</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">When organizers publish an event, you’ll find its details and ticket options here. Check back soon, or return to your dashboard to review your registrations.</p>
        </div>
        <Link href="/attendee/overview" className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">My dashboard<ArrowRight size={16} /></Link>
      </div>
      <div className="grid gap-3 border-t border-slate-100 bg-slate-50/80 p-5 sm:grid-cols-2 sm:px-10">
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-white p-2 text-slate-500 shadow-sm"><MapPin size={17} /></span><div><p className="text-sm font-semibold text-slate-800">Find events near you</p><p className="mt-0.5 text-sm text-slate-600">Published events appear with venue and date information.</p></div></div>
        <div className="flex items-start gap-3"><span className="mt-0.5 rounded-lg bg-white p-2 text-slate-500 shadow-sm"><Ticket size={17} /></span><div><p className="text-sm font-semibold text-slate-800">Choose tickets</p><p className="mt-0.5 text-sm text-slate-600">Ticket types and availability are shown on each event.</p></div></div>
      </div>
    </div>}
    {!loading && !error && events.length > 0 && filteredEvents.length===0 && <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-600">No events match that search. Try another event or venue name.</p>}
    {!loading && !error && filteredEvents.length > 0 && <div className="grid gap-4 xl:grid-cols-2">{filteredEvents.map(event => <article key={event.id} className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md sm:p-6">
      <div>
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-blue-800"><MapPin size={16} aria-hidden="true" /><span>{event.venue.name}</span><span className="text-slate-400">·</span><span>{event.venue.city}</span></div>
        <h2 className="mt-3 text-xl font-bold text-slate-950">{event.name}</h2>
        {event.description && <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">{event.description}</p>}
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={16} className="shrink-0 text-slate-400" aria-hidden="true" /><time dateTime={event.startDate}>{new Date(event.startDate).toLocaleString()}</time><span aria-hidden="true">–</span><time dateTime={event.endDate}>{new Date(event.endDate).toLocaleString()}</time></p>
      </div>
      <Link href={`/attendee/events/${encodeURIComponent(event.id)}/register`} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-700 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 sm:w-auto sm:self-start">Choose tickets<ArrowRight size={16} /></Link>
    </article>)}</div>}
  </section>;
}
