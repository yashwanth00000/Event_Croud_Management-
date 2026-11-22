'use client';

import { useEffect, useState } from 'react';
import { Check, RefreshCw, Search, Users, X } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type Volunteer = { id: string; fullName: string; email: string; status: string; phone?: string | null; volunteerProfile?: { skills: string[] } | null };

export default function AdminVolunteersManager() {
  const [items, setItems] = useState<Volunteer[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  useRealtimeRefresh(() => setRefreshKey(current => current + 1));

  useEffect(() => {
    let mounted = true;
    fetch('/api/admin/volunteers', { cache: 'no-store' })
      .then(async response => { const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Unable to load volunteers'); return result.data as Volunteer[]; })
      .then(data => { if (mounted) { setItems(data); setError(''); } })
      .catch(reason => { if (mounted) setError(reason instanceof Error ? reason.message : 'Unable to load volunteers'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [refreshKey]);

  const filtered = items.filter(item => `${item.fullName} ${item.email} ${item.phone ?? ''} ${item.status} ${item.volunteerProfile?.skills.join(' ') ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()));

  async function act(userId: string, action: string) {
    setBusy(userId + action); setError('');
    try {
      const response = await fetch('/api/admin/volunteers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, action }) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Action failed');
      setRefreshKey(current => current + 1); setLoading(true);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Action failed'); }
    finally { setBusy(''); }
  }

  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div><h2 className="text-lg font-bold text-slate-900">Volunteer applications</h2><p className="mt-1 text-sm text-slate-600">{loading ? 'Loading applications…' : `${items.length} ${items.length === 1 ? 'application' : 'applications'}`}</p></div>
      <div className="flex flex-col gap-2 sm:flex-row">
        {items.length > 0 && <label className="relative block"><span className="sr-only">Search volunteers</span><Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Search volunteers" className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100 sm:w-56" /></label>}
        <button type="button" onClick={() => { setLoading(true); setRefreshKey(current => current + 1); }} disabled={loading} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} />Refresh</button>
      </div>
    </div>
    {error ? <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div>
      : loading ? <div className="flex items-center gap-3 px-6 py-12 text-sm text-slate-600"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-700 border-t-transparent" />Loading applications…</div>
        : items.length === 0 ? <div className="px-6 py-14 text-center"><span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700"><Users size={22} /></span><h3 className="mt-4 text-base font-semibold text-slate-900">No volunteer applications yet</h3><p className="mt-1 text-sm text-slate-600">New applications will appear here for review.</p></div>
          : filtered.length === 0 ? <p className="px-6 py-12 text-center text-sm text-slate-600">No volunteers match that search.</p>
            : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-left text-sm text-slate-800"><thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600"><tr className="border-b border-slate-200">{['Volunteer','Contact','Skills','Status','Actions'].map(label => <th scope="col" key={label} className="px-5 py-3">{label}</th>)}</tr></thead><tbody>{filtered.map(volunteer => <tr key={volunteer.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="px-5 py-4"><p className="font-semibold text-slate-900">{volunteer.fullName}</p><p className="mt-0.5 text-xs text-slate-500">{volunteer.volunteerProfile?.skills?.length ? `${volunteer.volunteerProfile.skills.length} listed skills` : 'Volunteer account'}</p></td><td className="px-5 py-4 text-slate-700">{volunteer.email}<p className="mt-0.5 text-xs text-slate-500">{volunteer.phone || 'No phone provided'}</p></td><td className="max-w-xs px-5 py-4 text-slate-600">{volunteer.volunteerProfile?.skills?.join(', ') || 'Not specified'}</td><td className="px-5 py-4"><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${volunteer.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-800' : volunteer.status === 'BLOCKED' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-800'}`}>{volunteer.status}</span></td><td className="px-5 py-4"><div className="flex flex-wrap gap-2">{volunteer.status !== 'ACTIVE' && <button disabled={!!busy} onClick={() => act(volunteer.id, 'APPROVE')} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"><Check size={14} />Approve</button>}{volunteer.status === 'ACTIVE' ? <button disabled={!!busy} onClick={() => act(volunteer.id, 'DEACTIVATE')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-60"><X size={14} />Deactivate</button> : <button disabled={!!busy} onClick={() => act(volunteer.id, 'REJECT')} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-60">Reject</button>}</div></td></tr>)}</tbody></table></div>}
  </section>;
}
