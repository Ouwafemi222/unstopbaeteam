import Link from "next/link";
import { Plus, Pencil, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, getMessageServiceLabel } from "@/lib/utils";
import { MESSAGE_STATUS_LABELS } from "@/lib/utils/dates";
import type { Message } from "@/types/database";

interface MemberMessagesPanelProps {
  memberId: string;
  memberName: string;
  basePath: string;
  showTitle?: boolean;
}

export async function MemberMessagesPanel({
  memberId,
  memberName,
  basePath,
  showTitle = true,
}: MemberMessagesPanelProps) {
  const supabase = await createClient();
  const { data: messages } = await supabase
    .from("messages")
    .select("*, service:services(name), fiverr_account:fiverr_accounts(username)")
    .eq("team_member_id", memberId)
    .order("received_date", { ascending: false });

  const list = (messages ?? []) as Message[];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        {showTitle && (
          <div>
            <h2 className="text-lg font-semibold text-neutral-900 flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-brand-orange" />
              Messages Received
            </h2>
            <p className="text-sm text-neutral-500 mt-0.5">
              Fiverr messages recorded for {memberName}
            </p>
          </div>
        )}
        <Link href={`${basePath}/new`} className={showTitle ? "" : "ml-auto"}>
          <Button size="lg" variant="secondary" className="w-full sm:w-auto shadow-sm">
            <Plus className="h-4 w-4" />
            Record Message
          </Button>
        </Link>
      </div>

      {list.length === 0 ? (
        <Card className="border-dashed border-2 border-brand-orange/30 bg-brand-orange-light/10">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-orange/10 text-brand-orange mb-4">
              <MessageSquare className="h-7 w-7" />
            </div>
            <h3 className="text-lg font-semibold text-neutral-900">No messages recorded yet</h3>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              Got a new Fiverr message? Record the date, gig name, service category, and which account received it.
            </p>
            <Link href={`${basePath}/new`} className="mt-6">
              <Button size="lg" variant="secondary">
                <Plus className="h-4 w-4" />
                Record Your First Message
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-table bg-white rounded-xl border shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Account</th>
                <th className="p-3 font-medium">Service / Gig</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((msg) => (
                <tr key={msg.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3">{formatDate(msg.received_date)}</td>
                  <td className="p-3">
                    {(msg.fiverr_account as { username: string } | null)?.username ?? "—"}
                  </td>
                  <td className="p-3 font-medium text-neutral-900">{getMessageServiceLabel(msg)}</td>
                  <td className="p-3">
                    <Badge variant="neutral">{MESSAGE_STATUS_LABELS[msg.status]}</Badge>
                  </td>
                  <td className="p-3">
                    <Link href={`${basePath}/${msg.id}/edit`}>
                      <Button variant="ghost" size="sm">
                        <Pencil className="h-4 w-4" /> Edit
                      </Button>
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
