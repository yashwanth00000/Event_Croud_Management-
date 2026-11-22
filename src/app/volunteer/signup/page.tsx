'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import PasswordInput from '@/components/auth/PasswordInput';

type VolunteerForm = { fullName: string; email: string; phone: string; password: string; skills: string };
const initialForm: VolunteerForm = { fullName: '', email: '', phone: '', password: '', skills: '' };

export default function VolunteerSignupPage() {
  const [form, setForm] = useState<VolunteerForm>(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function update(field: keyof VolunteerForm, value: string) {
    setForm(current => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/volunteers/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, skills: form.skills.split(',').map(skill => skill.trim()).filter(Boolean) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Signup failed');
      setMessage('Application submitted. Your account is pending administrator approval.');
      setForm(initialForm);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Signup failed');
    } finally {
      setBusy(false);
    }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 p-4 sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-emerald-500/15 blur-3xl" />
    <form onSubmit={submit} className="relative w-full max-w-lg space-y-4 rounded-3xl border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-9">
      <Link href="/" className="inline-flex items-center rounded-lg bg-emerald-50 px-3 py-1.5 text-sm font-bold tracking-wide text-emerald-800">EventCrowd</Link>
      <div><h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Volunteer application</h1><p className="mt-2 text-sm leading-6 text-slate-600">Apply to join an event team. You can sign in after an administrator approves your account.</p></div>
      <label className="block text-sm font-semibold capitalize text-slate-700">Full name<input required minLength={2} maxLength={100} autoComplete="name" value={form.fullName} onChange={event => update('fullName', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="block text-sm font-semibold capitalize text-slate-700">Email<input required type="email" autoComplete="email" value={form.email} onChange={event => update('email', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="block text-sm font-semibold capitalize text-slate-700">Phone (optional)<input type="tel" autoComplete="tel" value={form.phone} onChange={event => update('phone', event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
      <label className="block text-sm font-semibold capitalize text-slate-700">Password<PasswordInput minLength={10} maxLength={128} autoComplete="new-password" value={form.password} onChange={value => update('password', value)} /></label>
      <label className="block text-sm font-semibold text-slate-700">Skills (comma separated)<input value={form.skills} onChange={event => update('skills', event.target.value)} placeholder="First aid, guest support…" className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-100" /></label>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {message && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-emerald-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700 disabled:cursor-wait disabled:opacity-60">{busy ? 'Submitting…' : 'Submit application'}</button>
      <Link href="/volunteer/login" className="block text-sm text-blue-700 underline">Already approved? Volunteer login</Link>
      <Link href="/" className="block text-sm text-slate-500 underline">Back to home</Link>
    </form>
  </main>;
}
