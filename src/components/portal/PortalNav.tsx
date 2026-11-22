'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronDown } from 'lucide-react';

type NavLink = { label: string; href: string };
type NavGroup = { label: string; links: NavLink[] };

export default function PortalNav({ links, groups }: { links: NavLink[]; groups?: NavGroup[] }) {
  const pathname = usePathname();
  const active = (href: string) => pathname === href || (href === '/admin/dashboard' && pathname === '/admin/overview') || (href !== '/admin/dashboard' && pathname.startsWith(`${href}/`));
  return (
    <nav aria-label="Portal navigation" className="grid gap-1 pb-1 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pb-0">
      {links.map(({ label, href }) => {
        const isActive = active(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? 'page' : undefined}
            className={`rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${isActive ? 'bg-blue-50 text-blue-800 ring-1 ring-inset ring-blue-100' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'}`}
          >
            {label}
          </Link>
        );
      })}
      {groups?.map(group => {
        const containsActivePage = group.links.some(link => active(link.href));
        return <details key={group.label} open={containsActivePage} className="group/nav rounded-xl border border-slate-200 bg-white open:bg-slate-50">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
            <span>{group.label}</span><ChevronDown size={16} aria-hidden="true" className="shrink-0 text-slate-400 transition-transform group-open/nav:rotate-180" />
          </summary>
          <div className="grid gap-1 px-2 pb-2">{group.links.map(({ label, href }) => {
            const isActive = active(href);
            return <Link key={href} href={href} aria-current={isActive ? 'page' : undefined} className={`rounded-lg px-3 py-2 text-sm transition-colors ${isActive ? 'bg-blue-100 font-semibold text-blue-900' : 'text-slate-600 hover:bg-white hover:text-slate-950'}`}>{label}</Link>;
          })}</div>
        </details>;
      })}
    </nav>
  );
}
