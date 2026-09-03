import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { AppShell } from "@/components/layout/app-shell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  const displayName =
    scope.teamMember?.preferred_name ||
    scope.teamMember?.full_name ||
    scope.user.profile?.preferred_name ||
    scope.user.profile?.full_name ||
    "User";

  return (
    <AppShell
      permissions={scope.permissions}
      profile={scope.user.profile}
      teamMemberId={scope.teamMember?.id ?? null}
      isScopedMember={scope.isScopedMember}
      displayName={displayName}
      isSuperAdmin={scope.roleSlugs.includes("super_admin")}
    >
      {children}
    </AppShell>
  );
}
