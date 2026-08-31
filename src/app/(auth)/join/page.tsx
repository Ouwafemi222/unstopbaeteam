"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

interface AvailableMember {
  id: string;
  full_name: string;
  preferred_name: string | null;
}

export default function JoinPage() {
  const [members, setMembers] = useState<AvailableMember[]>([]);
  const [teamMemberId, setTeamMemberId] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetch("/api/join/register")
      .then((r) => r.json())
      .then((d) => setMembers(d.members ?? []));
  }, []);

  const selectedMember = members.find((m) => m.id === teamMemberId);

  useEffect(() => {
    if (selectedMember) setFullName(selectedMember.full_name);
  }, [selectedMember]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/join/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, fullName, teamMemberId }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(data.error ?? "Registration failed");
      setLoading(false);
      return;
    }

    toast.success(data.message);
    setDone(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) {
      window.location.href = `/team-members/${data.teamMemberId}`;
    } else {
      router.push("/login");
    }
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-neutral-50">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <CheckCircle2 className="h-16 w-16 text-brand-green mx-auto mb-4" />
            <h2 className="text-xl font-bold">Registration Complete!</h2>
            <p className="text-neutral-500 mt-2">Your forecast accounts are synced to your profile.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-br from-brand-green-light/30 to-brand-orange-light/30">
      <Card className="max-w-lg w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-6 w-6 text-brand-green" />
            Join UNSTOPPABLE TEAM
          </CardTitle>
          <p className="text-sm text-neutral-500">
            Select your name exactly as it appears on the team list. Your Fiverr accounts will sync automatically.
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="teamMemberId">Your Name on the Team List *</Label>
              <Select
                id="teamMemberId"
                value={teamMemberId}
                onChange={(e) => setTeamMemberId(e.target.value)}
                required
              >
                <option value="">Select your name...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </Select>
              {members.length === 0 && (
                <p className="text-xs text-amber-600">No profiles available yet. Ask admin to import forecast data first.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Confirm Full Name *</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Mr Femi"
                required
                readOnly={!!selectedMember}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Your Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>
            <Button type="submit" className="w-full" disabled={loading || !teamMemberId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register & Sync My Accounts"}
            </Button>
            <p className="text-center text-sm text-neutral-400">
              Already registered? <Link href="/login" className="text-brand-green hover:underline">Sign in</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
