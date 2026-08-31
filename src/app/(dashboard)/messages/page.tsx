import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, MessageSquare, Pencil } from "lucide-react";
import { formatDate, getMessageServiceLabel } from "@/lib/utils";
import { MESSAGE_STATUS_LABELS } from "@/lib/utils/dates";

export default async function MessagesPage() {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("messages")
    .select("*, team_member:team_members(full_name), service:services(name), fiverr_account:fiverr_accounts(username)")
    .order("received_date", { ascending: false })
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Messages</h1>
          <p className="text-neutral-500 mt-1">Track Fiverr messages received by team members</p>
        </div>
        <Link href="/messages/new">
          <Button><Plus className="h-4 w-4" /> Record Message</Button>
        </Link>
      </div>

      {messages?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <MessageSquare className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">No messages recorded yet</p>
            <Link href="/messages/new"><Button>Record First Message</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-table bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Member</th>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Service</th>
                <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {messages?.map((msg) => (
                <tr key={msg.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3">{formatDate(msg.received_date)}</td>
                  <td className="p-3 font-medium">{(msg.team_member as { full_name: string })?.full_name}</td>
                  <td className="p-3">{(msg.fiverr_account as { username: string })?.username ?? "—"}</td>
                  <td className="p-3">{getMessageServiceLabel(msg)}</td>
                  <td className="p-3"><Badge variant="neutral">{MESSAGE_STATUS_LABELS[msg.status]}</Badge></td>
                  <td className="p-3">
                    <Link href={`/messages/${msg.id}/edit`}>
                      <Button variant="ghost" size="sm"><Pencil className="h-4 w-4" /> Edit</Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
