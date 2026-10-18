import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { EmailRecordForm } from "@/components/emails/email-record-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default async function AllEmailsNewPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (!scope.roleSlugs.includes("super_admin")) redirect("/my-emails");

  return (
    <RecordPageShell
      backHref="/emails"
      backLabel="Back to All Emails"
      title="Record an email"
      subtitle="Choose the team member, then log who sent the email and what it was about."
      icon={Mail}
      tone="account"
    >
      <EmailRecordForm mode="create" returnTo="/emails" />
    </RecordPageShell>
  );
}
