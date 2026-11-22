'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, RefreshCw, Search } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type Row = Record<string, unknown>;

function textValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map(textValue).join(', ');
  if (typeof value === 'object') {
    const record = value as Row;
    return String(record.name ?? record.fullName ?? record.title ?? record.email ?? '—');
  }
  return String(value);
}

export default function ApiTable({ title, endpoint }: { title: string; endpoint: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useRealtimeRefresh(() => setRefreshKey(current => current + 1));

  useEffect(() => {
    let live = true;
    fetch(endpoint, { cache: 'no-store' })
      .then(async response => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Unable to load this information');
        return result;
      })
      .then(result => { if (live) { setRows(Array.isArray(result.data) ? result.data : []); setError(''); setNotice(typeof result.notice === 'string' ? result.notice : ''); } })
      .catch(reason => { if (live) setError(reason instanceof Error ? reason.message : 'Unable to load this information'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [endpoint, refreshKey]);

  function refresh() {
    setError('');
    setLoading(true);
    setRefreshKey(current => current + 1);
  }

  const visibleRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(row => Object.values(row).map(textValue).join(' ').toLowerCase().includes(needle));
  }, [query, rows]);

  function values(row: Row, index: number) {
    const event = row.event as Row | undefined;
    const zone = row.zone as Row | undefined;
    const attendee = row.attendee as Row | undefined;
    const person = row.person as Row | undefined;
    const user = row.user as Row | undefined;
    const primary = title === 'Assigned events' || title === 'Gate assignments'
      ? textValue(event?.name ?? row.name ?? row.title ?? row.fullName ?? `Assignment ${index + 1}`)
      : title === 'Resident complaints' || title === 'Resident feedback'
        ? textValue((row.incident as Row | undefined)?.title ?? row.title ?? `Record ${index + 1}`)
      : title === 'Crowd observations'
        ? `${textValue(zone?.name ?? 'Zone')} crowd reading`
        : title === 'Notifications'
          ? `Security alert · ${textValue(row.type)}`
          : textValue(row.name ?? row.title ?? row.fullName ?? row.registrationNumber ?? attendee?.fullName ?? person?.fullName ?? user?.fullName ?? event?.name ?? zone?.name ?? row.type ?? row.action ?? `${title.replace(/s$/, '')} ${index + 1}`);
    const status = title === 'Crowd observations'
      ? `${textValue(row.percentage ?? 0)}% occupied`
      : title === 'Resident feedback'
        ? `${textValue(row.rating)} / 5`
      : textValue(row.status ?? row.eventStatus ?? row.result ?? row.type);
    const timestamp = row.shiftStart || row.observedAt || row.createdAt;
    const when = timestamp ? new Date(String(timestamp)).toLocaleString() : '';
    const detail = title === 'Assigned events' || title === 'Gate assignments'
      ? [zone?.name ? `Zone: ${textValue(zone.name)}` : 'All assigned zones', row.shiftStart ? `Shift: ${new Date(String(row.shiftStart)).toLocaleString()} – ${new Date(String(row.shiftEnd)).toLocaleTimeString()}` : ''].filter(Boolean).join(' · ')
      : title === 'Resident complaints' || title === 'Resident feedback'
        ? [textValue(row.reason ?? row.comment ?? ''), row.submittedBy ? `By: ${textValue((row.submittedBy as Row).fullName)}` : '', (row.incident as Row | undefined)?.event ? `Event: ${textValue(((row.incident as Row).event as Row).name)}` : '', when].filter(Boolean).join(' · ')
      : title === 'Crowd observations'
        ? [`${textValue(event?.name)} · ${textValue(row.occupancy)} / ${textValue(row.capacity)} people`, when].filter(Boolean).join(' · ')
        : [textValue(row.message ?? row.description ?? row.email ?? row.city ?? row.venue), event?.name ? `Event: ${textValue(event.name)}` : '', zone?.name ? `Zone: ${textValue(zone.name)}` : '', attendee?.fullName ? `Attendee: ${textValue(attendee.fullName)}` : '', person?.fullName ? `Person: ${textValue(person.fullName)}` : '', user?.fullName ? `By: ${textValue(user.fullName)}` : '', when].filter(Boolean).join(' · ');
    return { primary, status, detail };
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm" aria-live="polite">
      <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{loading ? 'Loading your latest information…' : `${rows.length} ${rows.length === 1 ? 'record' : 'records'}`}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {rows.length > 0 && <label className="relative block">
            <span className="sr-only">Search {title.toLowerCase()}</span>
            <Search aria-hidden="true" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search records" className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-56" />
          </label>}
          <button type="button" onClick={refresh} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} aria-hidden="true" /> Refresh
          </button>
        </div>
      </div>

      {notice && <p className="mx-5 mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900 sm:mx-6">{notice}</p>}
      {loading ? <div className="flex items-center gap-3 px-6 py-12 text-sm text-slate-600"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" aria-hidden="true" />Loading records…</div>
        : error ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 sm:m-6"><p className="font-semibold text-red-900">We couldn’t load this page</p><p className="mt-1 text-sm leading-6 text-red-800">{error}</p><button type="button" onClick={refresh} className="mt-3 rounded-lg bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-800">Try again</button></div>
          : visibleRows.length === 0 ? <div className="px-6 py-12 text-center sm:py-16">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"><ClipboardList size={22} aria-hidden="true" /></span>
            <h3 className="mt-4 text-base font-semibold text-slate-900">{rows.length === 0 ? 'Nothing to show yet' : 'No matching records'}</h3>
            <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-600">{rows.length === 0 ? 'Once there is activity for this section, it will appear here.' : 'Try a different search term.'}</p>
          </div>
            : <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] text-left text-sm text-slate-800">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600"><tr className="border-b border-slate-200"><th scope="col" className="px-5 py-3">Item</th><th scope="col" className="px-5 py-3">Status</th><th scope="col" className="px-5 py-3">Details</th></tr></thead>
                <tbody>{visibleRows.map((row, index) => { const cell = values(row, index); return <tr key={String(row.id ?? index)} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-5 py-4 font-semibold text-slate-900">{cell.primary}</td><td className="px-5 py-4"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{cell.status}</span></td><td className="max-w-lg px-5 py-4 text-slate-600"><span className="line-clamp-2">{cell.detail}</span></td></tr>; })}</tbody>
              </table>
            </div>}
    </section>
  );
}
