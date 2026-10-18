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

export default async function AllEmailEditPage({ params }: Props) {
  const { id } = await params;
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (!scope.roleSlugs.includes("super_admin")) redirect("/my-emails");

  const supabase = await createClient();
  const { data } = await supabase.from("email_records").select("*").eq("id", id).maybeSingle();
  const record = data as EmailRecord | null;
  if (!record) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/emails"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to All Emails
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Edit email</h1>
        <p className="text-neutral-500 mt-1">Update this team email record.</p>
      </div>
      <EmailRecordForm mode="edit" record={record} returnTo="/emails" />
    </div>
  );
}
