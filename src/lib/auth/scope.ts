import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth/permissions";

const ADMIN_ROLE_SLUGS = new Set([
  "super_admin",
  "account_manager",
  "viewer",
  "team_leader",
  "finance_manager",
  "message_tracker",
]);

export function hasAdminDashboardAccess(permissions: string[], roleSlugs: string[]): boolean {
  if (permissions.some((p) => p.includes("super"))) return true;
  if (roleSlugs.some((slug) => ADMIN_ROLE_SLUGS.has(slug) && slug !== "member")) return true;
  return (
    permissions.includes("team_members.edit") ||
    permissions.includes("users.view") ||
    permissions.includes("accounts.import") ||
    permissions.includes("reports.view")
  );
}

export async function getUserScope() {
  const user = await getCurrentUser();
  if (!user) return null;

  const supabase = await createClient();
  const [{ data: teamMember }, { data: userRoles }, admin] = await Promise.all([
    supabase
      .from("team_members")
      .select("id, full_name, preferred_name, sponsor_id, status")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("user_roles").select("role:roles(slug)").eq("user_id", user.id),
    isSuperAdmin(),
  ]);

  const roleSlugs =
    (userRoles as { role: { slug: string } | null }[] | null)
      ?.map((r) => r.role?.slug)
      .filter((slug): slug is string => !!slug) ?? [];

  const isAdmin = admin || hasAdminDashboardAccess(user.permissions, roleSlugs);
  const isScopedMember = !!teamMember && !isAdmin;

  return {
    user,
    teamMember,
    roleSlugs,
    permissions: user.permissions,
    isAdmin,
    isScopedMember,
  };
}
