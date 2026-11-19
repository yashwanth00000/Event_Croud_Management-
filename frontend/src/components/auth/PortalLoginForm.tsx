'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import PasswordInput from '@/components/auth/PasswordInput';

type Portal = 'ADMIN' | 'VOLUNTEER' | 'SECURITY_STAFF';

export default function PortalLoginForm({ portal }: { portal: Portal }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const title = portal === 'ADMIN' ? 'Admin' : portal === 'VOLUNTEER' ? 'Volunteer' : 'Security Staff';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, portal }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Sign in failed');
      router.replace(portal === 'ADMIN' ? '/admin/dashboard' : portal === 'VOLUNTEER' ? '/volunteer/dashboard' : '/staff/dashboard');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed');
    } finally {
      setBusy(false);
    }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-indigo-600/20 blur-3xl" />
    <form onSubmit={submit} className="relative w-full max-w-md space-y-5 rounded-3xl border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-9">
      <Link href="/" className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold tracking-wide text-blue-800">EventCrowd</Link>
      <div><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{title} Login</h1><p className="mt-2 text-sm leading-6 text-slate-600">Sign in using your authorized account.</p></div>
      <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
      <label className="block text-sm font-semibold text-slate-700">Password<PasswordInput autoComplete="current-password" value={password} onChange={setPassword} /></label>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
      <div className="flex flex-wrap justify-between gap-3 text-sm">
        <Link href="/" className="text-slate-500 underline">Home</Link>
        {portal === 'VOLUNTEER' && <Link href="/volunteer/signup" className="text-blue-700 underline">Apply as volunteer</Link>}
        {portal === 'ADMIN' && <span className="text-slate-500">Admin accounts are provisioned by an administrator.</span>}
        {portal === 'SECURITY_STAFF' && <span className="text-slate-500">Ask an administrator to create your staff account.</span>}
      </div>
    </form>
  </main>;
}
