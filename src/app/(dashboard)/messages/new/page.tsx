import { MessageSquare } from "lucide-react";
import { MessageForm } from "@/components/messages/message-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default function NewMessagePage() {
  return (
    <RecordPageShell
      backHref="/messages"
      backLabel="Back to Messages"
      title="Record Message"
      subtitle="Record who got the message, and attach a screenshot as the evidence."
      icon={MessageSquare}
      tone="message"
    >
      <MessageForm mode="create" />
    </RecordPageShell>
  );
}
