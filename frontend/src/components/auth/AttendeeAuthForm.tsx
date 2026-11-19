'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import PasswordInput from '@/components/auth/PasswordInput';

export default function AttendeeAuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const signup = mode === 'signup';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(signup ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signup ? { fullName, email, password } : { email, password, portal: 'ATTENDEE' }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || (signup ? 'Account creation failed' : 'Sign in failed'));
      const next = new URLSearchParams(window.location.search).get('next');
      const destination = next?.startsWith('/attendee/') ? next : '/attendee/dashboard';
      router.replace(destination);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Request failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-blue-600/20 blur-3xl" />
    <form onSubmit={submit} className="relative w-full max-w-md space-y-5 rounded-3xl border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-9">
      <Link href="/" className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold tracking-wide text-blue-800">EventCrowd</Link>
      <div><h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">{signup ? 'Create attendee account' : 'Attendee login'}</h1><p className="mt-2 text-sm leading-6 text-slate-600">{signup ? 'Register for events and manage your tickets.' : 'Sign in to view your registrations and tickets.'}</p></div>
      {signup && <label className="block text-sm font-semibold text-slate-700">Full name<input required minLength={2} maxLength={100} autoComplete="name" value={fullName} onChange={event => setFullName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>}
      <label className="block text-sm font-semibold text-slate-700">Email<input required type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 font-normal text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100" /></label>
      <label className="block text-sm font-semibold text-slate-700">Password<PasswordInput minLength={10} maxLength={128} autoComplete={signup ? 'new-password' : 'current-password'} value={password} onChange={setPassword} /><span className="mt-1 block text-xs font-normal text-slate-500">Use 10–128 characters.</span></label>
      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm leading-5 text-red-800">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 disabled:cursor-wait disabled:opacity-60">{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      <p className="text-sm text-slate-600">{signup ? 'Already registered?' : 'New to EventCrowd?'} <Link className="font-semibold text-blue-700 underline" href={signup ? '/attendee/login' : '/register'}>{signup ? 'Sign in' : 'Create an account'}</Link></p>
      <Link href="/" className="block text-sm text-slate-500 underline">Back to home</Link>
    </form>
  </main>;
}
