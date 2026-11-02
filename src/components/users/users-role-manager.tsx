"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Shield, UserPlus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

interface LinkedMember {
  id: string;
  full_name: string;
  email: string | null;
  user_id: string | null;
  role_in_team: string | null;
}

const ROLE_GUIDE: Record<string, string> = {
  member: "Their own dashboard. They record their accounts, messages, orders, and prospects.",
  account_manager: "Can add and edit team records: accounts, messages, and members.",
  viewer: "Can look at team records. Cannot change them.",
  team_leader: "Leads a group and can see the people they sponsor.",
  finance_manager: "Works on money, fines, and debts.",
  message_tracker: "Focuses on messages the team receives.",
  super_admin: "Full control, including incentives, users, and every record.",
};

interface UsersRoleManagerProps {
  profiles: Profile[];
  roles: Role[];
  userRoles: UserRoleRow[];
  teamMembers: LinkedMember[];
  canManage: boolean;
}

export function UsersRoleManager({ profiles, roles, userRoles, teamMembers, canManage }: UsersRoleManagerProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const router = useRouter();
  const memberByUser = useMemo(() => {
    const map = new Map<string, LinkedMember>();
    for (const member of teamMembers) {
      if (member.user_id) map.set(member.user_id, member);
    }
    return map;
  }, [teamMembers]);

  async function assignRole() {
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Select a user and a role");
      return;
    }
    setLoading(true);
    await setUserRole(selectedUserId, selectedRoleId);
    setSelectedRoleId("");
    setLoading(false);
  }

  async function setUserRole(userId: string, roleId: string) {
    if (!roleId) return;
    const existing = userRoles.filter((row) => row.user_id === userId);
    if (existing.some((row) => row.role_id === roleId) && existing.length === 1) return;

    setBusyUserId(userId);
    const assign = await fetch("/api/users/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, roleId, action: "assign" }),
    });
    const assigned = await assign.json();
    if (!assign.ok) {
      toast.error(assigned.error ?? "Failed to assign role");
      setBusyUserId(null);
      return;
    }

    for (const row of existing) {
      if (row.role_id === roleId || row.role?.slug === "super_admin") continue;
      const remove = await fetch("/api/users/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, roleId: row.role_id, action: "remove" }),
      });
      if (!remove.ok) {
        const removed = await remove.json().catch(() => ({}));
        toast.error(removed.error ?? "The new role was added, but an old role stayed on");
        setBusyUserId(null);
        router.refresh();
        return;
      }
    }

    toast.success("Role updated");
    setBusyUserId(null);
    router.refresh();
  }

  const assignableRoles = roles.filter((r) => r.slug !== "super_admin" || canManage);
  const selectedRole = roles.find((role) => role.id === selectedRoleId);
  const filteredProfiles = profiles.filter((profile) => {
    const member = memberByUser.get(profile.id);
    const haystack = [profile.full_name, profile.preferred_name, member?.full_name, member?.email, member?.role_in_team]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });

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
              Pick the person, then the role that matches the work they do. A new role replaces their old one. Super Admin stays in place.
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
            {selectedRole && (
              <p className="text-sm text-neutral-600">
                {ROLE_GUIDE[selectedRole.slug] ?? selectedRole.description ?? "This role controls what they can open."}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name, team profile, or email"
        aria-label="Search users"
      />

      <div className="responsive-table bg-white rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-neutral-500 bg-neutral-50">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Team profile</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Role</th>
              {canManage && <th className="p-3 font-medium">Set role</th>}
            </tr>
          </thead>
          <tbody>
            {filteredProfiles.map((profile) => {
              const userRoleList = userRoles.filter((ur) => ur.user_id === profile.id);
              const member = memberByUser.get(profile.id);
              const current = userRoleList.find((row) => row.role?.slug !== "super_admin") ?? userRoleList[0];
              const guide = current?.role?.slug ? ROLE_GUIDE[current.role.slug] : null;
              return (
                <tr key={profile.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3">
                    <p className="font-medium">{profile.full_name}</p>
                    {profile.preferred_name && (
                      <p className="text-xs text-neutral-400">{profile.preferred_name}</p>
                    )}
                  </td>
                  <td className="p-3">
                    {member ? (
                      <>
                        <p className="font-medium text-neutral-800">{member.full_name}</p>
                        <p className="text-xs text-neutral-500">{member.email || member.role_in_team || "Linked"}</p>
                      </>
                    ) : (
                      <span className="text-xs text-neutral-400">No team profile linked</span>
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
                        <span className="text-neutral-400 text-xs">No role</span>
                      ) : (
                        userRoleList.map((ur) => (
                          <Badge key={ur.id} variant="info" className="gap-1">
                            <Shield className="h-3 w-3" />
                            {ur.role?.name}
                          </Badge>
                        ))
                      )}
                    </div>
                    {guide && <p className="mt-1 max-w-xs text-xs text-neutral-500">{guide}</p>}
                  </td>
                  {canManage && (
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <Select
                          value={current?.role_id ?? ""}
                          disabled={busyUserId === profile.id || loading}
                          onChange={(event) => setUserRole(profile.id, event.target.value)}
                          aria-label={`Set role for ${profile.full_name}`}
                        >
                          <option value="">Choose role...</option>
                          {assignableRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </Select>
                        {busyUserId === profile.id && <Loader2 className="h-4 w-4 animate-spin text-[#7b1e3a]" />}
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
