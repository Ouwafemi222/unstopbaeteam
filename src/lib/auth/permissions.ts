import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getUserPermissions = cache(async (): Promise<string[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_user_permissions");
  if (error) {
    console.error("get_user_permissions error:", error.message);
    return [];
  }
  return data ?? [];
});

export async function hasPermission(permission: string): Promise<boolean> {
  const permissions = await getUserPermissions();
  return permissions.includes(permission);
}

export const isSuperAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("is_super_admin");
  return data ?? false;
});

/** Deduped per React request — layout + page share one result. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: roles }, permissions] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_roles").select("*, role:roles(*)").eq("user_id", user.id),
    getUserPermissions(),
  ]);

  return {
    ...user,
    profile: profile ?? null,
    roles:
      (roles as { role: { name: string; slug: string } | null }[] | null)
        ?.map((r) => r.role)
        .filter(Boolean) ?? [],
    permissions,
  };
});

export function can(permissions: string[], required: string): boolean {
  return permissions.includes(required) || permissions.some((p) => p.startsWith("super"));
}
