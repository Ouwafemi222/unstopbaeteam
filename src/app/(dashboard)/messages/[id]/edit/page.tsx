import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessageForm } from "@/components/messages/message-form";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditMessagePage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: message } = await supabase.from("messages").select("*").eq("id", id).single();
  if (!message) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-neutral-900">Edit Message</h1>
      <p className="text-neutral-500 text-sm">Correct message details if needed.</p>
      <MessageForm mode="edit" message={message} />
    </div>
  );
}
