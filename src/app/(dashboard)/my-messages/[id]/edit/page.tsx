import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getUserScope } from "@/lib/auth/scope";
import { MessageForm } from "@/components/messages/message-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function MyMessagesEditPage({ params }: Props) {
  const { id } = await params;
  const scope = await getUserScope();
  if (!scope?.teamMember) redirect("/login");

  const supabase = await createClient();
  const { data: message } = await supabase.from("messages").select("*").eq("id", id).single();

  if (!message) notFound();
  if (message.team_member_id !== scope.teamMember.id) redirect("/my-messages");

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
        <h1 className="text-2xl font-bold text-neutral-900">Edit Message</h1>
        <p className="text-neutral-500 mt-1">Update details for this recorded message.</p>
      </div>
      <MessageForm
        mode="edit"
        message={message}
        lockedTeamMemberId={scope.teamMember.id}
        lockedTeamMemberName={scope.teamMember.full_name}
        returnTo="/my-messages"
      />
    </div>
  );
}
