
import Link from "next/link";
import {
  Activity,
  CalendarDays,
  ShieldCheck,
  Users,
  Ticket,
  MapPin,
  ArrowRight,
  HeartHandshake,
  BarChart3,
} from "lucide-react";
import ContactSection from "@/components/ContactSection";

const features = [
  {
    title: "Event Management",
    description: "Create events, manage venues and organize registrations.",
    icon: CalendarDays,
  },
  {
    title: "Volunteer Management",
    description: "Register volunteers, assign duties and manage shifts.",
    icon: HeartHandshake,
  },
  {
    title: "Crowd Monitoring",
    description: "Monitor zone occupancy and identify overcrowding.",
    icon: Activity,
  },
  {
    title: "Security Management",
    description: "Validate QR tickets and manage safety incidents.",
    icon: ShieldCheck,
  },
  {
    title: "Ticket Management",
    description: "Manage attendee registrations and digital tickets.",
    icon: Ticket,
  },
  {
    title: "Analytics & Reports",
    description: "Analyze attendance, volunteers and incident statistics.",
    icon: BarChart3,
  },
];

const portals = [
  {
    title: 'Attendee',
    description: 'Browse events, register, and manage tickets.',
    actions: [{ label: 'Sign in', href: '/attendee/login' }, { label: 'Create account', href: '/register' }],
    pages: [
      ['Sign in', '/attendee/login'], ['Dashboard', '/attendee/overview'], ['Public event catalogue', '/events'], ['My events', '/attendee/events'], ['Registrations', '/attendee/registrations'],
      ['Tickets', '/attendee/tickets'], ['Notifications', '/attendee/notifications'], ['Profile', '/attendee/profile'],
    ],
  },
  {
    title: 'Volunteer',
    description: 'Apply to volunteer or continue after approval.',
    actions: [{ label: 'Sign in', href: '/volunteer/login' }, { label: 'Apply', href: '/volunteer/signup' }],
    pages: [
      ['Dashboard', '/volunteer/overview'], ['Events', '/volunteer/events'], ['Assignments', '/volunteer/assignments'],
      ['Zones', '/volunteer/zones'], ['Incidents', '/volunteer/incidents'], ['Notifications', '/volunteer/notifications'], ['Profile', '/volunteer/profile'],
    ],
  },
  {
    title: 'Administrator',
    description: 'Manage events, teams, and operations.',
    actions: [{ label: 'Admin sign in', href: '/admin/login' }],
    note: 'Accounts are provisioned by an administrator.',
    pages: [
      ['Dashboard', '/admin/overview'], ['Users', '/admin/users'], ['Volunteers', '/admin/volunteers'], ['Staff', '/admin/staff'],
      ['Events', '/admin/events'], ['Venues', '/admin/venues'], ['Zones', '/admin/zones'], ['Gates', '/admin/gates'],
      ['Registrations', '/admin/registrations'], ['Tickets', '/admin/tickets'], ['Crowd', '/admin/crowd'], ['Incidents', '/admin/incidents'],
      ['Alerts', '/admin/alerts'], ['Reports', '/admin/reports'], ['Audit logs', '/admin/audit-logs'], ['Settings', '/admin/settings'], ['Profile', '/admin/profile'],
    ],
  },
  {
    title: 'Security staff',
    description: 'Access assigned gates and event operations.',
    actions: [{ label: 'Staff sign in', href: '/staff/login' }],
    note: 'Ask an administrator to create your account.',
    pages: [
      ['Dashboard', '/staff/overview'], ['Events', '/staff/events'], ['Gates', '/staff/gates'], ['Crowd', '/staff/crowd'],
      ['Incidents', '/staff/incidents'], ['Notifications', '/staff/notifications'], ['Profile', '/staff/profile'],
    ],
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-slate-800 bg-slate-950/95 px-6 py-5 backdrop-blur md:px-12">
        <Link href="/" className="text-2xl font-bold">
          Event<span className="text-blue-400">Crowd</span>
        </Link>

        <div className="hidden items-center gap-8 text-sm text-slate-300 md:flex">
          <Link href="/events" className="hover:text-blue-400">
            Events
          </Link>
          <Link href="#features" className="hover:text-blue-400">
            Features
          </Link>

          <Link href="#about" className="hover:text-blue-400">
            About
          </Link>

          <Link href="#contact" className="hover:text-blue-400">
            Contact
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="px-2 py-2 text-sm font-semibold text-slate-200 hover:text-white">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold hover:bg-blue-700">Create account</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center md:py-32">
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
          <Activity size={16} />
          Intelligent Event Management Platform
        </div>

        <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-7xl">
          Manage Events.
          <br />
          Monitor Crowds.
          <br />
          <span className="text-blue-400">
            Improve Safety.
          </span>
        </h1>

        <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-slate-400 md:text-lg">
          EventCrowd brings event registration, ticket validation,
          volunteer coordination, crowd monitoring and incident
          management into one centralized platform.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-7 py-3.5 font-semibold hover:bg-blue-700"
          >
            Browse Events
            <ArrowRight size={18} />
          </Link>

          <Link
            href="#about"
            className="rounded-lg border border-slate-700 px-7 py-3.5 font-semibold hover:bg-slate-900"
          >
            Learn More
          </Link>
          <Link href="/volunteer/signup" className="rounded-lg border border-slate-700 px-7 py-3.5 font-semibold hover:bg-slate-900">Apply as a Volunteer</Link>
        </div>
      </section>

      {/* Account access */}
      <section aria-labelledby="portal-access-title" className="border-y border-slate-800 bg-slate-900/50 px-6 py-14">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-400">Get started</p>
            <h2 id="portal-access-title" className="mt-2 text-2xl font-bold md:text-3xl">Choose your EventCrowd portal</h2>
            <p className="mt-2 text-sm text-slate-400">Sign in to your workspace or create an account where signup is available.</p>
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {portals.map(portal => <article key={portal.title} className="rounded-xl border border-slate-700 bg-slate-950 p-5">
              <h3 className="text-lg font-semibold">{portal.title}</h3>
              <p className="mt-1 min-h-10 text-sm text-slate-400">{portal.description}</p>
              <div className="mt-4 flex flex-wrap gap-2">{portal.actions.map(action => <Link key={action.href} href={action.href} className="rounded-lg border border-slate-600 px-3 py-2 text-sm font-semibold hover:bg-slate-900">{action.label}</Link>)}</div>
              {portal.note && <p className="mt-2 text-xs text-slate-500">{portal.note}</p>}
              <details className="mt-4 border-t border-slate-800 pt-3">
                <summary className="cursor-pointer text-sm font-semibold text-blue-300 hover:text-blue-200">Open all {portal.title.toLowerCase()} pages ({portal.pages.length})</summary>
                <nav aria-label={`${portal.title} pages`} className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2">{portal.pages.map(([label, href]) => <Link key={href} href={href} className="text-sm text-slate-300 underline decoration-slate-700 underline-offset-2 hover:text-white">{label}</Link>)}</nav>
              </details>
            </article>)}
          </div>
        </div>
      </section>

      {/* Platform Highlights */}
      <section className="mx-auto grid max-w-5xl grid-cols-2 gap-4 px-6 pb-24 md:grid-cols-4">
        {[
          { label: "Management", icon: CalendarDays },
          { label: "Volunteers", icon: Users },
          { label: "Monitoring", icon: Activity },
          { label: "Security", icon: ShieldCheck },
        ].map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6"
            >
              <Icon size={28} className="text-blue-400" />
              <span className="text-sm font-medium text-slate-300">
                {item.label}
              </span>
            </div>
          );
        })}
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="scroll-mt-24 border-y border-slate-800 bg-slate-900/40 px-6 py-24"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
              Platform Features
            </p>

            <h2 className="text-3xl font-bold md:text-4xl">
              Everything in one platform
            </h2>

            <p className="mt-4 text-slate-400">
              Integrated tools for efficient and safer event operations.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-7 transition hover:-translate-y-1 hover:border-blue-500/50"
                >
                  <div className="mb-5 inline-flex rounded-xl bg-blue-500/10 p-3 text-blue-400">
                    <Icon size={28} />
                  </div>

                  <h3 className="mb-3 text-xl font-semibold">
                    {feature.title}
                  </h3>

                  <p className="text-sm leading-7 text-slate-400">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* About Section */}
      <section
        id="about"
        className="scroll-mt-24 mx-auto max-w-7xl px-6 py-24"
      >
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-blue-400">
              About EventCrowd
            </p>

            <h2 className="text-3xl font-bold leading-tight md:text-4xl">
              Smarter event operations through technology.
            </h2>

            <p className="mt-6 leading-8 text-slate-400">
              EventCrowd integrates relational and NoSQL database
              technologies to manage structured event records and
              flexible operational data.
            </p>
          </div>

          <div className="space-y-5">
            <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <MapPin className="shrink-0 text-blue-400" />

              <div>
                <h3 className="font-semibold">
                  Centralized Operations
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Manage events, venues, attendees and teams together.
                </p>
              </div>
            </div>

            <div className="flex gap-4 rounded-xl border border-slate-800 bg-slate-900 p-5">
              <ShieldCheck className="shrink-0 text-blue-400" />

              <div>
                <h3 className="font-semibold">
                  Improved Safety
                </h3>

                <p className="mt-2 text-sm text-slate-400">
                  Monitor crowd conditions and coordinate incident response.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <ContactSection />

      {/* Footer */}
      <footer className="border-t border-slate-800 px-6 py-8 text-center">
        <h3 className="text-xl font-bold">
          Event<span className="text-blue-400">Crowd</span>
        </h3>

        <p className="mt-3 text-sm text-slate-500">
          Intelligent Event and Crowd Management System
        </p>

        <div className="mt-4 flex justify-center gap-6 text-sm text-slate-400">
          <Link href="#features" className="hover:text-blue-400">
            Features
          </Link>

          <Link href="#about" className="hover:text-blue-400">
            About
          </Link>

          <Link href="#contact" className="hover:text-blue-400">
            Contact
          </Link>
        </div>

        <nav aria-label="Portal sign in" className="mt-5 flex flex-wrap justify-center gap-5 text-xs text-slate-500">
          <Link href="/admin/login" className="hover:text-blue-400">Admin login</Link>
          <Link href="/volunteer/login" className="hover:text-blue-400">Volunteer login</Link>
          <Link href="/staff/login" className="hover:text-blue-400">Security staff login</Link>
        </nav>

        <p className="mt-5 text-xs text-slate-600">
          © 2026 EventCrowd. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
