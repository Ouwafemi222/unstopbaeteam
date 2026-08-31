import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getUserScope } from "@/lib/auth/scope";
import { MessageForm } from "@/components/messages/message-form";

export default async function MyMessagesNewPage() {
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const member = scope.teamMember;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link
        href="/my-messages"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-brand-green"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Messages
      </Link>
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">Record Message Received</h1>
        <p className="text-neutral-500 mt-1">
          Log a Fiverr message you received on one of your accounts.
        </p>
      </div>
      <MessageForm
        mode="create"
        lockedTeamMemberId={member.id}
        lockedTeamMemberName={member.full_name}
        returnTo="/my-messages"
      />
    </div>
  );
}
