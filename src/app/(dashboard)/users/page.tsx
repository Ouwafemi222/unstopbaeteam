import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, isSuperAdmin } from "@/lib/auth/permissions";
import { Card, CardContent } from "@/components/ui/card";
import { UsersRoleManager } from "@/components/users/users-role-manager";
import { CreateUserForm } from "@/components/users/create-user-form";

export default async function UsersPage() {
  const supabase = await createClient();
  const user = await getCurrentUser();
  const admin = user ? await isSuperAdmin() : false;
  const canManage = user ? admin || user.permissions.includes("users.manage_roles") : false;

  const [{ data: profiles }, { data: roles }, { data: userRoles }] = await Promise.all([
    supabase.from("profiles").select("*").order("full_name"),
    supabase.from("roles").select("*").order("name"),
    supabase.from("user_roles").select("*, role:roles(name, slug)"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Users & Roles</h1>
        <p className="text-neutral-500 mt-1">
          {admin
            ? "Create login accounts and assign roles — all from here, no Supabase needed"
            : canManage
              ? "Assign roles to users who will input records"
              : "View system users and their roles"}
        </p>
      </div>

      {!canManage && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4 text-sm text-amber-800">
            Only Super Admin can manage users. Contact your administrator.
          </CardContent>
        </Card>
      )}

      {admin && <CreateUserForm roles={roles ?? []} />}

      <UsersRoleManager
        profiles={profiles ?? []}
        roles={roles ?? []}
        userRoles={(userRoles ?? []) as { id: string; user_id: string; role_id: string; role: { name: string; slug: string } | null }[]}
        canManage={canManage}
      />

      <div>
        <h2 className="text-lg font-semibold text-neutral-900 mb-4">Role Descriptions</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {roles?.map((role) => (
            <Card key={role.id}>
              <CardContent className="p-4">
                <h3 className="font-medium">{role.name}</h3>
                <p className="text-sm text-neutral-500 mt-1">{role.description}</p>
                {role.slug === "account_manager" && (
                  <p className="text-xs text-brand-green mt-2 font-medium">
                    Can add & edit Fiverr accounts, messages, and team members
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
