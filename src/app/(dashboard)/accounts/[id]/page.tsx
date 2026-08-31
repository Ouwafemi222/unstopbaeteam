import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AccountStatusBadge } from "@/components/shared/status-badges";
import { formatDate, formatDateTime } from "@/lib/utils";
import { Edit, User, Archive } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AccountDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: account } = await supabase
    .from("fiverr_accounts")
    .select("*, team_member:team_members(id, full_name), country:countries(name, flag_emoji, code)")
    .eq("id", id)
    .single();

  if (!account) notFound();

  const [{ data: notes }, { data: messages }, { data: activity }] = await Promise.all([
    supabase.from("account_notes").select("*, profile:profiles(full_name)").eq("account_id", id).order("created_at", { ascending: false }),
    supabase.from("messages").select("*, service:services(name)").eq("fiverr_account_id", id).order("received_date", { ascending: false }).limit(10),
    supabase.from("activity_logs").select("*, profile:profiles(full_name)").eq("entity_id", id).order("created_at", { ascending: false }).limit(15),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-neutral-900">{account.username}</h1>
            <AccountStatusBadge status={account.status} />
          </div>
          {account.display_name && <p className="text-neutral-500">{account.display_name}</p>}
          <Link href={`/team-members/${(account.team_member as { id: string }).id}`} className="text-sm text-brand-green hover:underline mt-1 inline-block">
            {(account.team_member as { full_name: string }).full_name}
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href={`/team-members/${(account.team_member as { id: string }).id}`}>
            <Button variant="outline" size="sm"><User className="h-4 w-4" /> View Member</Button>
          </Link>
          <Link href={`/accounts/${id}/edit`}>
            <Button variant="outline" size="sm"><Edit className="h-4 w-4" /> Edit</Button>
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Email</span><span>{account.email ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Phone</span><span>{account.phone ?? "—"}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Country</span>
              <span>{(account.country as { flag_emoji: string; name: string })?.flag_emoji} {(account.country as { name: string })?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">Opening Date</span><span>{formatDate(account.opening_date)}</span></div>
            <div className="flex justify-between"><span className="text-neutral-500">Rate</span>
              <span>{account.rate_amount ? `${account.rate_currency} ${account.rate_amount}` : "—"}</span>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">Info Supplied By</span><span>{account.info_supplied_by ?? "—"}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Verification</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-neutral-500">Phone Verified</span>
              <Badge variant={account.phone_verified ? "success" : "neutral"}>{account.phone_verified ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">Email Verified</span>
              <Badge variant={account.email_verified ? "success" : "neutral"}>{account.email_verified ? "Yes" : "No"}</Badge>
            </div>
            <div className="flex justify-between"><span className="text-neutral-500">Verified At</span><span>{formatDateTime(account.verification_completed_at)}</span></div>
            {account.verification_notes && (
              <div><span className="text-neutral-500">Notes</span><p className="mt-1">{account.verification_notes}</p></div>
            )}
          </CardContent>
        </Card>
      </div>

      {account.notes && (
        <Card><CardContent className="p-4"><p className="text-sm text-neutral-600">{account.notes}</p></CardContent></Card>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Recent Messages ({messages?.length ?? 0})</CardTitle></CardHeader>
        <CardContent>
          {messages?.length === 0 ? <p className="text-sm text-neutral-500">No messages for this account.</p> : (
            <div className="space-y-2">
              {messages?.map((m) => (
                <div key={m.id} className="flex justify-between text-sm p-2 rounded hover:bg-neutral-50">
                  <span>{(m.service as { name: string })?.name ?? "—"}</span>
                  <span className="text-neutral-400">{formatDate(m.received_date)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
        <CardContent>
          {activity?.length === 0 ? <p className="text-sm text-neutral-500">No activity yet.</p> : (
            <div className="space-y-2">
              {activity?.map((log) => (
                <div key={log.id} className="flex items-center gap-3 text-sm p-2">
                  <Badge variant="neutral">{log.action}</Badge>
                  <span>{log.entity_label}</span>
                  <span className="text-neutral-400 ml-auto">{formatDateTime(log.created_at)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-neutral-400">
        Created {formatDateTime(account.created_at)} · Last updated {formatDateTime(account.updated_at)}
      </div>
    </div>
  );
}
