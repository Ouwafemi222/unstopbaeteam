"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setSessionOk(Boolean(session));
      setReady(true);
    }
    checkSession();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
    toast.success("Password updated — welcome back");
    setLoading(false);
    setTimeout(() => router.push("/dashboard"), 1800);
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-brand-green" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-br from-brand-green-light/40 via-white to-brand-orange-light/30">
        <div className="w-full max-w-md rounded-2xl border border-brand-green/20 bg-white p-8 shadow-lg text-center space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-green text-white">
            <CheckCircle2 className="h-7 w-7" />
          </div>
          <h2 className="text-2xl font-bold text-neutral-900">Password updated</h2>
          <p className="text-neutral-600 text-sm">
            Your new password is saved. Taking you back into UNSTOPPABLE TEAM…
          </p>
          <Link href="/dashboard">
            <Button className="w-full gap-2">
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login" className="block text-sm text-neutral-500 hover:text-brand-green">
            Or open login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-8 bg-gradient-to-br from-brand-green-light/30 via-white to-brand-orange-light/20">
      <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-8 shadow-lg">
        <h2 className="text-2xl font-bold text-neutral-900 mb-2">Set new password</h2>
        <p className="text-neutral-500 mb-6 text-sm">
          Choose a new password for your UNSTOPPABLE TEAM account. After you save, you&apos;ll
          return to the website dashboard.
        </p>

        {!sessionOk && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Open the link from your email first so we can verify it&apos;s you. If the link expired,
            request a new one from{" "}
            <Link href="/profile" className="font-semibold underline">
              Profile
            </Link>{" "}
            or{" "}
            <Link href="/forgot-password" className="font-semibold underline">
              Forgot password
            </Link>
            .
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <PasswordInput
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={!sessionOk}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm Password</Label>
            <PasswordInput
              id="confirm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              disabled={!sessionOk}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading || !sessionOk}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password & continue"}
          </Button>
        </form>
      </div>
    </div>
  );
}
