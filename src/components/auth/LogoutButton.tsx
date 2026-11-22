'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function LogoutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function logout() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Could not sign out. Please try again.');
      router.replace('/login');
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not sign out. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="flex items-center gap-3">{error && <span role="alert" className="text-xs text-rose-300">{error}</span>}<button type="button" onClick={logout} disabled={busy} className="rounded-lg border border-slate-600 px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Signing out…' : 'Sign out'}</button></div>;
}
