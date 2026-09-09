"use client";

import { useEffect, useState } from "react";
import { Eye, KeyRound, Loader2, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function BlurReveal({
  label,
  value,
  emptyText = "Not set",
}: {
  label: string;
  value: string | null;
  emptyText?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const show = revealed && !!value;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-neutral-500">{label}</Label>
        <button
          type="button"
          className="text-[11px] font-medium text-brand-green hover:underline sm:hidden"
          onClick={() => setRevealed((v) => !v)}
          disabled={!value}
        >
          {show ? "Hide" : "Tap to reveal"}
        </button>
      </div>
      <div
        className={cn(
          "group relative rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-sm break-all",
          value ? "cursor-help" : "text-neutral-400"
        )}
        onMouseEnter={() => setRevealed(true)}
        onMouseLeave={() => setRevealed(false)}
        title={value ? "Hover to reveal" : undefined}
      >
        <span
          className={cn(
            "block transition-[filter] duration-200",
            value && !show ? "blur-md select-none" : "blur-none select-text"
          )}
        >
          {value || emptyText}
        </span>
        {value && !show && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[11px] font-sans font-medium text-neutral-500 opacity-90 sm:opacity-100">
            <Eye className="h-3.5 w-3.5 mr-1" />
            Hover to reveal
          </span>
        )}
      </div>
    </div>
  );
}

interface MemberAccessPanelProps {
  teamMemberId: string;
  memberName: string;
}

export function MemberAccessPanel({ teamMemberId, memberName }: MemberAccessPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);
  const [emailConfirmed, setEmailConfirmed] = useState(false);
  const [note, setNote] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#member-login-details") {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/member-access/${teamMemberId}`);
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          toast.error(data.error ?? "Could not load login details");
          return;
        }
        setEmail(data.email);
        setTempPassword(data.tempPassword);
        setRegistered(Boolean(data.registered));
        setEmailConfirmed(Boolean(data.emailConfirmed));
        setNote(data.note ?? "");
      } catch {
        if (!cancelled) toast.error("Network error loading login details");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, teamMemberId]);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/member-access/${teamMemberId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to set password");
        return;
      }
      setTempPassword(data.tempPassword);
      setEmail(data.email ?? email);
      setNewPassword("");
      toast.success(data.message ?? "Temporary password saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card id="member-login-details" className="border-amber-200/80 bg-gradient-to-br from-amber-50/40 to-white scroll-mt-24">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-700" />
          Member login details
        </CardTitle>
        <p className="text-sm text-neutral-500">
          Super Admin only — help {memberName} sign in when reset email fails.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!open ? (
          <Button type="button" onClick={() => setOpen(true)} className="w-full sm:w-auto">
            <Eye className="h-4 w-4" />
            View member details
          </Button>
        ) : loading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading secure details…
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {note ||
                "Original passwords cannot be recovered. Set a temporary password below to help them log in."}
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              <BlurReveal label="Email" value={email} emptyText="No email on file" />
              <BlurReveal
                label="Temporary password (last set by admin)"
                value={tempPassword}
                emptyText="No temporary password saved yet"
              />
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-neutral-500">
              <span
                className={cn(
                  "rounded-full px-2.5 py-1 border",
                  registered ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-neutral-200"
                )}
              >
                {registered ? "Has login account" : "Not registered yet"}
              </span>
              {registered && (
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 border",
                    emailConfirmed
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  )}
                >
                  {emailConfirmed ? "Email confirmed" : "Email not confirmed"}
                </span>
              )}
            </div>

            {registered ? (
              <form onSubmit={handleSetPassword} className="space-y-3 rounded-xl border border-neutral-200 p-4 bg-white">
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-800">
                  <KeyRound className="h-4 w-4 text-brand-green" />
                  Set temporary password
                </div>
                <div className="space-y-2">
                  <Label htmlFor="temp-pass">New temporary password</Label>
                  <PasswordInput
                    id="temp-pass"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    minLength={8}
                    required
                    placeholder="At least 8 characters"
                  />
                </div>
                <Button type="submit" disabled={saving || newPassword.length < 8}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & update login"}
                </Button>
              </form>
            ) : (
              <p className="text-sm text-neutral-500">
                This person has not created an account yet, so there is no password to manage.
              </p>
            )}

            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Hide details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
