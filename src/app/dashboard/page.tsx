import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth/page-guard";

export default async function DashboardPage() {
  await requirePageRole("ADMIN");
  redirect("/admin/dashboard");
}
