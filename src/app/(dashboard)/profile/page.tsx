"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertTriangle,
  Camera,
  KeyRound,
  Loader2,
  Mail,
  ShieldCheck,
  User2,
  Volume2,
} from "lucide-react";
import Image from "next/image";
import { SuperAdminStar } from "@/components/shared/super-admin-star";
import { formatDate } from "@/lib/utils";
import {
  DEFAULT_NOTIFICATION_SOUND,
  NOTIFICATION_SOUNDS,
  getStoredNotificationSound,
  isNotificationSoundId,
  playMessageNotificationSound,
  setStoredNotificationSound,
  type NotificationSoundId,
} from "@/lib/audio/message-notification-sound";
import type { Profile } from "@/types/database";

const BUCKET = "attachments";

function passwordResetRedirectUrl() {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${appUrl}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [selectedSound, setSelectedSound] = useState<NotificationSoundId>(DEFAULT_NOTIFICATION_SOUND);
  const [savingSound, setSavingSound] = useState(false);
  const [deactReason, setDeactReason] = useState("");
  const [confirmDeact, setConfirmDeact] = useState(false);
  const [submittingDeact, setSubmittingDeact] = useState(false);
  const [pendingDeactivation, setPendingDeactivation] = useState<{
    id: string;
    requested_at: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setEmail(user.email ?? null);
        const [{ data }, { data: roles }, { data: member }] = await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).single(),
          supabase.from("user_roles").select("role:roles(slug)").eq("user_id", user.id),
          supabase.from("team_members").select("id").eq("user_id", user.id).maybeSingle(),
        ]);
        setProfile(data);
        setIsSuperAdmin(
          (roles as { role: { slug: string } | null }[] | null)?.some(
            (r) => r.role?.slug === "super_admin"
          ) ?? false
        );
        const fromProfile = data?.notification_sound_id;
        if (isNotificationSoundId(fromProfile)) {
          setSelectedSound(fromProfile);
          setStoredNotificationSound(fromProfile);
        } else {
          setSelectedSound(getStoredNotificationSound());
        }
        if (data?.avatar_url) {
          if (data.avatar_url.startsWith("http")) {
            setAvatarUrl(data.avatar_url);
          } else {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(data.avatar_url, 3600);
            setAvatarUrl(signed?.signedUrl ?? null);
          }
        }
        if (member?.id) {
          const { data: pending } = await supabase
            .from("account_deactivation_requests")
            .select("id, requested_at")
            .eq("team_member_id", member.id)
            .eq("status", "pending")
            .maybeSingle();
          if (pending) setPendingDeactivation(pending);
        }
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;

    const ext = file.name.split(".").pop()?.replace(/[^a-z0-9]/gi, "").toLowerCase() || "jpg";
    const storagePath = `avatars/${profile.id}/avatar.${ext}`;

    setAvatarUploading(true);
    try {
      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, { upsert: true, contentType: file.type || "image/jpeg" });
      if (uploadErr) throw uploadErr;

      const { error: updateErr } = await supabase
        .from("profiles")
        .update({ avatar_url: storagePath })
        .eq("id", profile.id);
      if (updateErr) throw updateErr;

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(storagePath, 3600);
      setAvatarUrl(signed?.signedUrl ?? null);
      setProfile((p) => (p ? { ...p, avatar_url: storagePath } : p));
      toast.success("Profile picture updated!");
    } catch (err: unknown) {
      toast.error((err as Error).message ?? "Upload failed");
    } finally {
      setAvatarUploading(false);
    }
  }

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const form = new FormData(e.currentTarget);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.get("full_name") as string,
        preferred_name: (form.get("preferred_name") as string) || null,
        phone: (form.get("phone") as string) || null,
      })
      .eq("id", profile!.id);

    if (error) toast.error(error.message);
    else toast.success("Profile updated");
    setSaving(false);
  }

  async function handleSaveSound() {
    if (!profile) return;
    setSavingSound(true);
    setStoredNotificationSound(selectedSound);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_sound_id: selectedSound })
      .eq("id", profile.id);
    if (error) toast.error(error.message);
    else {
      setProfile((p) => (p ? { ...p, notification_sound_id: selectedSound } : p));
      toast.success("Notification sound saved");
      playMessageNotificationSound(selectedSound);
    }
    setSavingSound(false);
  }

  async function handleRequestDeactivation() {
    setSubmittingDeact(true);
    try {
      const res = await fetch("/api/account-deactivation/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: deactReason.trim() || null }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "Could not submit request");
        return;
      }
      setPendingDeactivation({
        id: data.requestId,
        requested_at: new Date().toISOString(),
      });
      setConfirmDeact(false);
      toast.success("Request sent — an admin will review it. Nothing was deactivated.");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmittingDeact(false);
    }
  }

  async function handleSendPasswordEmail() {
    if (!email) {
      toast.error("No email on this account");
      return;
    }

    setSendingReset(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectUrl(),
    });

    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
      toast.success("Password change email sent — check your inbox");
    }
    setSendingReset(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
        <p className="text-neutral-500 mt-1">Update your personal info, picture, and password.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile Picture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-brand-green/10 border-4 border-white shadow-md flex items-center justify-center">
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={profile?.full_name ?? "Avatar"}
                    width={96}
                    height={96}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-3xl font-bold text-brand-green">{initials}</span>
                )}
              </div>
              {isSuperAdmin && (
                <span className="absolute -top-1 -left-1">
                  <SuperAdminStar size="lg" />
                </span>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarUploading}
                className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-brand-green text-white flex items-center justify-center shadow-lg hover:bg-brand-green-dark transition-colors disabled:opacity-60"
                title="Change picture"
              >
                {avatarUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="font-semibold text-neutral-900 text-lg">{profile?.full_name}</p>
              {isSuperAdmin && (
                <p className="mt-1 inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-xs font-bold text-amber-700">
                  <SuperAdminStar size="sm" />
                  SA · Super Admin
                </p>
              )}
              <p className="text-sm text-neutral-500 mt-1">
                {profile?.preferred_name
                  ? `Goes by "${profile.preferred_name}"`
                  : "No preferred name set"}
              </p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 text-sm text-brand-green hover:underline font-medium flex items-center gap-1"
              >
                <User2 className="h-4 w-4" />
                {avatarUrl ? "Change picture" : "Upload profile picture"}
              </button>
              <p className="text-xs text-neutral-400 mt-1">JPG, PNG or WebP · max 5MB</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name</Label>
              <Input id="full_name" name="full_name" defaultValue={profile?.full_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="preferred_name">Preferred Name</Label>
              <Input
                id="preferred_name"
                name="preferred_name"
                defaultValue={profile?.preferred_name ?? ""}
                placeholder="What people call you"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                defaultValue={profile?.phone ?? ""}
                placeholder="+234..."
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving…
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Volume2 className="h-5 w-5 text-[#7b1e3a]" />
            Sound notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            Pick the sound you hear when someone on the team receives a message. Use Test to preview
            before saving.
          </p>
          <div className="space-y-2">
            {NOTIFICATION_SOUNDS.map((sound) => (
              <label
                key={sound.id}
                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                  selectedSound === sound.id
                    ? "border-[#7b1e3a] bg-[#7b1e3a]/5"
                    : "border-neutral-200 hover:border-[#7b1e3a]/35"
                }`}
              >
                <span className="flex items-start gap-3 min-w-0">
                  <input
                    type="radio"
                    name="notification_sound"
                    value={sound.id}
                    checked={selectedSound === sound.id}
                    onChange={() => setSelectedSound(sound.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-neutral-900">{sound.label}</span>
                    <span className="block text-xs text-neutral-500">{sound.description}</span>
                  </span>
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="shrink-0 gap-1.5"
                  onClick={(e) => {
                    e.preventDefault();
                    playMessageNotificationSound(sound.id);
                  }}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  Test
                </Button>
              </label>
            ))}
          </div>
          <Button type="button" disabled={savingSound} onClick={handleSaveSound} className="gap-2">
            {savingSound ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {savingSound ? "Saving…" : "Save sound preference"}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-brand-orange/25 bg-gradient-to-br from-white to-brand-orange-light/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-brand-orange-dark" />
            Password &amp; security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-600">
            We email a secure link to your account address. Open it, choose a new password, and
            you&apos;ll be sent back into the website automatically.
          </p>

          <div className="space-y-2">
            <Label htmlFor="account_email">Account email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
              <Input
                id="account_email"
                value={email ?? ""}
                readOnly
                className="pl-9 bg-neutral-50"
              />
            </div>
            <p className="text-xs text-neutral-400">
              The password change link is sent only to this email.
            </p>
          </div>

          {resetSent ? (
            <div className="rounded-xl border border-brand-green/25 bg-brand-green-light/40 px-4 py-3 space-y-2">
              <p className="text-sm font-semibold text-brand-green-dark flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Check your inbox
              </p>
              <p className="text-sm text-neutral-700">
                We sent a password change link to <strong>{email}</strong>. Click it, set your new
                password, then you&apos;ll return to the dashboard.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={sendingReset}
                onClick={handleSendPasswordEmail}
              >
                {sendingReset ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Resend email"
                )}
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              onClick={handleSendPasswordEmail}
              disabled={sendingReset || !email}
              className="gap-2"
            >
              {sendingReset ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <KeyRound className="h-4 w-4" />
              )}
              {sendingReset ? "Sending…" : "Email me a password change link"}
            </Button>
          )}

          <p className="text-xs text-neutral-500">
            Already have a reset link?{" "}
            <Link href="/reset-password" className="text-brand-green font-medium hover:underline">
              Open set new password
            </Link>
          </p>
        </CardContent>
      </Card>

      <Card className="border-red-200 bg-red-50/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 text-red-800">
            <AlertTriangle className="h-5 w-5" />
            Deactivate account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-neutral-700">
            Request to step away from your Fiverr accounts. Nothing is deactivated automatically —
            a super admin reviews your request. If approved, your accounts move to{" "}
            <strong>Reserved</strong> (not deleted, not blocked). Your login stays active.
          </p>

          {pendingDeactivation ? (
            <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 space-y-1">
              <p className="text-sm font-semibold text-amber-900">Request pending review</p>
              <p className="text-sm text-amber-800">
                Submitted {formatDate(pendingDeactivation.requested_at)}. An admin will review it
                before any accounts are moved to Reserved.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="deact_reason">Reason (optional)</Label>
                <Input
                  id="deact_reason"
                  value={deactReason}
                  onChange={(e) => setDeactReason(e.target.value)}
                  placeholder="e.g. Taking a break this month"
                />
              </div>
              {!confirmDeact ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-red-300 text-red-700 hover:bg-red-50"
                  onClick={() => setConfirmDeact(true)}
                >
                  Request account deactivation
                </Button>
              ) : (
                <div className="rounded-xl border border-red-200 bg-white p-4 space-y-3">
                  <p className="text-sm text-neutral-800 font-medium">
                    Confirm: send a review request to admin? Your accounts will stay active until
                    they approve (then Reserved only).
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      disabled={submittingDeact}
                      onClick={handleRequestDeactivation}
                      className="bg-red-700 hover:bg-red-800 gap-2"
                    >
                      {submittingDeact ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : null}
                      {submittingDeact ? "Sending…" : "Yes, send request"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submittingDeact}
                      onClick={() => setConfirmDeact(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
