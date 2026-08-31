import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Briefcase } from "lucide-react";
import { AccountsTable } from "@/components/accounts/accounts-table";

export default async function AccountsPage() {
  const supabase = await createClient();

  const [{ data: accounts }, { data: members }, { data: countries }, { data: services }] = await Promise.all([
    supabase.from("fiverr_accounts")
      .select("*, team_member:team_members(full_name), country:countries(name, flag_emoji)")
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
    supabase.from("team_members").select("id, full_name").eq("status", "active").order("full_name"),
    supabase.from("countries").select("*").eq("is_active", true).order("name"),
    supabase.from("services").select("*").eq("is_active", true).order("name"),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Fiverr Accounts</h1>
          <p className="text-neutral-500 mt-1">{accounts?.length ?? 0} accounts tracked</p>
        </div>
        <div className="flex gap-2">
          <Link href="/import"><Button variant="outline">Import</Button></Link>
          <Link href="/accounts/new"><Button><Plus className="h-4 w-4" /> Add Account</Button></Link>
        </div>
      </div>

      {accounts?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-12 w-12 text-neutral-300 mb-4" />
            <p className="text-neutral-500 mb-4">No Fiverr accounts yet</p>
            <Link href="/accounts/new"><Button>Add First Account</Button></Link>
          </CardContent>
        </Card>
      ) : (
        <AccountsTable accounts={accounts ?? []} members={members ?? []} countries={countries ?? []} />
      )}
    </div>
  );
}
