import { redirect } from "next/navigation";
import { MessageSquare } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { MessageForm } from "@/components/messages/message-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default async function MyMessagesNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

  return (
    <RecordPageShell
      backHref="/my-messages"
      backLabel="Back to My Messages"
      title="Record Message Received"
      subtitle="Log the Fiverr message and attach a screenshot. That picture is the evidence it was received."
      icon={MessageSquare}
      tone="message"
    >
      <MessageForm
        mode="create"
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo="/my-messages"
      />
    </RecordPageShell>
  );
}
