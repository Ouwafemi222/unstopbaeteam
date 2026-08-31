"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Laptop, Smartphone, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { TeamPhotoShowcase } from "@/components/auth/team-photo-showcase";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(error.message);
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
            Access is by invitation only. Contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
