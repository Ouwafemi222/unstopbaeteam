"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Camera, Loader2, User2 } from "lucide-react";
import Image from "next/image";
import type { Profile } from "@/types/database";

const BUCKET = "attachments";

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
        setProfile(data);
        if (data?.avatar_url) {
          // Try to get a signed URL if it's a storage path, otherwise use as-is
          if (data.avatar_url.startsWith("http")) {
            setAvatarUrl(data.avatar_url);
          } else {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(data.avatar_url, 3600);
            setAvatarUrl(signed?.signedUrl ?? null);
          }
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
      setProfile((p) => p ? { ...p, avatar_url: storagePath } : p);
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
    const { error } = await supabase.from("profiles").update({
      full_name: form.get("full_name") as string,
      preferred_name: (form.get("preferred_name") as string) || null,
      phone: (form.get("phone") as string) || null,
    }).eq("id", profile!.id);

    if (error) toast.error(error.message);
    else toast.success("Profile updated");
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() ?? "?";

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">My Profile</h1>
        <p className="text-neutral-500 mt-1">Update your personal info and profile picture.</p>
      </div>

      {/* Avatar card */}
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
              <p className="text-sm text-neutral-500 mt-0.5">
                {profile?.preferred_name ? `Goes by "${profile.preferred_name}"` : "No preferred name set"}
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

      {/* Info form */}
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
              <Input id="preferred_name" name="preferred_name" defaultValue={profile?.preferred_name ?? ""} placeholder="What people call you" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" name="phone" defaultValue={profile?.phone ?? ""} placeholder="+234..." />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : "Save Changes"}
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
