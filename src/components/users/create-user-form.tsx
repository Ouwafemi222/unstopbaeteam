"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus, Mail, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { Role } from "@/types/database";

interface CreateUserFormProps {
  roles: Role[];
}

export function CreateUserForm({ roles }: CreateUserFormProps) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const router = useRouter();

  const assignableRoles = roles.filter((r) => r.slug !== "super_admin");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/users/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, fullName, password, roleId }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Failed to create user");
      setLoading(false);
      return;
    }

    toast.success(data.message ?? "User created successfully");
    setEmail("");
    setFullName("");
    setPassword("");
    setRoleId("");
    router.refresh();
    setLoading(false);
  }

  return (
    <Card className="border-brand-orange/30 bg-gradient-to-br from-brand-orange-light/30 to-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5 text-brand-orange" />
          Create New User
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-neutral-500 mb-4">
          Add your account manager or team member here. Enter their email, set a password, and assign a role — no need to open Supabase.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Miss Sarah"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="sarah@company.com"
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Temporary Password *</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="pl-10"
                  minLength={8}
                  required
                />
              </div>
              <p className="text-xs text-neutral-400">Share this password with her securely. She can change it later.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="roleId">Assign Role *</Label>
              <Select id="roleId" value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
                <option value="">Select role...</option>
                {assignableRoles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </Select>
              <p className="text-xs text-neutral-400">For data entry staff, choose <strong>Account Manager</strong>.</p>
            </div>
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User & Assign Role"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
