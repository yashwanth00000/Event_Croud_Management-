import Link from 'next/link';
import { ReactNode } from 'react';
import LogoutButton from '@/components/auth/LogoutButton';
import PortalNav from '@/components/portal/PortalNav';

export default function PortalShell({ title, subtitle, links, groups, children }: {
  title: string;
  subtitle: string;
  links: { label: string; href: string }[];
  groups?: { label: string; links: { label: string; href: string }[] }[];
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-slate-950 px-5 py-5 text-white sm:px-8">
        <div className="mx-auto flex max-w-screen-2xl flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/" className="text-sm font-bold tracking-wide text-blue-300">EventCrowd</Link>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-sm text-slate-300">{subtitle}</p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-300"><span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />Live updates · every 5 seconds</span>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>
      <div className="mx-auto grid max-w-screen-2xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-8 lg:px-8">
        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-6">
          <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Workspace</p>
          <PortalNav links={links} groups={groups} />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
