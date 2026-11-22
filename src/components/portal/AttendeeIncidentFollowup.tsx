'use client';

import { FormEvent, useEffect, useState } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { useRealtimeRefresh } from '@/lib/realtime-refresh';

type Incident = { id: string; title: string; description: string; severity: string; categoryId?: string | null; status: string; event?: { name: string } };
type Option = { id: string; name: string };

export default function AttendeeIncidentFollowup() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [events, setEvents] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  async function load() {
    const [incidentResponse, registrationResponse, categoryResponse] = await Promise.all([fetch('/api/incidents', { cache: 'no-store' }), fetch('/api/registrations', { cache: 'no-store' }), fetch('/api/incident-categories', { cache: 'no-store' })]);
    const [incidentBody, registrationBody, categoryBody] = await Promise.all([incidentResponse.json(), registrationResponse.json(), categoryResponse.json()]);
    if (!incidentResponse.ok) throw new Error(incidentBody.error || 'Could not load incident reports');
    setIncidents(incidentBody.data ?? []); setEvents((registrationBody.data ?? []).filter((registration: { status: string }) => registration.status === 'CONFIRMED').map((registration: { event: { id: string; name: string } }) => registration.event).filter((event: Option, index: number, all: Option[]) => all.findIndex(candidate => candidate.id === event.id) === index)); setCategories(categoryBody.data ?? []);
  }
  useEffect(() => { load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not load data')); }, []);
  useRealtimeRefresh(() => load().catch(reason => setError(reason instanceof Error ? reason.message : 'Could not refresh data')));
  async function submit(event: FormEvent<HTMLFormElement>, path: string, extra: Record<string, string> = {}) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const form = event.currentTarget;
    const body = { ...Object.fromEntries(new FormData(form).entries()), ...extra };
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not save your request');
      form.reset(); setNotice(path === '/api/incidents' ? 'Incident reported.' : path === '/api/complaints' ? 'Complaint submitted.' : 'Feedback submitted.');
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save your request'); }
    finally { setBusy(false); }
  }
  async function updateReport(event: FormEvent<HTMLFormElement>, incidentId: string) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const response = await fetch(`/api/incidents/${incidentId}`, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(new FormData(event.currentTarget).entries())) });
      const result = await response.json(); if (!response.ok) throw new Error(result.error || 'Could not update report');
      setNotice('Incident report updated.'); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not update report'); }
    finally { setBusy(false); }
  }
  const inputClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100';
  return <div className="space-y-5">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-bold">Report an event issue</h2><p className="mt-1 text-sm text-slate-600">Report a concern connected to an event you are registered for.</p></div><button type="button" onClick={() => load().catch(reason => setError(reason.message))} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold hover:bg-slate-50"><RefreshCw size={15}/>Refresh</button></div>
      <form onSubmit={event => submit(event, '/api/incidents')} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1.5 text-sm font-semibold">Event<select name="eventId" required className={inputClass}><option value="">Choose a registered event</option>{events.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold">Category<select name="categoryId" className={inputClass}><option value="">Choose a category (optional)</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label className="grid gap-1.5 text-sm font-semibold">Title<input name="title" minLength={4} maxLength={200} required className={inputClass}/></label>
        <label className="grid gap-1.5 text-sm font-semibold">Priority<select name="severity" defaultValue="MEDIUM" className={inputClass}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select></label>
        <label className="grid gap-1.5 text-sm font-semibold sm:col-span-2">Details<textarea name="description" minLength={8} maxLength={5000} required rows={3} className={inputClass}/></label>
        <div><button disabled={busy} className="inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-800 disabled:opacity-50"><Send size={15}/>{busy ? 'Sending…' : 'Submit report'}</button></div>
      </form>
      {events.length === 0 && <p className="mt-3 text-sm text-amber-800">You need a confirmed event registration before reporting an event issue.</p>}
    </section>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}{notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"><h2 className="text-lg font-bold">My incident reports</h2><div className="mt-4 space-y-3">{incidents.length === 0 ? <p className="text-sm text-slate-600">Your incident reports will appear here.</p> : incidents.map(incident => <article key={incident.id} className="rounded-xl border border-slate-200 p-4"><div><h3 className="font-semibold">{incident.title}</h3><p className="text-sm text-slate-600">{incident.event?.name ?? 'Event'} · {incident.status}</p></div>{incident.status === 'REPORTED' ? <form onSubmit={event => updateReport(event, incident.id)} className="mt-3 grid gap-2"><p className="text-xs text-slate-500">You can edit this report until staff begin work on it.</p><input name="title" defaultValue={incident.title} minLength={4} maxLength={160} required aria-label="Edit report title" className={inputClass}/><select name="categoryId" defaultValue={incident.categoryId ?? ''} className={inputClass}><option value="">No category</option>{categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select><textarea name="description" defaultValue={incident.description} minLength={8} maxLength={4000} required aria-label="Edit report description" rows={2} className={inputClass}/><div className="flex flex-wrap items-center gap-2"><select name="severity" defaultValue={incident.severity} aria-label="Priority" className={inputClass + ' sm:max-w-48'}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option></select><button disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Save changes</button></div></form> : incident.status === 'RESOLVED' || incident.status === 'CLOSED' ? <form onSubmit={event => submit(event, '/api/feedback', { incidentId: incident.id })} className="mt-3 grid gap-2 sm:grid-cols-[130px_1fr_auto]"><select name="rating" required className={inputClass}><option value="">Rating</option>{[5,4,3,2,1].map(value => <option key={value} value={value}>{value} stars</option>)}</select><input name="comment" maxLength={4000} placeholder="Optional feedback" className={inputClass}/><button disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Submit feedback</button></form> : <form onSubmit={event => submit(event, '/api/complaints', { incidentId: incident.id })} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><input name="reason" minLength={8} maxLength={4000} required placeholder="Describe your concern" className={inputClass}/><button disabled={busy} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold hover:bg-slate-50">Submit complaint</button></form>}</article>)}</div></section>
  </div>;
}
