"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Profile, Role } from "@/types/database";

interface UserRoleRow {
  id: string;
  user_id: string;
  role_id: string;
  role: { name: string; slug: string } | null;
}

interface UsersRoleManagerProps {
  profiles: Profile[];
  roles: Role[];
  userRoles: UserRoleRow[];
  canManage: boolean;
}

export function UsersRoleManager({ profiles, roles, userRoles, canManage }: UsersRoleManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function assignRole() {
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Select a user and a role");
      return;
    }
    setLoading(true);
    const res = await fetch("/api/users/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId, roleId: selectedRoleId, action: "assign" }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Failed to assign role");
    else {
      toast.success("Role assigned successfully");
      setSelectedRoleId("");
      router.refresh();
    }
    setLoading(false);
  }

  async function removeRole(userId: string, roleId: string) {
    setLoading(true);
    const res = await fetch("/api/users/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleId, action: "remove" }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Failed to remove role");
    else {
      toast.success("Role removed");
      router.refresh();
    }
    setLoading(false);
  }

  const assignableRoles = roles.filter((r) => r.slug !== "super_admin" || canManage);

  return (
    <div className="space-y-6">
      {canManage && (
        <Card className="border-brand-green/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-brand-green" />
              Assign Role to User
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-neutral-500">
              Select a login profile (e.g. your account manager) and assign her the <strong>Account Manager</strong> role so she can add and edit records.
            </p>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">User Profile</label>
                <Select value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                  <option value="">Choose user...</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.full_name} {p.preferred_name ? `(${p.preferred_name})` : ""}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-700">Role</label>
                <Select value={selectedRoleId} onChange={(e) => setSelectedRoleId(e.target.value)}>
                  <option value="">Choose role...</option>
                  {assignableRoles.map((r) => (
                    <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={assignRole} disabled={loading} className="w-full">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assign Role"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="responsive-table bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500 bg-neutral-50">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Roles</th>
              {canManage && <th className="p-3 font-medium">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const userRoleList = userRoles.filter((ur) => ur.user_id === profile.id);
              return (
                <tr key={profile.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3">
                    <p className="font-medium">{profile.full_name}</p>
                    {profile.preferred_name && (
                      <p className="text-xs text-neutral-400">{profile.preferred_name}</p>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant={profile.is_active ? "success" : "danger"}>
                      {profile.is_active ? "Active" : "Disabled"}
                    </Badge>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 flex-wrap">
                      {userRoleList.length === 0 ? (
                        <span className="text-neutral-400 text-xs">No roles</span>
                      ) : (
                        userRoleList.map((ur) => (
                          <Badge key={ur.id} variant="info" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {ur.role?.name}
                          </Badge>
                        ))
                      )}
                    </div>
                  </td>
                  {canManage && (
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {userRoleList.map((ur) => (
                          <Button
                            key={ur.id}
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs h-7"
                            disabled={loading}
                            onClick={() => removeRole(profile.id, ur.role_id)}
                          >
                            Remove {ur.role?.name}
                          </Button>
                        ))}
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
