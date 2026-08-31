"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Laptop, Smartphone, Loader2, CheckCircle2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TeamPhotoShowcase } from "@/components/auth/team-photo-showcase";

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    if (searchParams.get("confirmed") === "1") {
      toast.success("Email confirmed! You can now sign in.");
    }
    if (searchParams.get("error") === "confirmation_failed") {
      toast.error("Email confirmation failed. Try registering again or contact admin.");
    }
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      const msg = error.message.toLowerCase().includes("email not confirmed")
        ? "Please confirm your email first. Check your inbox for the confirmation link."
        : error.message;
      toast.error(msg);
      setLoading(false);
      return;
    }

    if (!data.session) {
      toast.error("Login failed — no session returned. Try again.");
      setLoading(false);
      return;
    }

    toast.success("Welcome back!");
    // Refresh server cache, then hard-navigate so auth cookies are picked up
    router.refresh();
    window.location.href = "/dashboard";
  }

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

          {searchParams.get("confirmed") === "1" && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
              <CheckCircle2 className="h-5 w-5 shrink-0" />
              Email confirmed successfully. Sign in below.
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
