'use client';

import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

type TicketType = { id: string; name: string; price: string | number; quantity: number; soldCount: number };

export default function EventRegisterPage() {
  const { id } = useParams<{ id: string }>();
  const [types, setTypes] = useState<TicketType[]>([]);
  const [typeId, setTypeId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [needsLogin, setNeedsLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const selectedType = types.find(ticket => ticket.id === typeId);
  const maxQuantity = selectedType ? Math.min(8, selectedType.quantity - selectedType.soldCount) : 1;

  useEffect(() => {
    let active = true;
    async function loadTicketTypes() {
      try {
        const response = await fetch(`/api/ticket-types?eventId=${encodeURIComponent(id)}`);
        const result = await response.json();
        if (!active) return;
        if (response.status === 401) {
          setNeedsLogin(true);
          setError('Sign in with an attendee account to see available tickets.');
          return;
        }
        if (!response.ok) throw new Error(result.error || 'Unable to load ticket types');
        const available = (Array.isArray(result.data) ? result.data : []).filter((item: TicketType) => item.quantity > item.soldCount);
        setTypes(available);
        if (available[0]) setTypeId(available[0].id);
        else setError('No tickets are currently available for this event.');
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load ticket types');
      }
    }
    void loadTicketTypes();
    return () => { active = false; };
  }, [id]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: id, ticketTypeId: typeId, quantity }),
      });
      const result = await response.json();
      if (response.status === 401) {
        setNeedsLogin(true);
        throw new Error('Sign in with an attendee account before registering.');
      }
      if (!response.ok) throw new Error(result.error || 'Registration failed');
      setMessage('Registration confirmed. Your tickets are available in My Tickets.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Registration failed. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="mx-auto max-w-xl p-6">
    <Link href="/attendee/events" className="text-blue-700 underline">Back to events</Link>
    <h1 className="my-5 text-3xl font-bold">Register for event</h1>
    <form onSubmit={submit} className="space-y-4 rounded-xl border bg-white p-6">
      <label className="block text-sm font-semibold">Ticket type
        <select required value={typeId} onChange={event => setTypeId(event.target.value)} disabled={!types.length || busy} className="mt-1 w-full rounded border p-3">
          {types.map(ticket => <option key={ticket.id} value={ticket.id}>{ticket.name} · ₹{ticket.price} · {ticket.quantity - ticket.soldCount} available</option>)}
        </select>
      </label>
      <label className="block text-sm font-semibold">Quantity
        <input required type="number" min={1} max={maxQuantity} value={quantity} onChange={event => setQuantity(Number(event.target.value))} disabled={!types.length || busy} className="mt-1 w-full rounded border p-3" />
      </label>
      {error && <div role="alert" className="rounded bg-red-50 p-3 text-sm text-red-700">{error}{needsLogin && <span className="mt-2 flex gap-3"><Link className="font-semibold underline" href={`/attendee/login?next=${encodeURIComponent(`/attendee/events/${id}/register`)}`}>Attendee login</Link><Link className="font-semibold underline" href={`/register?next=${encodeURIComponent(`/attendee/events/${id}/register`)}`}>Create account</Link></span>}</div>}
      {message && <div role="status" className="rounded bg-emerald-50 p-3 text-sm text-emerald-800">{message} <Link className="font-semibold underline" href="/attendee/tickets">View tickets</Link></div>}
      <button type="submit" disabled={!typeId || !types.length || busy || !!message} className="w-full rounded bg-blue-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Registering…' : 'Confirm registration'}</button>
    </form>
  </main>;
}
