'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, Clock3, RefreshCw, ScanLine } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type ScanRow = { id: string; event: string; attendee: string; attendeeEmail: string; gate: string; scannedBy: string; scanType: string; result: string; scannedAt: string };

export default function RecentCheckIns() {
  const [rows, setRows] = useState<ScanRow[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  useRealtimeRefresh(() => setRefresh(value => value + 1));

  useEffect(() => {
    let active = true;
    fetch('/api/scans', { cache: 'no-store' })
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || 'Could not load recent check-ins');
        return body.data as ScanRow[];
      })
      .then(data => { if (active) { setRows(data.slice(0, 3)); setError(''); } })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'Could not load recent check-ins'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refresh]);

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
      <div><h2 className="font-bold text-slate-900">Recent check-ins</h2><p className="mt-0.5 text-sm text-slate-600">Latest attendee ticket scans</p></div>
      <Link href="/admin/scans" className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Full scan log<ArrowRight size={15}/></Link>
    </header>
    {error ? <p role="alert" className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>
      : loading ? <p className="p-5 text-sm text-slate-600">Loading recent check-ins…</p>
      : rows.length === 0 ? <div className="flex items-center gap-3 p-5"><span className="rounded-xl bg-blue-50 p-2.5 text-blue-700"><ScanLine size={19}/></span><p className="text-sm text-slate-600">Scans will appear here when guests enter an event.</p></div>
      : <ul className="divide-y divide-slate-100">{rows.map(row => <li key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
        <div className="flex min-w-0 items-center gap-3"><span className={`rounded-full p-2 ${row.result === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}><CheckCircle2 size={17}/></span><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900">{row.attendee}<span className="font-normal text-slate-500"> · {row.event}</span></p><p className="truncate text-xs text-slate-500">{row.gate} · {row.scannedBy} · {row.result.toLowerCase()} {row.scanType.toLowerCase()}</p></div></div>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-xs text-slate-500"><Clock3 size={13}/>{new Date(row.scannedAt).toLocaleString()}</span>
      </li>)}</ul>}
    <button type="button" onClick={() => { setLoading(true); setRefresh(value => value + 1); }} disabled={loading} className="m-4 inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>Refresh</button>
  </section>;
}
