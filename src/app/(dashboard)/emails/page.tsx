import Link from "next/link";
import { Mail, Pencil, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { getUserScope } from "@/lib/auth/scope";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import type { EmailRecord } from "@/types/database";

export default async function AllEmailsPage() {
  const scope = await getUserScope();
  if (!scope) redirect("/login");
  if (!scope.roleSlugs.includes("super_admin")) redirect("/my-emails");

  const supabase = await createClient();
  const { data } = await supabase
    .from("email_records")
    .select("*, team_member:team_members(full_name)")
    .order("received_date", { ascending: false })
    .limit(200);

  const records = (data ?? []) as EmailRecord[];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">All Emails</h1>
          <p className="text-neutral-500 mt-1">Every email the team has recorded.</p>
        </div>
        <Link href="/emails/new">
          <Button>
            <Plus className="h-4 w-4" />
            Record email
          </Button>
        </Link>
      </div>

      {records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Mail className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">No emails recorded yet</p>
            <Link href="/emails/new">
              <Button>Record the first email</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="responsive-table bg-white rounded-xl border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500 bg-neutral-50">
                <th className="p-3 font-medium">Date</th>
                <th className="p-3 font-medium">Member</th>
                <th className="p-3 font-medium">From</th>
                <th className="p-3 font-medium">Subject</th>
                <th className="p-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id} className="border-b hover:bg-neutral-50">
                  <td className="p-3 whitespace-nowrap">{formatDate(record.received_date)}</td>
                  <td className="p-3 font-medium">{record.team_member?.full_name ?? "—"}</td>
                  <td className="p-3">
                    <p>{record.sender_name || "—"}</p>
                    <p className="text-xs text-neutral-500">{record.sender_email || ""}</p>
                  </td>
                  <td className="p-3">{record.subject}</td>
                  <td className="p-3">
                    <Link href={`/emails/${record.id}/edit`}>
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
