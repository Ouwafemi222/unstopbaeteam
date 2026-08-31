import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getUserScope } from "@/lib/auth/scope";

export default async function WelcomePage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (scope.isAdmin) redirect("/dashboard");

  const name = scope.teamMember?.full_name ?? scope.user.profile?.full_name ?? "Team Member";

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <Card className="max-w-lg w-full text-center shadow-lg">
        <CardContent className="p-10 space-y-5">
          <CheckCircle2 className="h-16 w-16 text-brand-green mx-auto" />
          <h1 className="text-2xl font-bold text-neutral-900">You&apos;re all set, {name}!</h1>
          <p className="text-neutral-500">
            Your email is confirmed. The Fiverr accounts and messages from the team sheet are now synced to your personal dashboard.
          </p>
          <Button asChild size="lg" className="w-full">
            <Link href="/dashboard">View My Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
