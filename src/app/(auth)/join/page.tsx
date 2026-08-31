"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Loader2, Users, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { normalizeMemberName } from "@/data/forecast-members";
import { formatAuthError } from "@/lib/auth/email-errors";
import type { MemberStatus } from "@/types/database";

interface TeamMemberOption {
  id: string;
  full_name: string;
  preferred_name: string | null;
}

export default function JoinPage() {
  const [members, setMembers] = useState<TeamMemberOption[]>([]);
  const [sponsors, setSponsors] = useState<TeamMemberOption[]>([]);
  const [title, setTitle] = useState<"Mr" | "Miss">("Mr");
  const [firstName, setFirstName] = useState("");
  const [teamMemberId, setTeamMemberId] = useState("");
  const [sponsorId, setSponsorId] = useState("");
  const [status, setStatus] = useState<MemberStatus>("active");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState("");
  const [canSignInNow, setCanSignInNow] = useState(false);

  useEffect(() => {
    fetch("/api/join/register")
      .then((r) => r.json())
      .then((d) => {
        setMembers(d.members ?? []);
        setSponsors(d.sponsors ?? []);
      });
  }, []);

  const selectedMember = members.find((m) => m.id === teamMemberId);

  useEffect(() => {
    if (!selectedMember) return;
    const parts = selectedMember.full_name.trim().split(/\s+/);
    const titlePart = parts[0]?.toLowerCase();
    if (titlePart === "mr" || titlePart === "miss") {
      setTitle(titlePart === "miss" ? "Miss" : "Mr");
      setFirstName(parts.slice(1).join(" "));
    } else {
      setFirstName(selectedMember.preferred_name ?? parts.slice(1).join(" ") ?? parts[0] ?? "");
    }
  }, [selectedMember]);

  const builtName = firstName.trim() ? normalizeMemberName(`${title} ${firstName.trim()}`) : "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/join/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        title,
        firstName: firstName.trim(),
        teamMemberId,
        sponsorId,
        status,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      toast.error(formatAuthError(data.error ?? "Registration failed"), { duration: 10000 });
      setLoading(false);
      return;
    }

    setConfirmationEmail(email);
    setCanSignInNow(Boolean(data.skipEmailConfirmation));
    setDone(true);
    toast.success(data.message);
    setLoading(false);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-neutral-50">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            {canSignInNow ? (
              <>
                <CheckCircle2 className="h-16 w-16 text-brand-green mx-auto mb-4" />
                <h2 className="text-xl font-bold">You&apos;re all set!</h2>
                <p className="text-neutral-500 mt-2">
                  Your account for <strong>{confirmationEmail}</strong> is active.
                  Sign in now with the password you chose — no email confirmation needed.
                </p>
                <Button asChild className="mt-6 w-full">
                  <Link href={`/login?email=${encodeURIComponent(confirmationEmail)}`}>
                    Sign In Now
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Mail className="h-16 w-16 text-brand-green mx-auto mb-4" />
                <h2 className="text-xl font-bold">Check your email</h2>
                <p className="text-neutral-500 mt-2">
                  We sent a confirmation link to <strong>{confirmationEmail}</strong>.
                  Click the link to activate your account, then sign in.
                </p>
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mt-4">
                  Only click register once. Re-registering sends more emails and can hit Supabase&apos;s
                  2-emails-per-hour limit.
                </p>
                <p className="text-sm text-neutral-400 mt-4">
                  After you confirm your email, you&apos;ll go straight to your profile with all accounts and messages synced.
                </p>
                <Button asChild className="mt-6 w-full">
                  <Link
                    href={`/login?check_email=1&email=${encodeURIComponent(confirmationEmail)}`}
                  >
                    Go to Sign In
                  </Link>
                </Button>
              </>
            )}
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
            Complete the form below. You must confirm your email before you can sign in.
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
                <option value="">Select your profile...</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.full_name}</option>
                ))}
              </Select>
              {members.length === 0 && (
                <p className="text-xs text-amber-600">Loading team profiles… If this stays empty, refresh the page.</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Select id="title" value={title} onChange={(e) => setTitle(e.target.value as "Mr" | "Miss")} required>
                  <option value="Mr">Mr</option>
                  <option value="Miss">Miss</option>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Femi"
                  required
                />
              </div>
            </div>

            {builtName && selectedMember && (
              <p className="text-xs text-neutral-500 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />
                Registering as: <strong>{builtName}</strong>
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="sponsorId">Your Sponsor *</Label>
              <Select
                id="sponsorId"
                value={sponsorId}
                onChange={(e) => setSponsorId(e.target.value)}
                required
              >
                <option value="">Select your sponsor...</option>
                {sponsors
                  .filter((s) => s.id !== teamMemberId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.full_name}</option>
                  ))}
              </Select>
              <p className="text-xs text-neutral-400">Pick the person who brought you to the team — they do not need to be registered yet.</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Your Status *</Label>
              <Select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as MemberStatus)}
                required
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="on_leave">On Leave</option>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Create Password *</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input id="confirmPassword" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} minLength={8} required />
            </div>

            <Button type="submit" className="w-full" disabled={loading || !teamMemberId || !sponsorId}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Register & Confirm Email"}
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
