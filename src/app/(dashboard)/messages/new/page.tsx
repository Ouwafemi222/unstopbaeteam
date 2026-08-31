import { MessageForm } from "@/components/messages/message-form";

export default function NewMessagePage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Record Message</h1>
      <MessageForm mode="create" />
    </div>
  );
}
