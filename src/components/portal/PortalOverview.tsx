import Link from 'next/link';
import { ArrowRight, type LucideIcon } from 'lucide-react';

type OverviewCard = { title: string; description: string; href: string; icon: LucideIcon; accent?: string };

export default function PortalOverview({ heading, description, cards, primaryAction }: {
  heading: string;
  description: string;
  cards: OverviewCard[];
  primaryAction?: { label: string; href: string };
}) {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-blue-200 bg-blue-50 p-6 text-slate-900 shadow-sm sm:p-8">
        <div className="absolute -right-10 -top-16 h-56 w-56 rounded-full bg-blue-200/40 blur-2xl" />
        <div className="relative max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-blue-800">Your workspace</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{heading}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700 sm:text-base">{description}</p>
          {primaryAction && <Link href={primaryAction.href} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">{primaryAction.label}<ArrowRight size={16} /></Link>}
        </div>
      </section>
      <section aria-label="Workspace shortcuts" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ title, description: cardDescription, href, icon: Icon, accent = 'bg-blue-50 text-blue-700' }) => (
          <Link key={href} href={href} className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:p-6">
            <span className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${accent}`}><Icon size={21} aria-hidden="true" /></span>
            <h3 className="mt-4 flex items-center justify-between text-base font-bold text-slate-900">{title}<ArrowRight size={16} className="text-slate-400 transition group-hover:translate-x-1 group-hover:text-blue-700" /></h3>
            <p className="mt-1 text-sm leading-6 text-slate-600">{cardDescription}</p>
          </Link>
        ))}
      </section>
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:px-5">
        <p className="text-sm text-slate-600">Need help? Use the portal navigation to return to these tools any time.</p>
        <Link href="/" className="text-sm font-semibold text-blue-700 hover:text-blue-900 hover:underline">EventCrowd home</Link>
      </section>
    </div>
  );
}
