import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/permissions";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const { data: teamMember } = await supabase
    .from("team_members")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return (
    <AppShell permissions={user.permissions} profile={user.profile} teamMemberId={teamMember?.id ?? null}>
      {children}
    </AppShell>
  );
}
