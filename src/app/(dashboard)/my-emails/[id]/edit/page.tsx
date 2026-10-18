import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { EmailRecordForm } from "@/components/emails/email-record-form";
import type { EmailRecord } from "@/types/database";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MyEmailEditPage({ params }: Props) {
  const { id } = await params;
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const supabase = await createClient();
  const { data } = await supabase.from("email_records").select("*").eq("id", id).maybeSingle();
  const record = data as EmailRecord | null;

  if (!record) notFound();
  if (record.team_member_id !== scope.teamMember.id) redirect("/my-emails");

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/my-emails"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Emails
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Edit email</h1>
        <p className="text-neutral-500 mt-1">Update this email record.</p>
      </div>
      <EmailRecordForm
        mode="edit"
        record={record}
        lockedTeamMemberId={scope.teamMember.id}
        returnTo="/my-emails"
      />
    </div>
  );
}
