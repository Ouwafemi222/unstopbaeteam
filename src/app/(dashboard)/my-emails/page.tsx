import Link from "next/link";
import { Mail, Pencil, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { EmailRecord } from "@/types/database";

export default async function MyEmailsPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (!scope.teamMember) {
    return (
      <div className="max-w-lg mx-auto py-16 text-center">
        <h1 className="text-xl font-bold text-neutral-900">No team profile linked</h1>
        <p className="text-neutral-500 mt-2 text-sm">
          Your login needs a team member profile before you can record emails.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("email_records")
    .select("*")
    .eq("team_member_id", scope.teamMember.id)
    .order("received_date", { ascending: false });

  const records = (data ?? []) as EmailRecord[];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">My Emails</h1>
          <p className="text-neutral-500 mt-1">
            Record each email you receive — who sent it, the subject, and the date.
          </p>
        </div>
        <Link href="/my-emails/new">
          <Button>
            <Plus className="h-4 w-4" />
            Record email
          </Button>
        </Link>
      </div>

      {records.length === 0 ? (
        <Card className="border-dashed border-2 border-[#7b1e3a]/25 bg-[#f6e8ec]/40">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7b1e3a]/10 text-[#7b1e3a] mb-4">
              <Mail className="h-7 w-7" />
            </div>
            <h2 className="text-lg font-semibold text-neutral-900">No emails recorded yet</h2>
            <p className="text-sm text-neutral-500 mt-2 max-w-md">
              When an email comes in, log the sender, subject, and date here.
            </p>
            <Link href="/my-emails/new" className="mt-6">
              <Button>
                <Plus className="h-4 w-4" />
                Record your first email
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
                <th className="p-3 font-medium">From</th>
                <th className="p-3 font-medium">Subject</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3 whitespace-nowrap">{formatDate(record.received_date)}</td>
                  <td className="p-3">
                    <p className="font-medium text-neutral-900">{record.sender_name || "—"}</p>
                    <p className="text-xs text-neutral-500">{record.sender_email || ""}</p>
                  </td>
                  <td className="p-3 font-medium text-neutral-900">{record.subject}</td>
                  <td className="p-3">
                    <Link href={`/my-emails/${record.id}/edit`}>
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
