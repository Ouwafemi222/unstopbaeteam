import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <AppShell permissions={user.permissions} profile={user.profile}>
      {children}
    </AppShell>
  );
}
