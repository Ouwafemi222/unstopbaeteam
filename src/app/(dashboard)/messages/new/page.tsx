import { MessageSquare } from "lucide-react";
import { MessageForm } from "@/components/messages/message-form";
import { RecordPageShell } from "@/components/shared/record-page-shell";

export default function NewMessagePage() {
  return (
    <RecordPageShell
      backHref="/messages"
      backLabel="Back to Messages"
      title="Record Message"
      subtitle="Capture who got the message and when — it will stream live on every dashboard."
      icon={MessageSquare}
      tone="message"
    >
      <MessageForm mode="create" />
    </RecordPageShell>
  );
}
