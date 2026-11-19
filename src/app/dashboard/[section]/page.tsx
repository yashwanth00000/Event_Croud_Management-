import { notFound, redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth/page-guard";

const sectionRoutes: Record<string, string> = {
  events: "/admin/events",
  venues: "/admin/venues",
  registrations: "/admin/registrations",
  scanner: "/admin/gates",
  staff: "/admin/assignments",
  crowd: "/admin/crowd",
  incidents: "/admin/incidents",
  reports: "/admin/reports",
  settings: "/admin/settings",
};

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  await requirePageRole("ADMIN");
  const { section } = await params;
  const destination = sectionRoutes[section];
  if (!destination) notFound();
  redirect(destination);
}
