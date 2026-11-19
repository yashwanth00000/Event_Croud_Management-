import Link from 'next/link';

const loginOptions = [
  { name: 'Attendee', description: 'Manage event registrations and tickets.', href: '/attendee/login', accent: 'bg-blue-700 hover:bg-blue-800' },
  { name: 'Volunteer', description: 'Sign in after your application is approved.', href: '/volunteer/login', accent: 'bg-emerald-700 hover:bg-emerald-800' },
  { name: 'Administrator', description: 'Sign in to manage EventCrowd operations.', href: '/admin/login', accent: 'bg-violet-700 hover:bg-violet-800' },
  { name: 'Security staff', description: 'Sign in to your assigned event workspace.', href: '/staff/login', accent: 'bg-slate-800 hover:bg-slate-900' },
];

export default function LoginPage() {
  return <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 p-4 sm:p-6">
    <div aria-hidden="true" className="pointer-events-none absolute right-0 top-0 h-80 w-80 rounded-full bg-blue-600/20 blur-3xl" />
    <section aria-labelledby="login-title" className="relative w-full max-w-4xl rounded-3xl border border-white/70 bg-white p-6 shadow-2xl shadow-slate-950/30 sm:p-9">
      <Link href="/" className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-bold tracking-wide text-blue-800">EventCrowd</Link>
      <h1 id="login-title" className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">Choose your login</h1>
      <p className="mt-2 text-slate-600">Select the account type you use for EventCrowd.</p>
      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        {loginOptions.map(option => <article key={option.name} className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm sm:p-6">
          <h2 className="text-lg font-bold">{option.name}</h2>
          <p className="mt-1 min-h-10 text-sm leading-6 text-slate-600">{option.description}</p>
          <Link href={option.href} className={`mt-4 inline-flex w-full justify-center rounded-xl px-4 py-3 text-sm font-semibold text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 ${option.accent}`}>Continue as {option.name}</Link>
        </article>)}
      </div>
      <div className="mt-6 flex flex-wrap justify-between gap-3 text-sm">
        <Link href="/register" className="font-semibold text-blue-700 underline">Create attendee account</Link>
        <Link href="/volunteer/signup" className="font-semibold text-emerald-700 underline">Apply as volunteer</Link>
        <Link href="/" className="text-slate-600 underline">Back to home</Link>
      </div>
    </section>
  </main>;
}
