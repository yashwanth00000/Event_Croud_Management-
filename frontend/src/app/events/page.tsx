import Link from 'next/link';
import AttendeeEventList from '@/components/portal/AttendeeEventList';

export default function PublicEventsPage() {
  return <main className="min-h-screen bg-slate-50">
    <header className="border-b bg-slate-950 px-6 py-5 text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-xl font-bold">Event<span className="text-blue-400">Crowd</span></Link>
        <nav aria-label="Main navigation" className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-slate-300 hover:text-white">Home</Link>
          <Link href="/attendee/login" className="text-slate-300 hover:text-white">Attendee sign in</Link>
          <Link href="/register" className="rounded-lg bg-blue-600 px-3 py-2 font-semibold hover:bg-blue-700">Create account</Link>
        </nav>
      </div>
    </header>
    <div className="mx-auto max-w-7xl space-y-6 px-5 py-10 sm:px-8">
      <div><p className="text-xs font-bold tracking-widest text-blue-700">PUBLIC EVENT CATALOGUE</p><h1 className="mt-2 text-3xl font-bold text-slate-900">Find your next event</h1><p className="mt-2 text-sm text-slate-600">Published events open for registration appear here.</p></div>
      <AttendeeEventList />
    </div>
  </main>;
}
