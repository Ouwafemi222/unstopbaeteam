import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { AccountForm } from "@/components/accounts/account-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MemberNewAccountPage({ params }: Props) {
  const { id } = await params;
  const scope = await getUserScope();
  if (!scope) redirect("/login");

  if (scope.isScopedMember && scope.teamMember?.id !== id) {
    redirect("/dashboard");
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("team_members")
    .select("id, full_name")
    .eq("id", id)
    .single();

  if (!member) notFound();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href={`/team-members/${id}?tab=accounts`}
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to your accounts
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Add Fiverr Account</h1>
        <p className="text-neutral-500 mt-1">
          Register a new Fiverr account under your profile — fill in all details below.
        </p>
      </div>
      <AccountForm
        mode="create"
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo={`/team-members/${id}?tab=accounts`}
      />
    </div>
  );
}
