import { Mail } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { EmailRecordForm } from "@/components/emails/email-record-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default async function MyEmailsNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  return (
    <RecordPageShell
      backHref="/my-emails"
      backLabel="Back to My Emails"
      title="Record an email"
      subtitle="Log who sent it, the subject, and the date. Your super admin can see it with the rest of the team."
      icon={Mail}
      tone="account"
    >
      <EmailRecordForm
        mode="create"
        lockedTeamMemberId={scope.teamMember.id}
        returnTo="/my-emails"
      />
    </RecordPageShell>
  );
}
