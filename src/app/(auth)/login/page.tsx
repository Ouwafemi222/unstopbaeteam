"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Laptop, Smartphone, Loader2, CheckCircle2, Mail, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TeamPhotoShowcase } from "@/components/auth/team-photo-showcase";
import { formatAuthError, isEmailRateLimitError } from "@/lib/auth/email-errors";

const RESEND_COOLDOWN_SEC = 60;

function isUnconfirmedEmailError(message: string, code?: string): boolean {
  const msg = message.toLowerCase();
  const c = (code ?? "").toLowerCase();
  return (
    msg.includes("email not confirmed") ||
    c.includes("email_not_confirmed") ||
    msg.includes("confirm your email")
  );
}

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showUnconfirmedAlert, setShowUnconfirmedAlert] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  const checkEmail = searchParams.get("check_email") === "1";
  const queryEmail = searchParams.get("email") ?? "";
  const emailConfirmed = searchParams.get("confirmed") === "1";
  const confirmationFailed = searchParams.get("error") === "confirmation_failed";

  useEffect(() => {
    if (queryEmail) setEmail(queryEmail);
  }, [queryEmail]);

  useEffect(() => {
    if (emailConfirmed) {
      toast.success("Email confirmed! You can now sign in.");
    }
    if (confirmationFailed) {
      toast.error("Email confirmation failed. Try registering again or contact admin.");
    }
    if (checkEmail) {
      toast.info("Check your inbox — we sent you a confirmation email.", { duration: 8000 });
    }
  }, [emailConfirmed, confirmationFailed, checkEmail]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  async function handleResendConfirmation() {
    const targetEmail = email.trim();
    if (!targetEmail) {
      toast.error("Enter your email address first");
      return;
    }
    if (resendCooldown > 0) {
      toast.error(`Please wait ${resendCooldown}s before resending`);
      return;
    }

    setResending(true);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin;
    const redirectTo = `${appUrl}/auth/callback?next=${encodeURIComponent("/welcome")}`;

    const { error } = await supabase.auth.resend({
      type: "signup",
      email: targetEmail,
      options: { emailRedirectTo: redirectTo },
    });

    if (error) {
      toast.error(formatAuthError(error.message, error.code), { duration: 10000 });
      if (isEmailRateLimitError(error.message, error.code)) {
        setShowUnconfirmedAlert(true);
      }
    } else {
      toast.success(`Confirmation email sent to ${targetEmail}. Check your inbox and spam folder.`);
      setShowUnconfirmedAlert(true);
      setResendCooldown(RESEND_COOLDOWN_SEC);
    }
    setResending(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setShowUnconfirmedAlert(false);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      if (isUnconfirmedEmailError(error.message, error.code)) {
        setShowUnconfirmedAlert(true);
        toast.error("Please confirm your email before signing in.", { duration: 8000 });
      } else if (error.message.toLowerCase().includes("invalid login credentials")) {
        toast.error(
          "Incorrect email or password. If you just registered, confirm your email first.",
          { duration: 8000 }
        );
      } else {
        toast.error(error.message);
      }
      setLoading(false);
      return;
    }

    if (!data.session) {
      toast.error("Login failed — no session returned. Try again.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    router.refresh();
    window.location.href = "/dashboard";
  }

  const showEmailBanner = checkEmail || showUnconfirmedAlert;

  return (
    <div className="flex min-h-screen">
      <TeamPhotoShowcase />

      <div className="flex flex-1 items-center justify-center p-8 bg-neutral-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green to-brand-orange">
              <Laptop className="h-6 w-6 text-white" />
              <Smartphone className="h-4 w-4 -ml-1 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-neutral-900">UNSTOPPABLE</p>
              <p className="text-sm font-semibold text-brand-green">TEAM</p>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-neutral-900 mb-2">Welcome back</h2>
          <p className="text-neutral-500 mb-8">Sign in to your account to continue</p>

          {emailConfirmed && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Email confirmed successfully. Sign in below.
            </div>
          )}

          {showEmailBanner && (
            <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 shrink-0 text-amber-700 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-amber-900">Confirm your email first</p>
                  <p className="text-sm text-amber-800 mt-1">
                    {checkEmail ? (
                      <>
                        We sent a confirmation link to{" "}
                        <strong>{queryEmail || email || "your email"}</strong>.
                        Click the link in that email, then come back here to sign in.
                      </>
                    ) : (
                      <>
                        Your account may not be confirmed yet. Check your inbox for the confirmation
                        link{email ? <> sent to <strong>{email}</strong></> : ""}.
                      </>
                    )}
                  </p>
                  <p className="text-xs text-amber-700/80 mt-2">
                    Didn&apos;t get it? Check spam, or resend below.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-3 border-amber-300 bg-white hover:bg-amber-100"
                    disabled={resending || resendCooldown > 0 || !email.trim()}
                    onClick={handleResendConfirmation}
                  >
                    {resending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      "Resend confirmation email"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {confirmationFailed && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              <AlertCircle className="h-5 w-5 shrink-0" />
              Email confirmation link expired or is invalid. Register again or ask admin for help.
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-sm text-brand-green hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </form>

          <p className="mt-8 text-center text-sm text-neutral-400">
            New team member?{" "}
            <Link href="/join" className="text-brand-green hover:underline">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
