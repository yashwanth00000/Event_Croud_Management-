'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import QRCode from 'qrcode';
import { CalendarDays, MapPin, Ticket } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type TicketRow = { id: string; qrCode: string; status: string; ticketType: { name: string }; issuedAt: string };
type Registration = { id: string; registrationNumber: string; status: string; event: { name: string; startDate: string; venue: { name: string; city: string } }; tickets: TicketRow[] };

export default function AttendeeTicketWallet() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useRealtimeRefresh(() => setRefreshKey(current => current + 1));

  useEffect(() => {
    let active = true;
    fetch('/api/registrations', { cache: 'no-store' })
      .then(async response => { const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Could not load tickets'); return body.data as Registration[]; })
      .then(async data => {
        const urls = await Promise.all(data.flatMap(registration => registration.tickets.map(async ticket => [ticket.id, await QRCode.toDataURL(ticket.qrCode, { width: 220, margin: 2, errorCorrectionLevel: 'M' })] as const)));
        if (active) { setRegistrations(data); setQrImages(Object.fromEntries(urls)); }
      })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load tickets'); });
    return () => { active = false; };
  }, [refreshKey]);

  const tickets = registrations.flatMap(registration => registration.tickets.map(ticket => ({ registration, ticket })));
  return <section className="space-y-5" aria-live="polite">
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold text-slate-900">Your tickets</h2><p className="mt-1 text-sm text-slate-600">Show the QR code at the event entrance. Each active ticket can be scanned once for entry.</p></div>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {!error && tickets.length === 0 && <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center"><Ticket className="mx-auto text-blue-700" size={30}/><h3 className="mt-3 font-semibold text-slate-900">No tickets yet</h3><p className="mt-1 text-sm text-slate-600">Browse available events and register to get a ticket with its own QR code.</p></div>}
    <div className="grid gap-4 lg:grid-cols-2">{tickets.map(({registration,ticket}) => <article key={ticket.id} className="flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center">
      <div className="rounded-xl border border-slate-200 bg-white p-2">{qrImages[ticket.id] ? <Image src={qrImages[ticket.id]} alt={`QR ticket for ${registration.event.name}`} width={176} height={176} unoptimized/> : <div className="h-44 w-44 animate-pulse rounded-lg bg-slate-100"/>}</div>
      <div className="min-w-0"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${ticket.status==='ACTIVE'?'bg-emerald-50 text-emerald-800':ticket.status==='USED'?'bg-blue-50 text-blue-800':'bg-slate-100 text-slate-600'}`}>{ticket.status==='USED'?'CHECKED IN':ticket.status}</span><h3 className="mt-2 text-xl font-bold text-slate-950">{registration.event.name}</h3><p className="mt-1 font-medium text-slate-700">{ticket.ticketType.name}</p><p className="mt-3 flex items-center gap-2 text-sm text-slate-600"><CalendarDays size={15}/>{new Date(registration.event.startDate).toLocaleString()}</p><p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin size={15}/>{registration.event.venue.name}, {registration.event.venue.city}</p><p className="mt-3 text-xs text-slate-500">Registration {registration.registrationNumber}</p></div>
    </article>)}</div>
  </section>;
}
